import "server-only";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import type { Row } from "@/config/resource-types";

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
 *
 * Outgoing sheets are also where dispatched orders land: every dispatch puts
 * the parcel on a sheet (resolveLoadSheet + attachToLoadSheet below), whose
 * `consignmentIds` and totals grow as parcels are added. A Draft sheet is
 * still being loaded; posting it is the courier handover.
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
    // Orders point at their sheet by reference — deleting a loaded sheet would orphan them.
    const existing = await db.collection<Doc>(COLLECTION[resource]).findOne({ _id: new ObjectId(id) });
    const loaded = Array.isArray(existing?.consignmentIds) ? existing.consignmentIds.length : 0;
    if (loaded > 0) {
      return {
        error: `${existing?.reference} has ${loaded} ${loaded === 1 ? "parcel" : "parcels"} on it — it can't be deleted. Archive it instead.`,
      };
    }
    await db.collection(COLLECTION[resource]).deleteOne({ _id: new ObjectId(id) });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}


// --- dispatched parcels onto sheets ------------------------------------------------

/** Where automatically opened sheets are dispatched from. */
const DEFAULT_LOCATION = "Main Warehouse";

export interface SheetRef {
  id: string;
  reference: string;
}

/**
 * Per-courier lock so parallel dispatches (a batch from the control panel,
 * two scanners at once) can't each open their own "automatic" draft sheet.
 * In-process only — fine for this single-server deployment.
 */
const sheetLocks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = sheetLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  sheetLocks.set(key, next.catch(() => undefined));
  return next;
}

/**
 * Pick the load sheet a dispatched parcel goes on.
 * - `"auto"` (default): the courier's newest Draft sheet, opening one if there's none.
 * - `"new"`: always start a fresh Draft sheet.
 * - a sheet id: that sheet — must be a Draft for the same courier.
 */
export async function resolveLoadSheet(
  courier: string,
  target: unknown,
  location: string = DEFAULT_LOCATION,
): Promise<{ sheet?: SheetRef; error?: string }> {
  if (!courier) return { error: "The order has no courier — assign a consignment first." };
  const t = str(target) || "auto";
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const col = db.collection<Doc>(COLLECTION.dispatch);

    if (t !== "auto" && t !== "new") {
      if (!ObjectId.isValid(t)) return { error: "Pick a load sheet." };
      const doc = await col.findOne({ _id: new ObjectId(t) });
      if (!doc) return { error: "That load sheet no longer exists." };
      if (doc.status !== "draft") {
        return { error: `${doc.reference} is already ${doc.status} — parcels can only be added to a Draft sheet.` };
      }
      if (doc.courier !== courier) {
        return { error: `${doc.reference} is for ${doc.courier}, but this parcel is booked with ${courier}.` };
      }
      return { sheet: { id: t, reference: String(doc.reference) } };
    }

    const open = async (): Promise<{ sheet?: SheetRef; error?: string }> => {
      const created = await createLoadSheet("dispatch", {
        courier,
        location,
        status: "draft",
        reconciliation: "pending",
        totalShipments: 0,
        totalAmount: 0,
        codAmount: 0,
        weight: 0,
        notes: "Opened automatically when orders were dispatched.",
      });
      if (!created.row) return { error: created.error };
      return { sheet: { id: created.row.id, reference: String(created.row.reference) } };
    };

    if (t === "new") return open();
    return withLock(`dispatch:${courier}`, async () => {
      const draft = await col.find({ courier, status: "draft" }).sort({ _id: -1 }).limit(1).next();
      if (draft) return { sheet: { id: draft._id.toHexString(), reference: String(draft.reference) } };
      return open();
    });
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

/** Add one parcel to a sheet: its consignment id plus its value and COD in the totals. Idempotent per consignment. */
/** The fields attachToLoadSheet() touches, typed for $push / $inc. */
type SheetTotals = {
  _id: ObjectId;
  consignmentIds?: string[];
  totalShipments?: number;
  totalAmount?: number;
  codAmount?: number;
  updatedAt?: string;
};

export async function attachToLoadSheet(
  sheetId: string,
  parcel: { consignmentId: string; total: number; codAmount: number },
): Promise<{ error?: string }> {
  if (!ObjectId.isValid(sheetId)) return { error: "Invalid load sheet id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    await db.collection<SheetTotals>(COLLECTION.dispatch).updateOne(
      { _id: new ObjectId(sheetId), consignmentIds: { $ne: parcel.consignmentId } },
      {
        $push: { consignmentIds: parcel.consignmentId },
        $inc: {
          totalShipments: 1,
          totalAmount: numOr0(parcel.total),
          codAmount: numOr0(parcel.codAmount),
        },
        $set: { updatedAt: new Date().toISOString() },
      },
    );
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

/** Post a sheet (courier handover), stamping Date Posted if it hasn't been. */
export async function postLoadSheet(sheetId: string): Promise<{ row?: Row; error?: string }> {
  if (!ObjectId.isValid(sheetId)) return { error: "Invalid load sheet id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const col = db.collection<Doc>(COLLECTION.dispatch);
    const oid = new ObjectId(sheetId);
    const now = new Date().toISOString();
    await col.updateOne({ _id: oid, datePosted: "" }, { $set: { datePosted: now } });
    await col.updateOne({ _id: oid }, { $set: { status: "posted", updatedAt: now } });
    const doc = await col.findOne({ _id: oid });
    return doc ? { row: toRow(doc) } : { error: "That load sheet no longer exists." };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}
