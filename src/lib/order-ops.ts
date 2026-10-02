import "server-only";
import { getDb, isDbConfigured } from "./db";
import type { Row } from "@/config/resource-types";
import { ON_SHEET_STAGES } from "@/config/order-workflow";
import { detachFromLoadSheet, findSheetByReference } from "./dispatch";

/**
 * Order operational status — the tab bar on the Orders page (Exception,
 * Pending CC, Active, Packaged, Finalized, In Pickup & Packing, Dispatched,
 * ...). Shopify has no equivalent field, so this is a thin app-owned overlay
 * keyed by Shopify order id — one document per order that has ever had its
 * status touched, stored in `app_order_ops` with the Shopify order id as
 * `_id` for a trivial upsert. An order with no document is `active` by default.
 *
 * The same document carries the rest of the order workflow's state (see
 * src/lib/order-workflow.ts): address flags from intake, whether staff have
 * modified it since, the courier consignment, the COD amount snapshot, and an
 * append-only `history` of every transition. Deliberately no customer PII —
 * names/addresses stay in Shopify and are read live (see shopify-webhooks.ts).
 */

const COLLECTION = "app_order_ops";

export const ORDER_OPS_STATUSES = [
  "draft",
  "active",
  "finalized",
  "packaged",
  "in_pickup_packing",
  "dispatched",
  "fulfilled",
  "delivered",
  "returned",
  "canceled",
  "pending_cc",
  "duplicate",
  "exception",
  "booking_failed",
  "on_hold",
] as const;
export type OrderOpsStatus = (typeof ORDER_OPS_STATUSES)[number];

export const DEFAULT_STATUS: OrderOpsStatus = "active";

export const DB_MISSING = "No database configured — connect MongoDB to save order status.";
export const DB_DOWN = "MongoDB is not reachable — order status wasn't saved.";

function isValidStatus(v: unknown): v is OrderOpsStatus {
  return typeof v === "string" && (ORDER_OPS_STATUSES as readonly string[]).includes(v);
}

export interface OpsHistoryEntry {
  at: string;
  action: string;
  from?: string;
  to?: string;
  note?: string;
}

export interface OrderOpsDoc {
  _id: string;
  opsStatus: string;
  number?: string;
  /** address problems found by the most recent check */
  flags?: string[];
  /** staff have edited the order since it last entered Exception */
  modified?: boolean;
  courier?: string;
  consignmentId?: string;
  bookingError?: string;
  /** amount the courier collects on delivery — snapshot taken at Create Package */
  codAmount?: number;
  total?: number;
  labelPrintedAt?: string;
  fulfilledAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  /** shipping city, snapshot at Assign consignment — for shipment tracking and courier stats */
  city?: string;
  loadSheet?: string;
  cancelReason?: string;
  history?: OpsHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
}

let indexesReady = false;

async function collection() {
  if (!isDbConfigured()) return { error: DB_MISSING } as const;
  try {
    const db = await getDb();
    if (!db) return { error: DB_DOWN } as const;
    const col = db.collection<OrderOpsDoc>(COLLECTION);
    if (!indexesReady) {
      // A consignment id identifies exactly one parcel — scanning resolves through it.
      await col.createIndex(
        { consignmentId: 1 },
        { unique: true, partialFilterExpression: { consignmentId: { $type: "string" } } },
      );
      indexesReady = true;
    }
    return { col } as const;
  } catch {
    return { error: DB_DOWN } as const;
  }
}

/** Merge each row's stored workflow state in, defaulting to "active" — never fails the caller, degrades to the default on any DB problem. */
export async function attachOrderOps(rows: Row[]): Promise<Row[]> {
  const withDefault = () => rows.map((r) => ({ ...r, opsStatus: DEFAULT_STATUS }));
  if (rows.length === 0 || !isDbConfigured()) return withDefault();
  const c = await collection();
  if ("error" in c) return withDefault();
  try {
    const ids = rows.map((r) => String(r.id));
    const docs = await c.col.find({ _id: { $in: ids } }).toArray();
    const byId = new Map(docs.map((d) => [d._id, d]));
    return rows.map((r) => {
      const d = byId.get(String(r.id));
      return {
        ...r,
        opsStatus: d?.opsStatus ?? DEFAULT_STATUS,
        consignmentId: d?.consignmentId,
        loadSheet: d?.loadSheet,
        // The booked courier wins over Shopify's fulfillment tracking company.
        courier: d?.courier || r.courier,
        flags: d?.flags ?? [],
        modified: d?.modified ?? false,
      };
    });
  } catch {
    return withDefault();
  }
}

/** The order's workflow document, or a synthetic default one if it has never been touched. */
export async function getOrderOps(
  orderId: string,
): Promise<{ doc?: OrderOpsDoc; error?: string }> {
  const c = await collection();
  if ("error" in c) return { error: c.error };
  try {
    const doc = await c.col.findOne({ _id: orderId });
    return { doc: doc ?? { _id: orderId, opsStatus: DEFAULT_STATUS, history: [] } };
  } catch {
    return { error: DB_DOWN };
  }
}

/** Every order that has a consignment — the shipment tracking board's source. Newest first. */
export async function listConsignedOrders(): Promise<{ docs?: OrderOpsDoc[]; error?: string }> {
  const c = await collection();
  if ("error" in c) return { error: c.error };
  try {
    const docs = await c.col
      .find({ consignmentId: { $type: "string" } }, { projection: { history: 0 } })
      .sort({ updatedAt: -1 })
      .limit(5000)
      .toArray();
    return { docs };
  } catch {
    return { error: DB_DOWN };
  }
}

