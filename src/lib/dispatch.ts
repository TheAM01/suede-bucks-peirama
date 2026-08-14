import "server-only";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import type { Row } from "@/config/resource-types";

/**
 * Dispatch load sheets — the courier handover manifest for shipments leaving
 * a location together. App-owned (Shopify has no load-sheet concept): stored
 * in MongoDB, one document per sheet.
 *
 * `reference` (LS001, LS002, ...) comes from an atomic counter, never
 * duplicated. `datePosted` is stamped the first time a sheet's status becomes
 * `posted` and is never overwritten after — archiving a posted sheet later
 * leaves it as-is.
 */

const COLLECTION = "app_dispatch_load_sheets";
const COUNTERS = "app_counters";
const COUNTER_ID = "dispatch";

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

/** Atomically allocate the next LS-XXX reference. */
async function nextReference(): Promise<string> {
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
  return `LS${String(counter.seq).padStart(3, "0")}`;
}

// --- public API ---------------------------------------------------------------

export async function listLoadSheets(): Promise<{ rows: Row[]; error?: string }> {
  if (!isDbConfigured()) {
    return {
      rows: [],
      error: "No database configured — connect MongoDB to store dispatch load sheets.",
    };
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

export async function createLoadSheet(
  input: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  const v = validate(input);
  if ("error" in v) return { error: v.error };
  const { values } = v;

  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };

    const reference = await nextReference();
    const now = new Date().toISOString();
    const doc: Record<string, unknown> = {
      reference,
      ...values,
      createdAt: now,
      updatedAt: now,
      datePosted: values.status === "posted" ? now : "",
    };
    const res = await db.collection(COLLECTION).insertOne(doc);
    return { row: { ...doc, id: res.insertedId.toHexString() } as Row };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function updateLoadSheet(
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

export async function deleteLoadSheet(id: string): Promise<{ error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}
