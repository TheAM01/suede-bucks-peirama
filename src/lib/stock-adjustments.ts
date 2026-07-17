import "server-only";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import { shopifyQuery, toGid } from "./shopify-client";
import type { Row } from "@/config/resource-types";

/**
 * Stock adjustments — Unleashed-style audited inventory corrections.
 *
 * The documents live in MongoDB (Shopify has no adjustment-document concept,
 * only per-item quantity deltas). Lifecycle: created **parked** (no stock
 * effect) → **completed**, which posts the delta to Shopify via
 * `inventoryAdjustQuantities` and locks the document forever.
 *
 * Consistency rules, all enforced server-side:
 * - `number`, `createdAt`, `updatedAt`, `completedAt` are server-generated;
 *   client-supplied values are ignored.
 * - Numbers come from an atomic counter (`app_counters`) — never duplicated.
 * - Item and facility names/SKUs are resolved from Shopify at save time, so
 *   the stored snapshot can't disagree with what the ids point at.
 * - Completing claims the document atomically (`status: parked` filter), so
 *   concurrent submits can't post the same adjustment to Shopify twice.
 * - Completed documents are immutable: updates and deletes are rejected.
 */

const COLLECTION = "app_stock_adjustments";
const COUNTERS = "app_counters";
const COUNTER_ID = "stock-adjustments";

export const ADJUSTMENT_REASONS = [
  "stocktake",
  "damaged",
  "expired",
  "promotion",
  "shrinkage",
  "received",
  "other",
] as const;

/** Our reason list → Shopify's fixed `InventoryAdjustQuantitiesInput.reason` values. */
const SHOPIFY_REASON: Record<string, string> = {
  stocktake: "correction",
  damaged: "damaged",
  expired: "quality_control",
  promotion: "promotion",
  shrinkage: "shrinkage",
  received: "received",
  other: "other",
};

interface AdjustmentValues {
  itemId: string;
  facilityId: string;
  quantity: number;
  reason: string;
  status: "parked" | "completed";
  notes: string;
}

type Doc = { _id: ObjectId } & Record<string, unknown>;

const str = (v: unknown): string => (v == null ? "" : String(v));
const today = (): string => new Date().toISOString().slice(0, 10);

function toRow(doc: Doc): Row {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() } as Row;
}

/** Normalize + validate client-sent values. Returns an error message or the clean values. */
function validate(
  input: Record<string, unknown>,
): { values: AdjustmentValues } | { error: string } {
  const itemId = str(input.itemId).trim();
  if (!itemId) return { error: "Pick the inventory item to adjust." };

  const facilityId = str(input.facilityId).trim();
  if (!facilityId) return { error: "Pick the facility (location) the adjustment applies to." };

  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity)) {
    return { error: "Quantity must be a whole number of units." };
  }
  if (quantity === 0) {
    return { error: "Quantity can't be zero — use a positive number to add stock or a negative one to remove it." };
  }

  const reason = str(input.reason);
  if (!(reason in SHOPIFY_REASON)) {
    return { error: "Pick a valid adjustment reason." };
  }

  const status = str(input.status);
  if (status !== "parked" && status !== "completed") {
    return { error: "Status must be parked or completed." };
  }

  return {
    values: { itemId, facilityId, quantity, reason, status, notes: str(input.notes) },
  };
}

/**
 * Resolve the item + facility snapshots from Shopify so stored names/SKUs
 * always match what the ids point at (never trusted from the client).
 */
async function resolveRefs(
  itemId: string,
  facilityId: string,
): Promise<{ item: string; sku: string; facility: string } | { error: string }> {
  const res = await shopifyQuery<{
    inventoryItem: {
      sku?: string;
      tracked?: boolean;
      variant?: { title?: string; product?: { title?: string } };
    } | null;
    location: { name?: string; isActive?: boolean } | null;
  }>(
    `query($itemId: ID!, $locationId: ID!) {
      inventoryItem(id: $itemId) {
        sku tracked
        variant { title product { title } }
      }
      location(id: $locationId) { name isActive }
    }`,
    {
      itemId: toGid("InventoryItem", itemId),
      locationId: toGid("Location", facilityId),
    },
  );
  if (!res.ok) return { error: res.error };

  const item = res.data.inventoryItem;
  if (!item) return { error: "That inventory item no longer exists in Shopify." };
  if (item.tracked === false) {
    return { error: "Shopify doesn't track inventory for this item — enable inventory tracking on the product first." };
  }
  const location = res.data.location;
  if (!location) return { error: "That location no longer exists in Shopify." };
  if (location.isActive === false) {
    return { error: "That location is deactivated in Shopify — pick an active one." };
  }

  // Same display naming as the inventory list, so labels match everywhere.
  const productTitle = str(item.variant?.product?.title);
  const variantTitle = str(item.variant?.title);
  const name =
    variantTitle && variantTitle !== "Default Title"
      ? `${productTitle} — ${variantTitle}`
      : productTitle;
  return { item: name || "Unknown item", sku: str(item.sku), facility: str(location.name) };
}

