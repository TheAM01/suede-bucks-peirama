import "server-only";
import { shopifyQuery, toGid, fromGid } from "./shopify-client";
import { isPosOrder } from "@/config/pos";

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
  | "event"
  /** this app's own workflow step (Orders tab moves, packaging, dispatch) */
  | "ops";

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

export interface ShippingAddressFields {
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  provinceCode: string;
  zip: string;
  country: string;
  countryCode: string;
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
  /** order attributes — the till writes register, cashier, and payment details here (POS_ATTR) */
  attributes: { key: string; value: string }[];
  tags: string[];
  payment: string;
  fulfillment: string;
  /** who this order is for — the name entered on the order (shipping, then billing), not the account's */
  customer: { name: string; email: string; phone: string };
  /** the Shopify customer account the order is linked to; null for guest checkouts */
  customerProfile: CustomerProfile | null;
  shippingAddress: string;
  /** the structured address, for the Modify form and the address check */
  shippingAddressFields: ShippingAddressFields | null;
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

/** One name a customer has gone by, and where it was seen. */
export interface CustomerAlias {
  name: string;
  /** how many of the customer's recent orders used it (shipping or billing name) */
  orders: number;
  isAccountName: boolean;
  /** this order used it */
  onThisOrder: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  numberOfOrders: number;
  amountSpent: number;
  createdAt: string;
  tags: string[];
  note: string;
  location: string;
  /** every distinct name on the account, its saved addresses, and its last 50 orders */
  aliases: CustomerAlias[];
}

/** The name typed on the order itself: shipping name, else billing name. */
function orderName(o: unknown): string {
  return str(get(o, "shippingAddress", "name")).trim() || str(get(o, "billingAddress", "name")).trim();
}

const aliasKey = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();

function buildProfile(o: Record<string, unknown>): CustomerProfile | null {
  const c = o.customer as Record<string, unknown> | null | undefined;
  if (!c) return null;
  const accountName = str(c.displayName).trim();
  const thisOrder = new Set([str(get(o, "shippingAddress", "name")), str(get(o, "billingAddress", "name"))].map(aliasKey));

  // Each distinct name (case/space-insensitive), counting the orders that used it.
  const aliases = new Map<string, CustomerAlias>();
  const see = (raw: string, orderId?: string, counted?: Set<string>) => {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) return;
    const k = aliasKey(name);
    const a = aliases.get(k) ?? { name, orders: 0, isAccountName: false, onThisOrder: thisOrder.has(k) };
    if (orderId && counted && !counted.has(k)) {
      a.orders += 1;
      counted.add(k);
    }
    aliases.set(k, a);
  };
  see(accountName);
  see(`${str(c.firstName)} ${str(c.lastName)}`);
  for (const a of list(c.addresses)) see(str(a.name));
  for (const ord of connNodes(c.orders)) {
    const counted = new Set<string>();
    see(str(get(ord, "shippingAddress", "name")), str(ord.id), counted);
    see(str(get(ord, "billingAddress", "name")), str(ord.id), counted);
  }
  const accountKey = aliasKey(accountName);
  if (aliases.has(accountKey)) aliases.get(accountKey)!.isAccountName = true;

  return {
    id: fromGid(c.id),
    name: accountName || "Unnamed customer",
    email: str(c.email),
    phone: str(c.phone),
    numberOfOrders: num(c.numberOfOrders),
    amountSpent: num(get(c, "amountSpent", "amount")),
    createdAt: str(c.createdAt),
    tags: Array.isArray(c.tags) ? c.tags.map(str).filter(Boolean) : [],
    note: str(c.note),
    location: [str(get(c, "defaultAddress", "city")), str(get(c, "defaultAddress", "country"))].filter(Boolean).join(", "),
    aliases: [...aliases.values()].sort(
      (a, b) => Number(b.isAccountName) - Number(a.isAccountName) || b.orders - a.orders || a.name.localeCompare(b.name),
    ),
  };
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
    customAttributes { key value }
    displayFinancialStatus displayFulfillmentStatus
    customer {
      id displayName firstName lastName email phone numberOfOrders createdAt tags note
      amountSpent { amount }
      defaultAddress { city country }
      addresses(first: 20) { name }
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        nodes { id shippingAddress { name } billingAddress { name } }
      }
    }
    shippingAddress { name firstName lastName phone address1 address2 city province provinceCode zip country countryCodeV2 }
    billingAddress { name }
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

