import "server-only";
import { shopifyQuery, toGid, fromGid } from "./shopify-client";

/**
 * Single-order read: everything the list view can't show. The orders list
 * carries two snapshot enums (`displayFinancialStatus`, `displayFulfillmentStatus`);
 * this pulls the history behind them — line items, fulfillments with tracking,
 * payment transactions, refunds, and Shopify's own event log — and merges them
 * into one chronological timeline.
 *
 * Defensive like the other readers: a schema/scope failure surfaces as
 * `{ error }`, never a crash and never invented data.
 */

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (v == null ? "" : String(v));
const lower = (v: unknown): string => str(v).toLowerCase();

const get = (o: unknown, ...path: string[]): unknown => {
  let cur: unknown = o;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
};

const money = (o: unknown, key: string): number =>
  num(get(o, key, "shopMoney", "amount"));

const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

const connNodes = (v: unknown): Record<string, unknown>[] =>
  list(get(v, "nodes"));

export type TimelineKind =
  | "placed"
  | "payment"
  | "fulfillment"
  | "delivery"
  | "refund"
  | "cancelled"
  | "event";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  detail?: string;
  at: string;
  /** shown as a monospace reference, e.g. a tracking number */
  reference?: string;
  referenceUrl?: string;
  amount?: number;
}

export interface OrderLineItem {
  id: string;
  title: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  total: number;
}

export interface OrderFulfillmentItem {
  title: string;
  sku: string;
  quantity: number;
}

export interface OrderFulfillment {
  id: string;
  status: string;
  displayStatus: string;
  createdAt: string;
  deliveredAt: string;
  estimatedDeliveryAt: string;
  trackingCompany: string;
  trackingNumber: string;
  trackingUrl: string;
  items: OrderFulfillmentItem[];
}

export interface OrderTransaction {
  id: string;
  kind: string;
  status: string;
  gateway: string;
  processedAt: string;
  amount: number;
}

export interface OrderRefund {
  id: string;
  createdAt: string;
  note: string;
  amount: number;
}

export interface OrderDetail {
  id: string;
  number: string;
  createdAt: string;
  processedAt: string;
  cancelledAt: string;
  cancelReason: string;
  closedAt: string;
  channel: string;
  note: string;
  tags: string[];
  payment: string;
  fulfillment: string;
  customer: { name: string; email: string; phone: string };
  shippingAddress: string;
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    refunded: number;
  };
  lineItems: OrderLineItem[];
  fulfillments: OrderFulfillment[];
  transactions: OrderTransaction[];
  refunds: OrderRefund[];
  timeline: TimelineEntry[];
}

const PAYMENT_MAP: Record<string, string> = {
  paid: "paid",
  partially_paid: "pending",
  pending: "pending",
  authorized: "pending",
  refunded: "refunded",
  partially_refunded: "refunded",
  voided: "refunded",
};

const FULFILLMENT_MAP: Record<string, string> = {
  fulfilled: "fulfilled",
  partially_fulfilled: "partial",
  unfulfilled: "unfulfilled",
  scheduled: "unfulfilled",
  on_hold: "unfulfilled",
};

const ORDER_DETAIL_QUERY = `query OrderDetail($id: ID!) {
  order(id: $id) {
    id name createdAt processedAt cancelledAt cancelReason closedAt
    sourceName note tags email phone
    displayFinancialStatus displayFulfillmentStatus
    customer { displayName email phone }
    shippingAddress { name address1 address2 city province zip country }
    subtotalPriceSet { shopMoney { amount } }
    totalShippingPriceSet { shopMoney { amount } }
    totalTaxSet { shopMoney { amount } }
    totalPriceSet { shopMoney { amount } }
    totalRefundedSet { shopMoney { amount } }
    lineItems(first: 100) {
      nodes {
        id title sku variantTitle quantity
        discountedTotalSet { shopMoney { amount } }
      }
    }
    fulfillments(first: 20) {
      id status displayStatus createdAt deliveredAt estimatedDeliveryAt
      trackingInfo { company number url }
      fulfillmentLineItems(first: 100) {
        nodes { id quantity lineItem { title sku } }
      }
    }
    transactions(first: 30) {
      id kind status gateway processedAt
      amountSet { shopMoney { amount } }
    }
    refunds(first: 20) {
      id createdAt note
      totalRefundedSet { shopMoney { amount } }
    }
    events(first: 50, sortKey: CREATED_AT) {
      nodes { id message createdAt criticalAlert }
    }
  }
}`;

function formatAddress(a: unknown): string {
  if (!a) return "";
  return [
    str(get(a, "name")),
    str(get(a, "address1")),
    str(get(a, "address2")),
    [str(get(a, "city")), str(get(a, "province")), str(get(a, "zip"))]
      .filter(Boolean)
      .join(" "),
    str(get(a, "country")),
  ]
    .filter(Boolean)
    .join("\n");
}

const titleCaseWords = (v: string): string =>
  v
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