/** Post the delta to Shopify's inventory ledger, cross-referenced by document number. */
async function postToShopify(
  values: AdjustmentValues,
  number: string,
): Promise<string | undefined> {
  const res = await shopifyQuery<{
    inventoryAdjustQuantities: { userErrors?: { message: string }[] } | null;
  }>(
    `mutation($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) {
        inventoryAdjustmentGroup { createdAt }
        userErrors { field message }
      }
    }`,
    {
      input: {
        reason: SHOPIFY_REASON[values.reason],
        name: "available",
        referenceDocumentUri: `suedebucks://stock-adjustments/${number}`,
        changes: [
          {
            delta: values.quantity,
            inventoryItemId: toGid("InventoryItem", values.itemId),
            locationId: toGid("Location", values.facilityId),
          },
        ],
      },
    },
  );
  if (!res.ok) return res.error;
  const errs = res.data.inventoryAdjustQuantities?.userErrors ?? [];
  if (errs.length) return errs.map((e) => e.message).join("; ");
  return undefined;
}

/** Atomically allocate the next SA-XXXX document number. */
async function nextNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error(DB_UNAVAILABLE);
  const counter = await db
    .collection<{ _id: string; seq: number }>(COUNTERS)
    .findOneAndUpdate(
      { _id: COUNTER_ID },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  if (!counter) throw new Error(DB_UNAVAILABLE);
  return `SA-${String(counter.seq).padStart(4, "0")}`;
}

// --- public API ---------------------------------------------------------------

export async function listAdjustments(): Promise<{ rows: Row[]; error?: string }> {
  if (!isDbConfigured()) {
    return { rows: [], error: "No database configured — connect MongoDB to store stock adjustments." };
  }
  try {
    const db = await getDb();
    if (!db) return { rows: [], error: DB_UNAVAILABLE };
    const docs = await db
      .collection<Doc>(COLLECTION)
      .find()
      .sort({ _id: -1 })
      .limit(500)
      .toArray();
    return { rows: docs.map(toRow) };
  } catch {
    return { rows: [], error: DB_UNAVAILABLE };
  }
}

export async function createAdjustment(
  input: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  const v = validate(input);
  if ("error" in v) return { error: v.error };
  const { values } = v;

  const refs = await resolveRefs(values.itemId, values.facilityId);
  if ("error" in refs) return { error: refs.error };

  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };

    const number = await nextNumber();

    // Completing at creation: post first, save only on success — a failed
    // Shopify post must never leave a "completed" document behind.
    const completed = values.status === "completed";
    if (completed) {
      const postError = await postToShopify(values, number);
      if (postError) return { error: postError };
    }

    const now = today();
    const doc: Record<string, unknown> = {
      number,
      status: values.status,
      reason: values.reason,
      itemId: values.itemId,
      item: refs.item,
      sku: refs.sku,
      facilityId: values.facilityId,
      facility: refs.facility,
      quantity: values.quantity,
      notes: values.notes,
      createdAt: now,
      updatedAt: now,
      completedAt: completed ? now : "",
    };
    const res = await db.collection(COLLECTION).insertOne(doc);
    return { row: { ...doc, id: res.insertedId.toHexString() } as Row };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function updateAdjustment(
  id: string,
  input: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  const v = validate(input);
  if ("error" in v) return { error: v.error };
  const { values } = v;

  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const col = db.collection<Doc>(COLLECTION);
    const oid = new ObjectId(id);

    const existing = await col.findOne({ _id: oid });
    if (!existing) return { error: "That adjustment no longer exists." };
    if (existing.status === "completed") {
      return { error: "Completed adjustments are immutable — create a new adjustment to correct stock further." };
    }

    const refs = await resolveRefs(values.itemId, values.facilityId);
    if ("error" in refs) return { error: refs.error };

    const now = today();
    const fields: Record<string, unknown> = {
      status: values.status,
      reason: values.reason,
      itemId: values.itemId,
      item: refs.item,
      sku: refs.sku,
      facilityId: values.facilityId,
      facility: refs.facility,
      quantity: values.quantity,
      notes: values.notes,
      updatedAt: now,
    };

    if (values.status === "completed") {
      // Claim the document atomically before posting so two concurrent
      // completes can't both reach Shopify.
      const claim = await col.updateOne(
        { _id: oid, status: "parked" },
        { $set: { ...fields, completedAt: now } },
      );
      if (claim.modifiedCount === 0) {
        return { error: "This adjustment was already completed." };
      }
      const postError = await postToShopify(values, str(existing.number));
      if (postError) {
        // Shopify rejected it — release the claim so the document stays editable.
        await col.updateOne({ _id: oid }, { $set: { status: "parked", completedAt: "" } });
        return { error: postError };
      }
    } else {
      await col.updateOne({ _id: oid }, { $set: fields });
    }

    const updated = await col.findOne({ _id: oid });
    return updated ? { row: toRow(updated) } : { error: "That adjustment no longer exists." };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function deleteAdjustment(id: string): Promise<{ error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const col = db.collection<Doc>(COLLECTION);
    const oid = new ObjectId(id);
    const existing = await col.findOne({ _id: oid });
    if (!existing) return {};
    if (existing.status === "completed") {
      return { error: "Completed adjustments are part of the audit trail and can't be deleted." };
    }
    await col.deleteOne({ _id: oid });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}
