import "server-only";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import { listConsignedOrders } from "./order-ops";
import { SHIPMENT_STUCK_DAYS, trackingStage } from "@/config/logistics";
import type { Row } from "@/config/resource-types";

/**
 * Logistics read models built from the order workflow (src/lib/order-ops.ts):
 * the shipment tracking board, which also feeds COD reconciliation and
 * courier performance (both aggregated client-side from these rows).
 */

const DAY_MS = 86_400_000;
const daysBetween = (from?: string, to?: string) =>
  from && to ? Math.max(0, (Date.parse(to) - Date.parse(from)) / DAY_MS) : null;

export async function listShipments(): Promise<{ rows: Row[]; error?: string }> {
  const { docs, error } = await listConsignedOrders();
  if (error || !docs) {
    // order-ops' messages are worded for saves; this is a read.
    return {
      rows: [],
      error: isDbConfigured() ? DB_UNAVAILABLE : "No database configured — connect MongoDB to track shipments.",
    };
  }
  const now = new Date().toISOString();
  const rows = docs.map((d): Row => {
    const stage = trackingStage(d.opsStatus);
    const deliveredAt = d.deliveredAt || (stage === "delivered" ? d.fulfilledAt : undefined);
    const age = stage === "in_transit" ? daysBetween(d.dispatchedAt, now) : null;
    return {
      id: d._id,
      number: d.number ?? d._id,
      consignmentId: d.consignmentId,
      courier: d.courier ?? "",
      city: d.city ?? "",
      opsStatus: d.opsStatus,
      stage,
      loadSheet: d.loadSheet ?? "",
      codAmount: d.codAmount ?? 0,
      total: d.total ?? 0,
      dispatchedAt: d.dispatchedAt ?? "",
      deliveredAt: deliveredAt ?? "",
      returnedAt: d.returnedAt ?? "",
      daysInTransit: age === null ? null : Math.floor(age),
      deliveryDays: stage === "delivered" ? daysBetween(d.dispatchedAt, deliveredAt) : null,
      stuck: age !== null && age > SHIPMENT_STUCK_DAYS,
      updatedAt: d.updatedAt ?? "",
    };
  });
  return { rows };
}

/** A remittance settles these outgoing load sheets: mark them COD-reconciled. Returns how many were updated. */
export async function reconcileLoadSheets(ids: unknown): Promise<{ count?: number; error?: string }> {
  const list = (Array.isArray(ids) ? ids : String(ids ?? "").split(","))
    .map((x) => String(x).trim())
    .filter((x) => ObjectId.isValid(x));
  if (list.length === 0) return { count: 0 };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const res = await db
      .collection("app_dispatch_load_sheets")
      .updateMany(
        { _id: { $in: list.map((x) => new ObjectId(x)) } },
        { $set: { reconciliation: "reconciled", updatedAt: new Date().toISOString() } },
      );
    return { count: res.modifiedCount };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

/** A COD remittance needs a courier and a positive amount; the rest is free-form. */
export function validateRemittance(body: Record<string, unknown>): string | undefined {
  if (!String(body.courier ?? "").trim()) return "Pick the courier that paid.";
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount received.";
  return undefined;
}
