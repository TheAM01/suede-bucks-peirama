import "server-only";
import { shopifyQuery } from "./shopify-client";
import type { Row } from "@/config/resource-types";

/**
 * Live Shopify reads: one GraphQL query + row mapper per resource, shaped to
 * the columns/fields declared in `src/config/resources.ts`. Every fetch is
 * defensive — a schema/scope error surfaces as `{ rows: [], error }`, never a
 * crash and never placeholder data.
 */

export interface ShopifyReadResult {
  rows: Row[];
  error?: string;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (v == null ? "" : String(v));
const lower = (v: unknown): string => str(v).toLowerCase();
const date = (v: unknown): string => str(v).slice(0, 10);

/** `gid://shopify/Product/123` → `123` (keeps rows/table keys tidy). */
const gid = (v: unknown): string => {
  const s = str(v);
  const i = s.lastIndexOf("/");
  return i === -1 ? s : s.slice(i + 1);
};

type Node = Record<string, unknown>;
const nodes = (data: unknown, key: string): Record<string, unknown>[] => {
  const conn = (data as Record<string, unknown> | null)?.[key] as
    | { nodes?: unknown[] }
    | undefined;
  return (conn?.nodes ?? []) as Record<string, unknown>[];
};
const get = (o: unknown, ...path: string[]): unknown => {
  let cur: unknown = o;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
};

// --- per-resource fetchers ---------------------------------------------------

async function readProducts(): Promise<ShopifyReadResult> {
  const q = `{
    products(first: 100, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id title vendor productType status totalInventory description
        variants(first: 1) { nodes { sku price inventoryItem { unitCost { amount } } } }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "products").map((p): Row => {
    const v = (get(p, "variants", "nodes") as Node[] | undefined)?.[0];
    return {
      id: gid(p.id),
      name: str(p.title),
      sku: str(get(v, "sku")),
      category: str(p.productType) || "Uncategorized",
      vendor: str(p.vendor),
      price: num(get(v, "price")),
      cost: num(get(v, "inventoryItem", "unitCost", "amount")),
      stock: num(p.totalInventory),
      status: lower(p.status),
      description: str(p.description),
    };
  });
  return { rows };
}

async function readCustomers(): Promise<ShopifyReadResult> {
  const q = `{
    customers(first: 100, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id displayName email state numberOfOrders createdAt note
        amountSpent { amount }
        defaultAddress { city country }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const stateMap: Record<string, string> = {
    enabled: "active",
    invited: "invited",
    disabled: "disabled",
    declined: "disabled",
  };
  const rows = nodes(res.data, "customers").map((c): Row => {
    const city = str(get(c, "defaultAddress", "city"));
    const country = str(get(c, "defaultAddress", "country"));
    return {
      id: gid(c.id),
      name: str(c.displayName),
      email: str(c.email),
      status: stateMap[lower(c.state)] ?? "active",
      location: [city, country].filter(Boolean).join(", "),
      orders: num(c.numberOfOrders),
      spent: num(get(c, "amountSpent", "amount")),
      createdAt: date(c.createdAt),
      notes: str(c.note),
    };
  });
  return { rows };
}

async function readOrders(): Promise<ShopifyReadResult> {
  const q = `{
    orders(first: 100, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id name createdAt sourceName note subtotalLineItemsQuantity
        displayFinancialStatus displayFulfillmentStatus
        customer { displayName }
        totalPriceSet { shopMoney { amount } }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const payMap: Record<string, string> = {
    paid: "paid",
    partially_paid: "pending",
    pending: "pending",
    authorized: "pending",
    refunded: "refunded",
    partially_refunded: "refunded",
    voided: "refunded",
  };
  const fulMap: Record<string, string> = {
    fulfilled: "fulfilled",
    partially_fulfilled: "partial",
    unfulfilled: "unfulfilled",
    scheduled: "unfulfilled",
    on_hold: "unfulfilled",
  };
  const rows = nodes(res.data, "orders").map((o): Row => ({
    id: gid(o.id),
    number: str(o.name),
    customer: str(get(o, "customer", "displayName")) || "Guest",
    total: num(get(o, "totalPriceSet", "shopMoney", "amount")),
    items: num(o.subtotalLineItemsQuantity),
    payment: payMap[lower(o.displayFinancialStatus)] ?? "pending",
    fulfillment: fulMap[lower(o.displayFulfillmentStatus)] ?? "unfulfilled",
    channel: lower(o.sourceName) === "pos" ? "pos" : "online",
    createdAt: date(o.createdAt),
    notes: str(o.note),
  }));
  return { rows };
}

async function readCollections(): Promise<ShopifyReadResult> {
  const q = `{
    collections(first: 100, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id title description updatedAt
        productsCount { count }
        ruleSet { rules { column } }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "collections").map((c): Row => ({
    id: gid(c.id),
    name: str(c.title),
    type: get(c, "ruleSet") ? "automated" : "manual",
    products: num(get(c, "productsCount", "count")),
    status: "active",
    description: str(c.description),
    updatedAt: date(c.updatedAt),
  }));
  return { rows };
}

async function readInventory(): Promise<ShopifyReadResult> {
  const q = `{
    productVariants(first: 100) {
      nodes {
        id sku title inventoryQuantity
        inventoryItem { id }
        product { title }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "productVariants").map((v): Row => {
    const onHand = num(v.inventoryQuantity);
    const productTitle = str(get(v, "product", "title"));
    const variantTitle = str(v.title);
    return {
      id: gid(v.id),
      inventoryItemId: gid(get(v, "inventoryItem", "id")),
      name:
        variantTitle && variantTitle !== "Default Title"
          ? `${productTitle} — ${variantTitle}`
          : productTitle,
      sku: str(v.sku),
      location: "All locations",
      onHand,
      committed: 0,
      available: onHand,
      reorderPoint: 0,
      status: onHand <= 0 ? "out" : onHand <= 5 ? "low" : "in_stock",
    };
  });
  return { rows };
}

/** Categories aren't a Shopify entity — derive from product types. */
async function readCategories(): Promise<ShopifyReadResult> {
  const q = `{ products(first: 250) { nodes { productType } } }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const counts = new Map<string, number>();
  for (const p of nodes(res.data, "products")) {
    const t = str(p.productType) || "Uncategorized";
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, products], i): Row => ({
      id: `ptype_${i}`,
      name,
      parent: "",
      products,
      status: "active",
      updatedAt: "",
      description: "Derived from Shopify product types.",
    }));
  return { rows };
}

async function readDraftOrders(): Promise<ShopifyReadResult> {
  const q = `{
    draftOrders(first: 100, reverse: true) {
      nodes {
        id name status createdAt note2
        customer { displayName }
        totalPriceSet { shopMoney { amount } }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "draftOrders").map((d): Row => ({
    id: gid(d.id),
    number: str(d.name),
    customer: str(get(d, "customer", "displayName")) || "—",
    total: num(get(d, "totalPriceSet", "shopMoney", "amount")),
    status: lower(d.status),
    createdAt: date(d.createdAt),
    notes: str(d.note2),
  }));
  return { rows };
}

async function readDiscounts(): Promise<ShopifyReadResult> {
  const q = `{
    codeDiscountNodes(first: 100) {
      nodes {
        id
        codeDiscount {
          __typename
          ... on DiscountCodeBasic {
            status summary startsAt endsAt asyncUsageCount
            codes(first: 1) { nodes { code } }
          }
          ... on DiscountCodeFreeShipping {
            status summary startsAt endsAt asyncUsageCount
            codes(first: 1) { nodes { code } }
          }
          ... on DiscountCodeBxgy {
            status summary startsAt endsAt asyncUsageCount
            codes(first: 1) { nodes { code } }
          }
        }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "codeDiscountNodes").map((n): Row => {
    const d = (n.codeDiscount ?? {}) as Record<string, unknown>;
    const typename = str(d.__typename);
    const summary = str(d.summary);
    const type =
      typename === "DiscountCodeFreeShipping"
        ? "shipping"
        : typename === "DiscountCodeBxgy"
          ? "bogo"
          : summary.includes("%")
            ? "percentage"
            : "fixed";
    const codeNodes = (get(d, "codes", "nodes") ?? []) as Record<string, unknown>[];
    const code = str(codeNodes[0]?.code);
    return {
      id: gid(n.id),
      code: code || "—",
      type,
      value: summary,
      status: lower(d.status),
      used: num(d.asyncUsageCount),
      startsAt: date(d.startsAt),
      endsAt: date(d.endsAt),
    };
  });
  return { rows };
}

async function readAbandoned(): Promise<ShopifyReadResult> {
  const q = `{
    abandonedCheckouts(first: 50) {
      nodes {
        id createdAt lineItemsQuantity
        totalPriceSet { shopMoney { amount } }
        customer { email }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "abandonedCheckouts").map((a): Row => ({
    id: gid(a.id),
    email: str(get(a, "customer", "email")) || "unknown",
    total: num(get(a, "totalPriceSet", "shopMoney", "amount")),
    items: num(a.lineItemsQuantity),
    stage: "none",
    createdAt: date(a.createdAt),
    notes: "",
  }));
  return { rows };
}

async function readTransactions(): Promise<ShopifyReadResult> {
  const q = `{
    tenderTransactions(first: 100) {
      nodes {
        id processedAt paymentMethod remoteReference test
        amount { amount }
        order { name }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "tenderTransactions").map((t): Row => {
    const amount = num(get(t, "amount", "amount"));
    return {
      id: gid(t.id),
      ref: str(t.remoteReference) || `txn_${gid(t.id)}`,
      order: str(get(t, "order", "name")) || "—",
      amount: Math.abs(amount),
      kind: amount < 0 ? "refund" : "sale",
      status: "success",
      gateway: str(t.paymentMethod) || "Unknown",
      createdAt: date(t.processedAt),
    };
  });
  return { rows };
}

async function readLocations(): Promise<ShopifyReadResult> {
  const q = `{
    locations(first: 50) {
      nodes {
        id name isActive fulfillsOnlineOrders
        address { address1 city country }
      }
    }
  }`;
  const res = await shopifyQuery(q);
  if (!res.ok) return { rows: [], error: res.error };
  const rows = nodes(res.data, "locations").map((l): Row => ({
    id: gid(l.id),
    name: str(l.name),
    type: l.fulfillsOnlineOrders ? "retail" : "warehouse",
    status: l.isActive ? "active" : "inactive",
    address: str(get(l, "address", "address1")),
    city: str(get(l, "address", "city")),
    country: str(get(l, "address", "country")),
    inventoryValue: 0,
  }));
  return { rows };
}

// --- registry ----------------------------------------------------------------

export const SHOPIFY_READERS: Record<string, () => Promise<ShopifyReadResult>> = {
  products: readProducts,
  customers: readCustomers,
  orders: readOrders,
  collections: readCollections,
  inventory: readInventory,
  categories: readCategories,
  "draft-orders": readDraftOrders,
  discounts: readDiscounts,
  abandoned: readAbandoned,
  transactions: readTransactions,
  locations: readLocations,
};
