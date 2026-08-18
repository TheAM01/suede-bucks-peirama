import "server-only";
import { getDb, isDbConfigured } from "./db";
import type { Row } from "@/config/resource-types";

/**
 * Order operational status — the tab bar on the Orders page (Draft, Active,
 * Finalized, Packaged, Fulfilled, Delivered, Returned, Canceled, Pending CC,
 * Duplicate, Exception, Booking Failed, On Hold). Shopify has no equivalent
 * field, so this is a thin app-owned overlay keyed by Shopify order id — one
 * document per order that has ever had its status touched, stored in
 * `app_order_ops` with the Shopify order id as `_id` for a trivial upsert.
 * An order with no document is `active` by default.
 */

const COLLECTION = "app_order_ops";

export const ORDER_OPS_STATUSES = [
  "draft",
  "active",
  "finalized",
  "packaged",
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

const DEFAULT_STATUS: OrderOpsStatus = "active";

function isValidStatus(v: unknown): v is OrderOpsStatus {
  return typeof v === "string" && (ORDER_OPS_STATUSES as readonly string[]).includes(v);
}

type Doc = { _id: string; opsStatus: string };

/** Merge each row's stored `opsStatus` in, defaulting to "active" — never fails the caller, degrades to the default on any DB problem. */
export async function attachOrderOps(rows: Row[]): Promise<Row[]> {
  if (rows.length === 0 || !isDbConfigured()) {
    return rows.map((r) => ({ ...r, opsStatus: DEFAULT_STATUS }));
  }
  try {
    const db = await getDb();
    if (!db) return rows.map((r) => ({ ...r, opsStatus: DEFAULT_STATUS }));
    const ids = rows.map((r) => String(r.id));
    const docs = await db
      .collection<Doc>(COLLECTION)
      .find({ _id: { $in: ids } })
      .toArray();
    const byId = new Map(docs.map((d) => [d._id, d.opsStatus]));
    return rows.map((r) => ({
      ...r,
      opsStatus: byId.get(String(r.id)) ?? DEFAULT_STATUS,
    }));
  } catch {
    return rows.map((r) => ({ ...r, opsStatus: DEFAULT_STATUS }));
  }
}

/** Upsert one order's operational status. A no-op (not an error) if the patch didn't touch `opsStatus`. */
export async function setOrderOps(
  orderId: string,
  status: unknown,
): Promise<{ error?: string }> {
  if (status === undefined) return {};
  if (!isValidStatus(status)) return { error: "That isn't a valid order status." };
  if (!isDbConfigured()) {
    return { error: "No database configured — connect MongoDB to save order status." };
  }
  try {
    const db = await getDb();
    if (!db) return { error: "MongoDB is not reachable — order status wasn't saved." };
    await db.collection<Doc>(COLLECTION).updateOne(
      { _id: orderId },
      { $set: { opsStatus: status, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
    return {};
  } catch {
    return { error: "MongoDB is not reachable — order status wasn't saved." };
  }
}
