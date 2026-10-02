import "server-only";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { APP_OWNED_COLLECTIONS, DB_UNAVAILABLE } from "./app-data";
import { shopifyQuery, toGid, fromGid, type ShopifyResult } from "./shopify-client";
import { readAppSettings } from "./app-settings";
import {
  POS_ATTR,
  POS_TAG,
  computeCart,
  paymentMethod,
  type CartLineInput,
  type Discount,
} from "@/config/pos";

/**
 * Point of sale (see src/config/pos.ts). Every money figure is recomputed here
 * from Shopify's own variant prices with `computeCart()` — the till's numbers
 * are never trusted. Cashiers prove who they are with their POS Staff PIN on
 * every sale and return.
 */

const str = (v: unknown): string => (v == null ? "" : String(v)).trim();
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (amount: number, currencyCode: string) => ({
  shopMoney: { amount: amount.toFixed(2), currencyCode },
});

// --- cashiers & registers -------------------------------------------------------------

export interface Cashier {
  id: string;
  name: string;
  role: string;
}

/** The active staff member with this PIN. PINs must be unique among active staff. */
export async function verifyCashier(pin: unknown): Promise<{ cashier?: Cashier; error?: string }> {
  const p = str(pin);
  if (!/^\d{4,8}$/.test(p)) return { error: "Enter your PIN (4–8 digits)." };
  if (!isDbConfigured()) return { error: "No database configured — connect MongoDB to use cashier PINs." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const matches = await db
      .collection(APP_OWNED_COLLECTIONS["pos-staff"])
      // Suspended staff can't sign in to the till.
      .find({ pin: p, status: { $nin: ["suspended", "inactive"] } })
      .limit(2)
      .toArray();
    if (matches.length === 0) return { error: "That PIN doesn't match an active staff member." };
    if (matches.length > 1) return { error: "Two staff members share that PIN — give each one a unique PIN on the POS Staff page." };
    const s = matches[0];
    return { cashier: { id: s._id.toHexString(), name: str(s.name) || "Staff", role: str(s.role) } };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export interface Register {
  id: string;
  name: string;
  locationId: string;
  location: string;
}

export async function getRegister(id: unknown): Promise<{ register?: Register; error?: string }> {
  const rid = str(id);
  if (!ObjectId.isValid(rid)) return { error: "Pick a register." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const r = await db.collection(APP_OWNED_COLLECTIONS.registers).findOne({ _id: new ObjectId(rid) });
    if (!r) return { error: "That register no longer exists." };
    if (r.status === "inactive") return { error: `${r.name} is switched off — turn it back on from the Registers page.` };
    if (!r.locationId) return { error: `${r.name} has no stock location — set one on the Registers page.` };
    return { register: { id: rid, name: str(r.name), locationId: str(r.locationId), location: str(r.location) } };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

/** Registers are app-owned rows; on save, the picked Shopify location's name is stored next to its id. */
export async function prepareRegister(body: Record<string, unknown>): Promise<{ body?: Record<string, unknown>; error?: string }> {
  if (!str(body.name)) return { error: "Give the register a name." };
  const locationId = str(body.locationId);
  if (!locationId) return { error: "Pick the store this register sells from — its stock is used." };
  const res = await shopifyQuery<{ location: { name: string; isActive: boolean } | null }>(
    `query($id: ID!) { location(id: $id) { name isActive } }`,
    { id: toGid("Location", locationId) },
  );
  if (!res.ok) return { error: res.error };
  if (!res.data.location) return { error: "That location no longer exists in Shopify." };
  if (!res.data.location.isActive) return { error: `${res.data.location.name} is deactivated in Shopify.` };
  return { body: { ...body, locationId, location: res.data.location.name, status: str(body.status) || "active" } };
}

// --- catalogue --------------------------------------------------------------------------

export interface CatalogItem {
  variantId: string;
  title: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  barcode: string;
  price: number;
  /** available at the register's location; null when the item isn't stocked there */
  available: number | null;
}

type CatalogPage = {
  productVariants: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: {
      id: string;
      title: string;
      sku: string | null;
      barcode: string | null;
      price: string;
      product: { title: string; status: string; isGiftCard: boolean };
      inventoryItem: { tracked: boolean; inventoryLevel: { quantities: { name: string; quantity: number }[] } | null } | null;
    }[];
  };
};

/** Every active product variant (gift cards excluded) with its price and stock at the register's location (up to 3,000). */
export async function readCatalog(locationId: string): Promise<{ items?: CatalogItem[]; error?: string }> {
  const items: CatalogItem[] = [];
  let after: string | null = null;
  for (let page = 0; page < 30; page++) {
    const res: ShopifyResult<CatalogPage> = await shopifyQuery<CatalogPage>(
      `query($after: String, $loc: ID!) {
        productVariants(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id title sku barcode price
            product { title status isGiftCard }
            inventoryItem { tracked inventoryLevel(locationId: $loc) { quantities(names: ["available"]) { name quantity } } }
          }
        }
      }`,
      { after, loc: toGid("Location", locationId) },
    );
    if (!res.ok) return { error: res.error };
    for (const v of res.data.productVariants.nodes) {
      // Gift cards are issued through Shopify itself, not sold as till items.
      if (v.product.status !== "ACTIVE" || v.product.isGiftCard) continue;
      const variantTitle = v.title === "Default Title" ? "" : v.title;
      const level = v.inventoryItem?.inventoryLevel;
      items.push({
        variantId: fromGid(v.id),
        title: variantTitle ? `${v.product.title} — ${variantTitle}` : v.product.title,
        productTitle: v.product.title,
        variantTitle,
        sku: v.sku ?? "",
        barcode: v.barcode ?? "",
        price: num(v.price),
        available: v.inventoryItem?.tracked === false ? null : level ? (level.quantities[0]?.quantity ?? 0) : null,
      });
    }
    if (!res.data.productVariants.pageInfo.hasNextPage) break;
    after = res.data.productVariants.pageInfo.endCursor;
  }
  return { items };
}

export async function searchCustomers(
  q: string,
): Promise<{ customers?: { id: string; name: string; phone: string; email: string }[]; error?: string }> {
  const term = q.trim();
  if (term.length < 2) return { customers: [] };
  const res = await shopifyQuery<{ customers: { nodes: { id: string; displayName: string; phone: string | null; email: string | null }[] } }>(
    `query($q: String!) { customers(first: 8, query: $q) { nodes { id displayName phone email } } }`,
    { q: term },
  );
  if (!res.ok) return { error: res.error };
  return {
    customers: res.data.customers.nodes.map((c) => ({
      id: fromGid(c.id),
      name: c.displayName,
      phone: c.phone ?? "",
      email: c.email ?? "",
    })),
  };
}

// --- sales ------------------------------------------------------------------------------

export interface SaleInput {
  registerId?: unknown;
  pin?: unknown;
  lines?: unknown;
  cartDiscount?: unknown;
  customer?: unknown;
  payment?: unknown;
  /** exchange: the credit from a return just made on another POS sale */
  exchange?: unknown;
  note?: unknown;
}

function parseDiscount(v: unknown): Discount | null {
  const d = v as { type?: unknown; value?: unknown } | null;
  if (!d || (d.type !== "percent" && d.type !== "amount")) return null;
  const value = num(d.value);
  return value > 0 ? { type: d.type, value } : null;
}

export async function createSale(
  input: SaleInput,
): Promise<{ orderId?: string; name?: string; total?: number; change?: number; error?: string }> {
  const { cashier, error: cashierError } = await verifyCashier(input.pin);
  if (!cashier) return { error: cashierError };
  const { register, error: registerError } = await getRegister(input.registerId);
  if (!register) return { error: registerError };

  // Lines: Shopify's price wins; only quantity and discount come from the till.
  const raw = Array.isArray(input.lines) ? (input.lines as Record<string, unknown>[]) : [];
  if (raw.length === 0) return { error: "The cart is empty." };
  const ids = raw.map((l) => str(l.variantId)).filter(Boolean);
  const { posAllowOutOfStock } = await readAppSettings();
  const priced = await shopifyQuery<{
    nodes: ({
      id: string;
      price: string;
      title: string;
      sku: string | null;
      product: { title: string };
      inventoryItem: { tracked: boolean; inventoryLevel: { quantities: { quantity: number }[] } | null } | null;
    } | null)[];
  }>(
    `query($ids: [ID!]!, $loc: ID!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id price title sku product { title }
          inventoryItem { tracked inventoryLevel(locationId: $loc) { quantities(names: ["available"]) { quantity } } }
        }
      }
    }`,
    { ids: ids.map((id) => toGid("ProductVariant", id)), loc: toGid("Location", register.locationId) },
  );
  if (!priced.ok) return { error: priced.error };
  const byId = new Map(priced.data.nodes.filter(Boolean).map((v) => [fromGid(v!.id), v!]));
  const lines: CartLineInput[] = [];
  for (const l of raw) {
    const v = byId.get(str(l.variantId));
    if (!v) return { error: "An item in the cart no longer exists in Shopify — remove it and scan it again." };
    const quantity = Math.floor(num(l.quantity));
    if (quantity < 1) return { error: "Quantities must be at least 1." };
    // Settings → Till: when out-of-stock sales are off, the live count at this store is the limit.
    if (!posAllowOutOfStock && v.inventoryItem?.tracked !== false) {
      const available = v.inventoryItem?.inventoryLevel?.quantities[0]?.quantity ?? 0;
      if (quantity > available) {
        const name = v.title === "Default Title" ? v.product.title : `${v.product.title} — ${v.title}`;
        return {
          error: available > 0
            ? `Only ${available} of ${name} in stock at ${register.location} — selling out-of-stock items is turned off in Settings.`
            : `${name} is out of stock at ${register.location} — selling out-of-stock items is turned off in Settings.`,
        };
      }
    }
    lines.push({
      variantId: str(l.variantId),
      title: v.title === "Default Title" ? v.product.title : `${v.product.title} — ${v.title}`,
      sku: v.sku ?? "",
      unitPrice: num(v.price),
      quantity,
      discount: parseDiscount(l.discount),
    });
  }

  const exchange = input.exchange as { orderName?: unknown; credit?: unknown } | null;
  const credit = exchange ? Math.max(0, num(exchange.credit)) : 0;
  const totals = computeCart(lines, parseDiscount(input.cartDiscount), credit);

  const pay = input.payment as { method?: unknown; tendered?: unknown; reference?: unknown } | null;
  const method = paymentMethod(pay?.method);
  if (!method) return { error: "Pick how the customer paid." };
  const reference = str(pay?.reference);
  const tendered = num(pay?.tendered);
  if (method.value === "cash" && totals.total > 0 && tendered < totals.total) {
    return { error: `Cash received is less than the total (${totals.total.toFixed(2)}).` };
  }
  const change = method.value === "cash" ? Math.max(0, tendered - totals.total) : 0;

  const shop = await shopifyQuery<{ shop: { currencyCode: string } }>(`{ shop { currencyCode } }`);
  if (!shop.ok) return { error: shop.error };
  const currency = shop.data.shop.currencyCode;

  // Customer: an existing one, a new one (name / phone / email), or a walk-in.
  const c = input.customer as { id?: unknown; firstName?: unknown; lastName?: unknown; phone?: unknown; email?: unknown } | null;
  let customer: Record<string, unknown> | undefined;
  if (c && str(c.id)) customer = { toAssociate: { id: toGid("Customer", str(c.id)) } };
  else if (c && (str(c.firstName) || str(c.phone) || str(c.email))) {
    customer = {
      toUpsert: {
        firstName: str(c.firstName) || undefined,
        lastName: str(c.lastName) || undefined,
        phone: str(c.phone) || undefined,
        email: str(c.email) || undefined,
      },
    };
  }

  const offTotal = Math.round((totals.cartDiscount + totals.credit) * 100) / 100;
  const discountCode =
    offTotal > 0
      ? {
          itemFixedDiscountCode: {
            code: totals.credit > 0 ? `EXCHANGE ${str(exchange?.orderName)}`.trim() : "POS DISCOUNT",
            amountSet: money(offTotal, currency),
          },
        }
      : undefined;

  const attributes: [string, string][] = [
    [POS_ATTR.register, register.name],
    [POS_ATTR.location, register.location],
    [POS_ATTR.cashier, cashier.name],
    [POS_ATTR.payment, method.label],
  ];
  if (reference) attributes.push([POS_ATTR.reference, reference]);
  if (method.value === "cash") {
    attributes.push([POS_ATTR.tendered, tendered.toFixed(2)], [POS_ATTR.change, change.toFixed(2)]);
  }
  if (totals.lineDiscounts + totals.cartDiscount > 0) {
    attributes.push([POS_ATTR.discount, (totals.lineDiscounts + totals.cartDiscount).toFixed(2)]);
  }
  if (totals.credit > 0) attributes.push([POS_ATTR.exchange, `${str(exchange?.orderName)} (credit ${totals.credit.toFixed(2)})`]);

  const order = {
    currency,
    tags: [POS_TAG, `register:${register.name}`, `cashier:${cashier.name}`],
    note: str(input.note) || undefined,
    customer,
    customAttributes: attributes.map(([key, value]) => ({ key, value })),
    lineItems: totals.lines.map((l) => ({
      variantId: toGid("ProductVariant", l.variantId),
      quantity: l.quantity,
      priceSet: money(l.discountedUnit, currency),
      properties: l.discountAmount > 0
        ? [
            { name: "Original price", value: l.unitPrice.toFixed(2) },
            { name: "Line discount", value: l.discountAmount.toFixed(2) },
          ]
        : [],
    })),
    discountCode,
    financialStatus: "PAID",
    transactions:
      totals.total > 0
        ? [{ kind: "SALE", status: "SUCCESS", gateway: method.gateway, amountSet: money(totals.total, currency) }]
        : [],
    // Handed over at the counter: fulfilled from the register's location, so stock comes off there.
    fulfillmentStatus: "FULFILLED",
    fulfillment: { locationId: toGid("Location", register.locationId), notifyCustomer: false },
  };

  const res = await shopifyQuery<{
    orderCreate: { order: { id: string; name: string } | null; userErrors: { message: string }[] } | null;
  }>(
    `mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
      orderCreate(order: $order, options: $options) {
        order { id name }
        userErrors { field message }
      }
    }`,
    {
      order,
      // When out-of-stock sales are allowed the item is in hand, so sell it even if
      // Shopify's count says 0; otherwise let Shopify enforce the product's policy too.
      options: {
        inventoryBehaviour: posAllowOutOfStock ? "DECREMENT_IGNORING_POLICY" : "DECREMENT_OBEYING_POLICY",
        sendReceipt: false,
        sendFulfillmentReceipt: false,
      },
    },
  );
  if (!res.ok) return { error: res.error };
  const errs = res.data.orderCreate?.userErrors ?? [];
  if (errs.length) return { error: errs.map((e) => e.message).join("; ") };
  const created = res.data.orderCreate?.order;
  if (!created) return { error: "Shopify didn't return the new order." };
  return { orderId: fromGid(created.id), name: created.name, total: totals.total, change };
}

// --- returns & exchanges ------------------------------------------------------------------

export interface ReturnableLine {
  lineItemId: string;
  title: string;
  sku: string;
  quantity: number;
  refundable: number;
  /** what one unit cost after discounts */
  unitPaid: number;
}

export async function lookupSale(
  number: string,
): Promise<{ sale?: { orderId: string; name: string; isPos: boolean; createdAt: string; customer: string; lines: ReturnableLine[] }; error?: string }> {
  const name = number.trim().replace(/^#/, "");
  if (!name) return { error: "Enter or scan the receipt's order number." };
  const res = await shopifyQuery<{
    orders: {
      nodes: {
        id: string;
        name: string;
        createdAt: string;
        tags: string[];
        sourceName: string | null;
        customer: { displayName: string } | null;
        lineItems: { nodes: { id: string; title: string; variantTitle: string | null; sku: string | null; quantity: number; refundableQuantity: number; discountedTotalSet: { shopMoney: { amount: string } } }[] };
      }[];
    };
  }>(
    `query($q: String!) {
      orders(first: 1, query: $q) {
        nodes {
          id name createdAt tags sourceName
          customer { displayName }
          lineItems(first: 100) { nodes { id title variantTitle sku quantity refundableQuantity discountedTotalSet { shopMoney { amount } } } }
        }
      }
    }`,
    { q: `name:${name}` },
  );
  if (!res.ok) return { error: res.error };
  const o = res.data.orders.nodes[0];
  if (!o) return { error: `No order ${name}.` };
  return {
    sale: {
      orderId: fromGid(o.id),
      name: o.name,
      isPos: o.tags.map((t) => t.toLowerCase()).includes(POS_TAG) || (o.sourceName ?? "").toLowerCase() === "pos",
      createdAt: o.createdAt,
      customer: o.customer?.displayName ?? "",
      lines: o.lineItems.nodes.map((l) => ({
        lineItemId: fromGid(l.id),
        title: l.variantTitle && l.variantTitle !== "Default Title" ? `${l.title} — ${l.variantTitle}` : l.title,
        sku: l.sku ?? "",
        quantity: l.quantity,
        refundable: l.refundableQuantity,
        unitPaid: l.quantity ? num(l.discountedTotalSet.shopMoney.amount) / l.quantity : 0,
      })),
    },
  };
}

export async function createReturn(input: {
  orderId?: unknown;
  orderName?: unknown;
  registerId?: unknown;
  pin?: unknown;
  lines?: unknown;
  /** "refund" (money back through the original payment) or "exchange" (store credit for a new sale) */
  mode?: unknown;
  /** how the money was physically given back (cash / card / wallet) — recorded in the note */
  refundAs?: unknown;
}): Promise<{ amount?: number; mode?: string; error?: string }> {
  const { cashier, error: cashierError } = await verifyCashier(input.pin);
  if (!cashier) return { error: cashierError };
  const { register, error: registerError } = await getRegister(input.registerId);
  if (!register) return { error: registerError };
  const orderId = str(input.orderId);
  if (!orderId) return { error: "Look up the sale first." };
  const mode = input.mode === "exchange" ? "exchange" : "refund";

  const raw = Array.isArray(input.lines) ? (input.lines as Record<string, unknown>[]) : [];
  const refundLineItems = raw
    .map((l) => ({ lineItemId: toGid("LineItem", str(l.lineItemId)), quantity: Math.floor(num(l.quantity)) }))
    .filter((l) => l.quantity > 0);
  if (refundLineItems.length === 0) return { error: "Pick at least one item to return." };

  // Shopify works out what those items are worth (discounts included) and which payment to refund.
  const suggested = await shopifyQuery<{
    order: {
      suggestedRefund: {
        amountSet: { shopMoney: { amount: string } };
        suggestedTransactions: { gateway: string; amountSet: { shopMoney: { amount: string } }; parentTransaction: { id: string } | null }[];
      };
    } | null;
  }>(
    `query($id: ID!, $li: [RefundLineItemInput!]) {
      order(id: $id) {
        suggestedRefund(refundLineItems: $li) {
          amountSet { shopMoney { amount } }
          suggestedTransactions { gateway amountSet { shopMoney { amount } } parentTransaction { id } }
        }
      }
    }`,
    { id: toGid("Order", orderId), li: refundLineItems },
  );
  if (!suggested.ok) return { error: suggested.error };
  if (!suggested.data.order) return { error: "That order no longer exists." };
  const s = suggested.data.order.suggestedRefund;
  const amount = num(s.amountSet.shopMoney.amount);

  const refundAs = paymentMethod(input.refundAs)?.label ?? "the original payment";
  const note =
    mode === "exchange"
      ? `Exchange at ${register.name} by ${cashier.name} — ${amount.toFixed(2)} credited to a new sale`
      : `Returned at ${register.name} by ${cashier.name} — refunded as ${refundAs}`;

  const res = await shopifyQuery<{ refundCreate: { refund: { id: string } | null; userErrors: { message: string }[] } | null }>(
    `mutation($input: RefundInput!) {
      refundCreate(input: $input) { refund { id } userErrors { field message } }
    }`,
    {
      input: {
        orderId: toGid("Order", orderId),
        note,
        notify: false,
        // Items go back on the shelf at this register's store.
        refundLineItems: refundLineItems.map((l) => ({
          ...l,
          restockType: "RETURN",
          locationId: toGid("Location", register.locationId),
        })),
        // Exchange: no money leaves — the value becomes credit on the next sale.
        transactions:
          mode === "exchange"
            ? []
            : s.suggestedTransactions
                .filter((t) => num(t.amountSet.shopMoney.amount) > 0)
                .map((t) => ({
                  orderId: toGid("Order", orderId),
                  kind: "REFUND",
                  gateway: t.gateway,
                  amount: t.amountSet.shopMoney.amount,
                  parentId: t.parentTransaction?.id,
                })),
      },
    },
  );
  if (!res.ok) return { error: res.error };
  const errs = res.data.refundCreate?.userErrors ?? [];
  if (errs.length) return { error: errs.map((e) => e.message).join("; ") };
  return { amount, mode };
}
