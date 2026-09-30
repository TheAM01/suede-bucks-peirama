import "server-only";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import type { Row } from "@/config/resource-types";
import { findByConsignment } from "./order-ops";
import { runOrderAction } from "./order-workflow";

/**
 * Load sheets — the courier handover manifest for a batch of shipments moving
 * together. Shared by two resources that are identical in shape and only
 * differ in direction: `dispatch` (outgoing, to the customer) and
 * `return-load-sheets` (incoming, a courier handing returns back). App-owned
 * (Shopify has no load-sheet concept): stored in MongoDB, one collection per
 * direction, one document per sheet.
 *
 * `reference` (LS001, LS002, ... / RL001, RL002, ...) comes from an atomic
 * per-direction counter, never duplicated. `datePosted` is stamped the first
 * time a sheet's status becomes `posted` and is never overwritten after —
 * archiving a posted sheet later leaves it as-is.
 */

export type LoadSheetResource = "dispatch" | "return-load-sheets";

const COLLECTION: Record<LoadSheetResource, string> = {
  dispatch: "app_dispatch_load_sheets",
  "return-load-sheets": "app_return_load_sheets",
};
const COUNTER_ID: Record<LoadSheetResource, string> = {
  dispatch: "dispatch",
  "return-load-sheets": "return-load-sheets",
};
const REFERENCE_PREFIX: Record<LoadSheetResource, string> = {
  dispatch: "LS",
  "return-load-sheets": "RL",
};
const NOUN: Record<LoadSheetResource, string> = {
  dispatch: "dispatch load sheets",
  "return-load-sheets": "return load sheets",
};

const COUNTERS = "app_counters";

export const DISPATCH_STATUSES = ["draft", "posted", "archived"] as const;
type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

interface LoadSheetValues {
  courier: string;
  location: string;
  status: DispatchStatus;
  reconciliation: "pending" | "reconciled";
  totalShipments: number;
  totalAmount: number;
  codAmount: number;
  weight: number;
  notes: string;
}

type Doc = { _id: ObjectId } & Record<string, unknown>;

const str = (v: unknown): string => (v == null ? "" : String(v));
const numOr0 = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function toRow(doc: Doc): Row {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() } as Row;
}

/** Normalize + validate client-sent values. Returns an error message or the clean values. */
function validate(
  input: Record<string, unknown>,
): { values: LoadSheetValues } | { error: string } {
  const courier = str(input.courier).trim();
  if (!courier) return { error: "Pick a courier." };

  const location = str(input.location).trim();
  if (!location) return { error: "Pick the location this sheet dispatches from." };

  const status = str(input.status);
  if (!DISPATCH_STATUSES.includes(status as DispatchStatus)) {
    return { error: "Status must be draft, posted, or archived." };
  }

  const reconciliation = str(input.reconciliation) || "pending";
  if (reconciliation !== "pending" && reconciliation !== "reconciled") {
    return { error: "Reconciliation must be pending or reconciled." };
  }

  return {
    values: {
      courier,
      location,
      status: status as DispatchStatus,
      reconciliation,
      totalShipments: numOr0(input.totalShipments),
      totalAmount: numOr0(input.totalAmount),
      codAmount: numOr0(input.codAmount),
      weight: numOr0(input.weight),
      notes: str(input.notes),
    },
  };
}

/** Atomically allocate the next reference for this direction (LS-style or RL-style). */
async function nextReference(resource: LoadSheetResource): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error(DB_UNAVAILABLE);
  const counter = await db
    .collection<{ _id: string; seq: number }>(COUNTERS)
    .findOneAndUpdate(
      { _id: COUNTER_ID[resource] },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  if (!counter) throw new Error(DB_UNAVAILABLE);
  return `${REFERENCE_PREFIX[resource]}${String(counter.seq).padStart(3, "0")}`;
}

// --- public API ---------------------------------------------------------------

export async function listLoadSheets(
  resource: LoadSheetResource,
): Promise<{ rows: Row[]; error?: string }> {
  if (!isDbConfigured()) {
    return {
      rows: [],
      error: `No database configured — connect MongoDB to store ${NOUN[resource]}.`,
    };
  }
  try {
    const db = await getDb();
    if (!db) return { rows: [], error: DB_UNAVAILABLE };
    const docs = await db
      .collection<Doc>(COLLECTION[resource])
      .find()
      .sort({ _id: -1 })
      .limit(500)
      .toArray();
    return { rows: docs.map(toRow) };
  } catch {
    return { rows: [], error: DB_UNAVAILABLE };
  }
}