function addressFields(a: unknown): ShippingAddressFields | null {
  if (!a || typeof a !== "object") return null;
  return {
    firstName: str(get(a, "firstName")),
    lastName: str(get(a, "lastName")),
    phone: str(get(a, "phone")),
    address1: str(get(a, "address1")),
    address2: str(get(a, "address2")),
    city: str(get(a, "city")),
    province: str(get(a, "province")),
    provinceCode: str(get(a, "provinceCode")),
    zip: str(get(a, "zip")),
    country: str(get(a, "country")),
    countryCode: str(get(a, "countryCodeV2")),
  };
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
    channel: isPosOrder(o.sourceName, o.tags) ? "pos" : "online",
    note: str(o.note),
    attributes: list(o.customAttributes).map((a) => ({ key: str(a.key), value: str(a.value) })),
    tags: Array.isArray(o.tags) ? o.tags.map(str).filter(Boolean) : [],
    payment: PAYMENT_MAP[lower(o.displayFinancialStatus)] ?? "pending",
    fulfillment: FULFILLMENT_MAP[lower(o.displayFulfillmentStatus)] ?? "unfulfilled",
    customer: {
      name: orderName(o) || str(get(o, "customer", "displayName")) || "Guest",
      email: str(o.email) || str(get(o, "customer", "email")),
      phone: str(get(o, "shippingAddress", "phone")) || str(o.phone) || str(get(o, "customer", "phone")),
    },
    customerProfile: buildProfile(o),
    shippingAddress: formatAddress(o.shippingAddress),
    shippingAddressFields: addressFields(o.shippingAddress),
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

// --- brief read for workflow actions -------------------------------------------

export interface OrderBrief {
  id: string;
  number: string;
  customer: string;
  gateways: string[];
  total: number;
  /** what's still unpaid — the amount a courier collects on delivery */
  outstanding: number;
  address: ShippingAddressFields | null;
}

const ORDER_BRIEF_QUERY = `query OrderBrief($id: ID!) {
  order(id: $id) {
    id name paymentGatewayNames phone
    customer { displayName phone }
    totalPriceSet { shopMoney { amount } }
    totalOutstandingSet { shopMoney { amount } }
    shippingAddress { name firstName lastName phone address1 address2 city province provinceCode zip country countryCodeV2 }
  }
}`;

/** Just what the order workflow needs (number, money, address) — far cheaper than readOrderDetail(). */
export async function readOrderBrief(
  id: string,
): Promise<{ order?: OrderBrief; error?: string }> {
  const res = await shopifyQuery<{ order: Record<string, unknown> | null }>(
    ORDER_BRIEF_QUERY,
    { id: toGid("Order", id) },
  );
  if (!res.ok) return { error: res.error };
  const o = res.data?.order;
  if (!o) return { error: "That order no longer exists in Shopify." };
  const address = addressFields(o.shippingAddress);
  if (address && !address.phone) {
    address.phone = str(o.phone) || str(get(o, "customer", "phone"));
  }
  return {
    order: {
      id: fromGid(o.id),
      number: str(o.name),
      customer: str(get(o, "shippingAddress", "name")) || str(get(o, "customer", "displayName")) || "Guest",
      gateways: Array.isArray(o.paymentGatewayNames) ? o.paymentGatewayNames.map(str) : [],
      total: money(o, "totalPriceSet"),
      outstanding: money(o, "totalOutstandingSet"),
      address,
    },
  };
}

// --- batched summaries (load sheet manifests) ---------------------------------------

export interface OrderSummary {
  id: string;
  customer: string;
  city: string;
  phone: string;
}

/**
 * Name / city / phone for many orders in one `nodes(ids:)` query per 100 —
 * a manifest shouldn't cost one Shopify call per parcel. Missing orders are
 * simply absent from the map.
 */
export async function readOrderSummaries(
  ids: string[],
): Promise<{ byId: Map<string, OrderSummary>; error?: string }> {
  const byId = new Map<string, OrderSummary>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100).map((id) => toGid("Order", id));
    const res = await shopifyQuery<{ nodes: (Record<string, unknown> | null)[] }>(
      `query($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Order {
            id phone
            customer { displayName phone }
            shippingAddress { name city phone }
          }
        }
      }`,
      { ids: chunk },
    );
    if (!res.ok) return { byId, error: res.error };
    for (const o of res.data.nodes) {
      if (!o || !o.id) continue;
      byId.set(fromGid(o.id), {
        id: fromGid(o.id),
        customer:
          str(get(o, "shippingAddress", "name")) || str(get(o, "customer", "displayName")) || "Guest",
        city: str(get(o, "shippingAddress", "city")),
        phone:
          str(get(o, "shippingAddress", "phone")) || str(o.phone) || str(get(o, "customer", "phone")),
      });
    }
  }
  return { byId };
}