/** Merge every dated record on the order into one chronological list. */
function buildTimeline(
  order: Record<string, unknown>,
  fulfillments: OrderFulfillment[],
  transactions: OrderTransaction[],
  refunds: OrderRefund[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  const placedAt = str(order.createdAt);
  if (placedAt) {
    entries.push({
      id: "placed",
      kind: "placed",
      title: "Order placed",
      detail:
        lower(order.sourceName) === "pos"
          ? "Placed at the point of sale"
          : "Placed through the online store",
      at: placedAt,
    });
  }

  for (const t of transactions) {
    if (!t.processedAt) continue;
    entries.push({
      id: `txn-${t.id}`,
      kind: "payment",
      title: `${titleCaseWords(t.kind)} ${lower(t.status) === "success" ? "succeeded" : lower(t.status)}`,
      detail: t.gateway ? `via ${t.gateway}` : undefined,
      at: t.processedAt,
      amount: t.amount,
    });
  }

  for (const f of fulfillments) {
    if (f.createdAt) {
      const count = f.items.reduce((n, i) => n + i.quantity, 0);
      entries.push({
        id: `ful-${f.id}`,
        kind: "fulfillment",
        title: "Shipment created",
        detail: [
          count ? `${count} item${count === 1 ? "" : "s"}` : "",
          f.trackingCompany ? `via ${f.trackingCompany}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        at: f.createdAt,
        reference: f.trackingNumber || undefined,
        referenceUrl: f.trackingUrl || undefined,
      });
    }
    if (f.deliveredAt) {
      entries.push({
        id: `del-${f.id}`,
        kind: "delivery",
        title: "Delivered",
        detail: f.trackingCompany ? `by ${f.trackingCompany}` : undefined,
        at: f.deliveredAt,
        reference: f.trackingNumber || undefined,
        referenceUrl: f.trackingUrl || undefined,
      });
    }
  }

  for (const r of refunds) {
    if (!r.createdAt) continue;
    entries.push({
      id: `ref-${r.id}`,
      kind: "refund",
      title: "Refund issued",
      detail: r.note || undefined,
      at: r.createdAt,
      amount: r.amount,
    });
  }

  const cancelledAt = str(order.cancelledAt);
  if (cancelledAt) {
    entries.push({
      id: "cancelled",
      kind: "cancelled",
      title: "Order cancelled",
      detail: order.cancelReason
        ? `Reason: ${titleCaseWords(str(order.cancelReason))}`
        : undefined,
      at: cancelledAt,
    });
  }

  // Shopify's own log fills the gaps the typed records don't cover (notes,
  // emails sent, staff edits).
  for (const e of connNodes(order.events)) {
    const at = str(e.createdAt);
    if (!at) continue;
    entries.push({
      id: `evt-${str(e.id)}`,
      kind: "event",
      title: str(e.message).replace(/<[^>]*>/g, "") || "Activity",
      at,
    });
  }

  return entries.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export async function readOrderDetail(
  id: string,
): Promise<{ order?: OrderDetail; error?: string }> {
  const res = await shopifyQuery<{ order: Record<string, unknown> | null }>(
    ORDER_DETAIL_QUERY,
    { id: toGid("Order", id) },
  );
  if (!res.ok) return { error: res.error };

  const o = res.data?.order;
  if (!o) return { error: "That order no longer exists in Shopify." };

  const lineItems: OrderLineItem[] = connNodes(o.lineItems).map((l) => ({
    id: fromGid(l.id),
    title: str(l.title),
    variantTitle: str(l.variantTitle),
    sku: str(l.sku),
    quantity: num(l.quantity),
    total: money(l, "discountedTotalSet"),
  }));

  const fulfillments: OrderFulfillment[] = list(o.fulfillments).map((f) => {
    const tracking = list(f.trackingInfo)[0] ?? {};
    return {
      id: fromGid(f.id),
      status: lower(f.status),
      displayStatus: titleCaseWords(str(f.displayStatus)),
      createdAt: str(f.createdAt),
      deliveredAt: str(f.deliveredAt),
      estimatedDeliveryAt: str(f.estimatedDeliveryAt),
      trackingCompany: str(tracking.company),
      trackingNumber: str(tracking.number),
      trackingUrl: str(tracking.url),
      items: connNodes(f.fulfillmentLineItems).map((fl) => ({
        title: str(get(fl, "lineItem", "title")),
        sku: str(get(fl, "lineItem", "sku")),
        quantity: num(fl.quantity),
      })),
    };
  });

  const transactions: OrderTransaction[] = list(o.transactions).map((t) => ({
    id: fromGid(t.id),
    kind: lower(t.kind),
    status: lower(t.status),
    gateway: str(t.gateway),
    processedAt: str(t.processedAt),
    amount: money(t, "amountSet"),
  }));

  const refunds: OrderRefund[] = list(o.refunds).map((r) => ({
    id: fromGid(r.id),
    createdAt: str(r.createdAt),
    note: str(r.note),
    amount: money(r, "totalRefundedSet"),
  }));

  const order: OrderDetail = {
    id: fromGid(o.id),
    number: str(o.name),
    createdAt: str(o.createdAt),
    processedAt: str(o.processedAt),
    cancelledAt: str(o.cancelledAt),
    cancelReason: str(o.cancelReason),
    closedAt: str(o.closedAt),
    channel: lower(o.sourceName) === "pos" ? "pos" : "online",
    note: str(o.note),
    tags: Array.isArray(o.tags) ? o.tags.map(str).filter(Boolean) : [],
    payment: PAYMENT_MAP[lower(o.displayFinancialStatus)] ?? "pending",
    fulfillment: FULFILLMENT_MAP[lower(o.displayFulfillmentStatus)] ?? "unfulfilled",
    customer: {
      name: str(get(o, "customer", "displayName")) || "Guest",
      email: str(get(o, "customer", "email")) || str(o.email),
      phone: str(get(o, "customer", "phone")) || str(o.phone),
    },
    shippingAddress: formatAddress(o.shippingAddress),
    totals: {
      subtotal: money(o, "subtotalPriceSet"),
      shipping: money(o, "totalShippingPriceSet"),
      tax: money(o, "totalTaxSet"),
      total: money(o, "totalPriceSet"),
      refunded: money(o, "totalRefundedSet"),
    },
    lineItems,
    fulfillments,
    transactions,
    refunds,
    timeline: buildTimeline(o, fulfillments, transactions, refunds),
  };

  return { order };
}
