import "server-only";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import { shopifyQuery, toGid } from "./shopify-client";
import type { Row } from "@/config/resource-types";

/**
 * The stock movement ledger — one append-only line per quantity change, per
 * item and location. Shopify stays the source of truth for quantities (and
 * has no queryable history), so this is the app's own audit trail:
 *
 * - every document in this app that moves stock (stock adjustments, PO
 *   receipts, transfer send / receive, stocktake posts) posts its delta to
 *   Shopify through `adjustShopifyInventory()` and then records it here;
 * - online sales are recorded from the `orders/create` webhook (location
 *   unknown at that point, so they're filed under "Online orders").
 *
 * Each line carries a unique `key`, so a retried webhook or a re-run step
 * never double-counts. Changes made directly in Shopify admin don't appear.
 */

const COLLECTION = "app_stock_movements";

export const MOVEMENT_TYPES = [
  "adjustment",
  "receipt",
  "transfer_out",
  "transfer_in",
  "stocktake",
  "sale",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface MovementInput {
  /** idempotency key — a line with the same key is never recorded twice */
  key: string;
  type: MovementType;
  /** human document reference: SA-0001, PO-0003, TR-0002, SC-0001, #1004 */
  reference: string;
  /** dashboard path of the source document, for click-through */
  href?: string;
  inventoryItemId?: string;
  variantId?: string;
  item: string;
  sku: string;
  locationId?: string;
  location: string;
  delta: number;
  note?: string;
}

let indexReady = false;

async function collection() {
  if (!isDbConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  const col = db.collection<MovementInput & { at: string }>(COLLECTION);
  if (!indexReady) {
    await col.createIndex({ key: 1 }, { unique: true });
    indexReady = true;
  }
  return col;
}

/** Append movements (idempotent by `key`). Best-effort: the stock change already happened in Shopify, so a ledger failure is logged, not thrown. */
export async function recordMovements(entries: MovementInput[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    const col = await collection();
    if (!col) return;
    const at = new Date().toISOString();
    await col.bulkWrite(
      entries.map((e) => ({
        updateOne: {
          filter: { key: e.key },
          update: { $setOnInsert: { ...e, at } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  } catch (err) {
    console.warn("[inventory-ledger] couldn't record movements:", err);
  }
}

export async function listMovements(): Promise<{ rows: Row[]; error?: string }> {
  if (!isDbConfigured()) {
    return { rows: [], error: "No database configured — connect MongoDB to keep the stock movement ledger." };
  }
  try {
    const col = await collection();
    if (!col) return { rows: [], error: DB_UNAVAILABLE };
    const docs = await col.find().sort({ at: -1 }).limit(2000).toArray();
    return {
      rows: docs.map(({ _id, ...d }) => ({
        ...d,
        id: String(_id),
        direction: d.delta >= 0 ? "in" : "out",
      })) as Row[],
    };
  } catch {
    return { rows: [], error: DB_UNAVAILABLE };
  }
}

/** Shopify's fixed `InventoryAdjustQuantitiesInput.reason` values we use. */
export type ShopifyAdjustReason =
  | "correction"
  | "damaged"
  | "quality_control"
  | "promotion"
  | "shrinkage"
  | "received"
  | "movement_created"
  | "movement_received"
  | "movement_canceled"
  | "cycle_count_available"
  | "other";

export interface QuantityChange {
  inventoryItemId: string;
  locationId: string;
  delta: number;
}

/**
 * Post `available` deltas to Shopify in one `inventoryAdjustQuantities`
 * call (all-or-nothing on Shopify's side), cross-referenced to the document.
 * Returns an error message, or undefined on success.
 */
export async function adjustShopifyInventory(
  changes: QuantityChange[],
  reason: ShopifyAdjustReason,
  referenceDocumentUri: string,
): Promise<string | undefined> {
  const nonZero = changes.filter((c) => c.delta !== 0);
  if (nonZero.length === 0) return undefined;

  // Stock arriving where the item isn't stocked yet (a first receipt or
  // transfer to a new location) needs the level activated, or Shopify rejects
  // the adjustment. Activating an already-active level is a no-op.
  const seen = new Set<string>();
  for (const c of nonZero) {
    const k = `${c.inventoryItemId}:${c.locationId}`;
    if (c.delta < 0 || seen.has(k)) continue;
    seen.add(k);
    const act = await shopifyQuery<{ inventoryActivate: { userErrors?: { message: string }[] } | null }>(
      `mutation($itemId: ID!, $locationId: ID!) {
        inventoryActivate(inventoryItemId: $itemId, locationId: $locationId) {
          inventoryLevel { id }
          userErrors { field message }
        }
      }`,
      { itemId: toGid("InventoryItem", c.inventoryItemId), locationId: toGid("Location", c.locationId) },
    );
    if (!act.ok) return act.error;
    const errs = act.data.inventoryActivate?.userErrors ?? [];
    if (errs.length) return errs.map((e) => e.message).join("; ");
  }

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
        reason,
        name: "available",
        referenceDocumentUri,
        changes: nonZero.map((c) => ({
          delta: c.delta,
          inventoryItemId: toGid("InventoryItem", c.inventoryItemId),
          locationId: toGid("Location", c.locationId),
        })),
      },
    },
  );
  if (!res.ok) return res.error;
  const errs = res.data.inventoryAdjustQuantities?.userErrors ?? [];
  return errs.length ? errs.map((e) => e.message).join("; ") : undefined;
}

/** Live `available` at one location for a set of items — used when a stocktake posts its variances. Keyed `itemId:locationId`. */
export async function readAvailable(
  itemIds: string[],
  locationId: string,
): Promise<{ levels?: Map<string, number>; error?: string }> {
  const levels = new Map<string, number>();
  const unique = Array.from(new Set(itemIds));
  // One level per item keeps each query cheap (~3 points per item).
  for (let i = 0; i < unique.length; i += 100) {
    const res = await shopifyQuery<{
      nodes: ({ id: string; inventoryLevel?: { quantities: { name: string; quantity: number }[] } | null } | null)[];
    }>(
      `query($ids: [ID!]!, $locationId: ID!) {
        nodes(ids: $ids) {
          ... on InventoryItem {
            id
            inventoryLevel(locationId: $locationId) { quantities(names: ["available"]) { name quantity } }
          }
        }
      }`,
      { ids: unique.slice(i, i + 100).map((id) => toGid("InventoryItem", id)), locationId: toGid("Location", locationId) },
    );
    if (!res.ok) return { error: res.error };
    for (const node of res.data.nodes) {
      if (!node) continue;
      const itemId = node.id.slice(node.id.lastIndexOf("/") + 1);
      // Not stocked here yet counts as 0 — posting a count activates it.
      levels.set(`${itemId}:${locationId}`, node.inventoryLevel?.quantities.find((q) => q.name === "available")?.quantity ?? 0);
    }
  }
  return { levels };
}

/** The parts of an `orders/create` webhook payload the ledger reads. */
export interface SaleWebhookOrder {
  id?: number | string;
  name?: string;
  /** set on point-of-sale orders */
  location_id?: number | string | null;
  line_items?: {
    id?: number | string;
    variant_id?: number | string | null;
    title?: string;
    variant_title?: string | null;
    sku?: string | null;
    quantity?: number;
  }[];
}

/**
 * Record an order's line items as `sale` movements. Shopify has already
 * decremented the stock; this only writes the audit trail. POS orders carry
 * their location; online orders don't know theirs until fulfilment, so they
 * are filed under "Online orders". Idempotent per line item.
 */
export async function recordSale(order: SaleWebhookOrder): Promise<void> {
  if (!order.id || !Array.isArray(order.line_items)) return;
  const reference = order.name || `#${order.id}`;
  const locationId = order.location_id ? String(order.location_id) : "";
  await recordMovements(
    order.line_items
      .filter((l) => l.variant_id && (l.quantity ?? 0) > 0)
      .map((l) => ({
        key: `sale:${order.id}:${l.id ?? l.variant_id}`,
        type: "sale" as const,
        reference,
        href: `/dashboard/orders/${order.id}`,
        variantId: String(l.variant_id),
        item: l.variant_title && l.variant_title !== "Default Title" ? `${l.title} — ${l.variant_title}` : String(l.title ?? "Item"),
        sku: String(l.sku ?? ""),
        locationId,
        location: locationId ? "Point of sale" : "Online orders",
        delta: -(l.quantity ?? 0),
      })),
  );
}