export async function findByConsignment(
  consignmentId: string,
): Promise<{ doc?: OrderOpsDoc | null; error?: string }> {
  const c = await collection();
  if ("error" in c) return { error: c.error };
  try {
    return { doc: await c.col.findOne({ consignmentId }) };
  } catch {
    return { error: DB_DOWN };
  }
}

/**
 * First sighting of an order (orders/create webhook). Only ever inserts —
 * a redelivered webhook, or an order staff already moved, is left untouched.
 */
export async function intakeOrder(
  orderId: string,
  fields: { opsStatus: string; number: string; flags: string[]; note: string },
): Promise<{ error?: string }> {
  const c = await collection();
  if ("error" in c) return { error: c.error };
  const now = new Date().toISOString();
  try {
    await c.col.updateOne(
      { _id: orderId },
      {
        $setOnInsert: {
          opsStatus: fields.opsStatus,
          number: fields.number,
          flags: fields.flags,
          modified: false,
          createdAt: now,
          updatedAt: now,
          history: [{ at: now, action: "intake", to: fields.opsStatus, note: fields.note }],
        },
      },
      { upsert: true },
    );
    return {};
  } catch {
    return { error: DB_DOWN };
  }
}

/**
 * Compare-and-set a workflow transition: only applies if the order is still
 * in `from` (so two people acting on the same order can't both win). An order
 * with no document counts as "active" — the upsert creates it; if a document
 * exists in a different status the upsert's insert collides on `_id` and
 * that's reported as a conflict, not a crash.
 */
export async function applyTransition(
  orderId: string,
  from: string,
  entry: OpsHistoryEntry,
  set: Partial<Omit<OrderOpsDoc, "_id" | "history">>,
  unset: (keyof OrderOpsDoc)[] = [],
): Promise<{ error?: string }> {
  const c = await collection();
  if ("error" in c) return { error: c.error };
  const now = entry.at;
  const update: Record<string, unknown> = {
    $set: { ...set, updatedAt: now },
    $push: { history: entry },
    $setOnInsert: { createdAt: now },
  };
  if (unset.length) update.$unset = Object.fromEntries(unset.map((k) => [k, ""]));
  try {
    const res = await c.col.updateOne(
      { _id: orderId, opsStatus: from },
      update,
      { upsert: from === DEFAULT_STATUS },
    );
    if (res.matchedCount === 0 && res.upsertedCount === 0) {
      return { error: "This order's status changed in the meantime — refresh and try again." };
    }
    return {};
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 11000) {
      const dupConsignment = String((err as { message?: string }).message).includes("consignmentId");
      return {
        error: dupConsignment
          ? "That consignment ID is already assigned to another order."
          : "This order's status changed in the meantime — refresh and try again.",
      };
    }
    return { error: DB_DOWN };
  }
}

/** Direct status override (the order drawer's status field). A no-op (not an error) if the patch didn't touch `opsStatus`. */
export async function setOrderOps(
  orderId: string,
  status: unknown,
): Promise<{ error?: string }> {
  if (status === undefined) return {};
  if (!isValidStatus(status)) return { error: "That isn't a valid order status." };
  const c = await collection();
  if ("error" in c) return { error: c.error };
  const now = new Date().toISOString();
  try {
    const before = await c.col.findOne({ _id: orderId });
    const from = before?.opsStatus ?? DEFAULT_STATUS;
    if (from === status) return {};
    // Moving a parcel back before hand-over takes it off its load sheet, so
    // the sheet never lists an order that says it hasn't left.
    const leavesSheet = Boolean(before?.loadSheet) && !ON_SHEET_STAGES.includes(String(status));
    if (leavesSheet) {
      const released = await releaseFromSheet(before!);
      if (released.error) return released;
    }
    await c.col.updateOne(
      { _id: orderId },
      {
        $set: { opsStatus: status, updatedAt: now },
        ...(leavesSheet ? { $unset: { loadSheet: "", dispatchedAt: "" } } : {}),
        $push: { history: { at: now, action: "set_status", from, to: status } },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return {};
  } catch {
    return { error: DB_DOWN };
  }
}

/**
 * Take an order's parcel off its load sheet — only while that sheet is still
 * a Draft. A handed-over (posted / archived) sheet is a record of what left
 * with the courier, so it's refused. Doesn't touch the order doc itself.
 */
export async function releaseFromSheet(doc: OrderOpsDoc): Promise<{ error?: string }> {
  if (!doc.loadSheet) return {};
  const { sheet, error } = await findSheetByReference(doc.loadSheet);
  if (error) return { error };
  if (!sheet) return {};
  if (sheet.status !== "draft") {
    return {
      error: `${doc.number ?? "This order"} is on load sheet ${doc.loadSheet}, which has been handed to the courier — mark it returned instead.`,
    };
  }
  return detachFromLoadSheet(sheet.id, {
    consignmentId: doc.consignmentId ?? "",
    total: doc.total ?? 0,
    codAmount: doc.codAmount ?? 0,
  });
}

/** Drop an order's workflow record (after the Shopify order itself was deleted). Best-effort. */
export async function deleteOrderOps(orderId: string): Promise<void> {
  const c = await collection();
  if ("error" in c) return;
  try {
    await c.col.deleteOne({ _id: orderId });
  } catch {
    // orphaned record is harmless — it's never listed without its Shopify order
  }
}

/** Every order on a load sheet: listed in its `consignmentIds`, or pointing at it by reference. */
export async function findBySheet(
  reference: string,
  consignmentIds: string[],
): Promise<{ docs?: OrderOpsDoc[]; error?: string }> {
  const c = await collection();
  if ("error" in c) return { error: c.error };
  try {
    const docs = await c.col
      .find({ $or: [{ loadSheet: reference }, { consignmentId: { $in: consignmentIds } }] })
      .toArray();
    return { docs };
  } catch {
    return { error: DB_DOWN };
  }
}
