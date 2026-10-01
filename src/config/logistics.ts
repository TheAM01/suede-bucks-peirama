import type { Row } from "./resource-types";

/**
 * Logistics — shipment tracking stages and the aggregations behind COD
 * reconciliation and courier performance. Client-safe: the shipments rows
 * come from src/lib/logistics.ts, and both summary pages compute from them
 * in the browser, so every figure matches the tracking board exactly.
 */

/** A parcel in transit longer than this is flagged Stuck. */
export const SHIPMENT_STUCK_DAYS = 5;

export const TRACKING_STAGES = [
  { value: "awaiting_pickup", label: "Awaiting pickup", variant: "warning" as const },
  { value: "in_transit", label: "In transit", variant: "info" as const },
  { value: "delivered", label: "Delivered", variant: "success" as const },
  { value: "returned", label: "Returned (RTO)", variant: "destructive" as const },
  { value: "other", label: "Other", variant: "outline" as const },
];

/** Order workflow status → tracking stage. Fulfilled counts as delivered (manual courier). */
export function trackingStage(opsStatus: unknown): string {
  switch (opsStatus) {
    case "finalized":
    case "in_pickup_packing":
      return "awaiting_pickup";
    case "dispatched":
      return "in_transit";
    case "fulfilled":
    case "delivered":
      return "delivered";
    case "returned":
      return "returned";
    default:
      return "other";
  }
}

const n = (v: unknown) => Number(v ?? 0) || 0;

export interface CourierCod {
  courier: string;
  /** COD on parcels still out with the courier */
  inField: number;
  /** COD on delivered parcels — what the courier has collected and owes */
  collected: number;
  remitted: number;
  /** collected − remitted */
  outstanding: number;
  deliveredParcels: number;
}

/** Per-courier COD position from shipments + remittance rows. */
export function codByCourier(shipments: Row[], remittances: Row[]): CourierCod[] {
  const map = new Map<string, CourierCod>();
  const get = (courier: string) => {
    const k = courier || "Unassigned";
    if (!map.has(k)) {
      map.set(k, { courier: k, inField: 0, collected: 0, remitted: 0, outstanding: 0, deliveredParcels: 0 });
    }
    return map.get(k)!;
  };
  for (const s of shipments) {
    const c = get(String(s.courier ?? ""));
    if (s.stage === "in_transit") c.inField += n(s.codAmount);
    if (s.stage === "delivered") {
      c.collected += n(s.codAmount);
      c.deliveredParcels += 1;
    }
  }
  for (const r of remittances) get(String(r.courier ?? "")).remitted += n(r.amount);
  for (const c of map.values()) c.outstanding = c.collected - c.remitted;
  return [...map.values()].sort((a, b) => b.outstanding - a.outstanding);
}

export interface PerformanceRow {
  key: string;
  shipments: number;
  inTransit: number;
  stuck: number;
  delivered: number;
  returned: number;
  /** delivered ÷ (delivered + returned); null until something has finished */
  deliveryRate: number | null;
  rtoRate: number | null;
  avgDeliveryDays: number | null;
  codCollected: number;
}

/** Courier (or city) scorecard from shipment rows, grouped by `groupBy`. Awaiting-pickup parcels aren't counted. */
export function performanceBy(shipments: Row[], groupBy: (r: Row) => string): PerformanceRow[] {
  const map = new Map<string, PerformanceRow & { daysSum: number; daysCount: number }>();
  for (const s of shipments) {
    if (s.stage !== "in_transit" && s.stage !== "delivered" && s.stage !== "returned") continue;
    const key = groupBy(s) || "Unknown";
    if (!map.has(key)) {
      map.set(key, {
        key,
        shipments: 0,
        inTransit: 0,
        stuck: 0,
        delivered: 0,
        returned: 0,
        deliveryRate: null,
        rtoRate: null,
        avgDeliveryDays: null,
        codCollected: 0,
        daysSum: 0,
        daysCount: 0,
      });
    }
    const p = map.get(key)!;
    p.shipments += 1;
    if (s.stage === "in_transit") {
      p.inTransit += 1;
      if (s.stuck) p.stuck += 1;
    }
    if (s.stage === "delivered") {
      p.delivered += 1;
      p.codCollected += n(s.codAmount);
      if (s.deliveryDays != null) {
        p.daysSum += n(s.deliveryDays);
        p.daysCount += 1;
      }
    }
    if (s.stage === "returned") p.returned += 1;
  }
  return [...map.values()]
    .map(({ daysSum, daysCount, ...p }) => {
      const finished = p.delivered + p.returned;
      return {
        ...p,
        deliveryRate: finished ? p.delivered / finished : null,
        rtoRate: finished ? p.returned / finished : null,
        avgDeliveryDays: daysCount ? daysSum / daysCount : null,
      };
    })
    .sort((a, b) => b.shipments - a.shipments);
}