export async function createLoadSheet(
  resource: LoadSheetResource,
  input: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  const v = validate(input);
  if ("error" in v) return { error: v.error };
  const { values } = v;

  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };

    const reference = await nextReference(resource);
    const now = new Date().toISOString();
    const doc: Record<string, unknown> = {
      reference,
      ...values,
      createdAt: now,
      updatedAt: now,
      datePosted: values.status === "posted" ? now : "",
    };
    const res = await db.collection(COLLECTION[resource]).insertOne(doc);
    return { row: { ...doc, id: res.insertedId.toHexString() } as Row };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function updateLoadSheet(
  resource: LoadSheetResource,
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
    const col = db.collection<Doc>(COLLECTION[resource]);
    const oid = new ObjectId(id);

    const existing = await col.findOne({ _id: oid });
    if (!existing) return { error: "That load sheet no longer exists." };

    const now = new Date().toISOString();
    const fields: Record<string, unknown> = { ...values, updatedAt: now };
    // Stamp datePosted the first time a sheet reaches "posted"; never overwrite it after.
    if (values.status === "posted" && !existing.datePosted) {
      fields.datePosted = now;
    }

    await col.updateOne({ _id: oid }, { $set: fields });
    const updated = await col.findOne({ _id: oid });
    return updated ? { row: toRow(updated) } : { error: "That load sheet no longer exists." };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function deleteLoadSheet(
  resource: LoadSheetResource,
  id: string,
): Promise<{ error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    await db.collection(COLLECTION[resource]).deleteOne({ _id: new ObjectId(id) });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

/**
 * Build a posted dispatch load sheet from scanned label QR codes: each code is
 * a consignment id, resolved to its order through `app_order_ops`. Every
 * parcel must be In Pickup & Packing (label printed, not yet dispatched);
 * totals and COD are summed server-side from the Create Package snapshot,
 * never trusted from the client. Posting the sheet is the courier handover,
 * so each order on it is then dispatched with the sheet's reference.
 */
export async function createScannedLoadSheet(input: {
  courier?: unknown;
  location?: unknown;
  consignmentIds?: unknown;
}): Promise<{ row?: Row; error?: string; dispatchErrors?: string[] }> {
  const ids = Array.isArray(input.consignmentIds)
    ? Array.from(new Set(input.consignmentIds.map((v) => str(v).trim()).filter(Boolean)))
    : [];
  if (ids.length === 0) return { error: "Scan at least one package." };

  const parcels = [];
  for (const id of ids) {
    const { doc, error } = await findByConsignment(id);
    if (error) return { error };
    if (!doc) return { error: `No order has consignment ${id}.` };
    if (doc.opsStatus !== "in_pickup_packing") {
      return { error: `${doc.number || id} isn't ready for pickup (label not printed, or already dispatched).` };
    }
    parcels.push(doc);
  }

  const created = await createLoadSheet("dispatch", {
    courier: input.courier,
    location: input.location,
    status: "posted",
    reconciliation: "pending",
    totalShipments: parcels.length,
    totalAmount: parcels.reduce((n, p) => n + numOr0(p.total), 0),
    codAmount: parcels.reduce((n, p) => n + numOr0(p.codAmount), 0),
    weight: 0,
    notes: "",
  });
  if (!created.row) return { error: created.error };

  const reference = String(created.row.reference);
  try {
    const db = await getDb();
    await db?.collection(COLLECTION.dispatch).updateOne(
      { _id: new ObjectId(created.row.id) },
      { $set: { consignmentIds: ids } },
    );
  } catch {
    // The sheet exists either way; only the consignment list is missing.
  }

  const dispatchErrors: string[] = [];
  for (const p of parcels) {
    const res = await runOrderAction(p._id, "dispatch", { loadSheet: reference });
    if (res.error) dispatchErrors.push(`${p.number || p.consignmentId}: ${res.error}`);
  }
  return { row: { ...created.row, consignmentIds: ids }, dispatchErrors };
}
