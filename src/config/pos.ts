/**
 * Point of sale — shared by the till (client) and the sale API (server), so the
 * total a cashier sees is exactly the total charged. Client-safe plain data.
 *
 * A POS sale becomes a real Shopify order: paid, already fulfilled from the
 * register's location (stock comes off that location), tagged `pos`, with the
 * register, cashier, and payment details as order attributes. It skips the
 * shipping workflow and lands in the Orders page's "POS sale" tab.
 */

/** Tag on every order the till creates — how the rest of the app recognises POS sales. */
export const POS_TAG = "pos";

/** One payment method per sale. `gateway` is what Shopify records on the transaction. */
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", gateway: "Cash", needsReference: false },
  { value: "card", label: "Card", gateway: "Card (POS terminal)", needsReference: true },
  { value: "jazzcash", label: "JazzCash", gateway: "JazzCash", needsReference: true },
  { value: "easypaisa", label: "EasyPaisa", gateway: "EasyPaisa", needsReference: true },
  { value: "bank", label: "Bank transfer", gateway: "Bank transfer", needsReference: true },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function paymentMethod(v: unknown) {
  return PAYMENT_METHODS.find((m) => m.value === v);
}

/** Order attribute keys the till writes and the receipt / order page read back. */
export const POS_ATTR = {
  register: "POS register",
  location: "POS location",
  cashier: "POS cashier",
  payment: "POS payment",
  reference: "POS payment reference",
  tendered: "POS cash tendered",
  change: "POS change given",
  discount: "POS discount",
  exchange: "POS exchange for",
} as const;

export interface Discount {
  type: "percent" | "amount";
  value: number;
}

export interface CartLineInput {
  variantId: string;
  title: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  discount?: Discount | null;
}

export interface CartLine extends CartLineInput {
  /** what this line takes off */
  discountAmount: number;
  /** unit price after the line discount, to the cent (what Shopify is sent) */
  discountedUnit: number;
  lineTotal: number;
}

export interface CartTotals {
  lines: CartLine[];
  /** before any discounts */
  gross: number;
  lineDiscounts: number;
  /** after line discounts */
  subtotal: number;
  cartDiscount: number;
  /** exchange credit applied (from a returned sale) */
  credit: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Amount a discount takes off `base` (never more than base, never negative). */
export function discountAmount(base: number, d?: Discount | null): number {
  if (!d || !Number.isFinite(d.value) || d.value <= 0) return 0;
  const raw = d.type === "percent" ? (base * clamp(d.value, 0, 100)) / 100 : d.value;
  return round2(clamp(raw, 0, base));
}

/**
 * The cart's money: per-line discounts are folded into each line's unit price
 * (rounded to the cent, so line total = unit × qty exactly), then the cart
 * discount and any exchange credit come off the subtotal. Same function on
 * both sides of the wire.
 */
export function computeCart(lines: CartLineInput[], cartDiscount?: Discount | null, credit = 0): CartTotals {
  const out: CartLine[] = lines.map((l) => {
    const qty = Math.max(1, Math.floor(l.quantity));
    const base = round2(l.unitPrice * qty);
    const off = discountAmount(base, l.discount);
    const discountedUnit = round2((base - off) / qty);
    return { ...l, quantity: qty, discountAmount: round2(base - discountedUnit * qty), discountedUnit, lineTotal: round2(discountedUnit * qty) };
  });
  const gross = round2(out.reduce((a, l) => a + l.unitPrice * l.quantity, 0));
  const subtotal = round2(out.reduce((a, l) => a + l.lineTotal, 0));
  const cart = discountAmount(subtotal, cartDiscount);
  const appliedCredit = round2(clamp(credit, 0, subtotal - cart));
  return {
    lines: out,
    gross,
    lineDiscounts: round2(gross - subtotal),
    subtotal,
    cartDiscount: cart,
    credit: appliedCredit,
    total: round2(subtotal - cart - appliedCredit),
  };
}

/** Is this order row / payload a POS sale? (Shopify's own POS, or one our till created.) */
export function isPosOrder(sourceName: unknown, tags: unknown): boolean {
  if (String(sourceName ?? "").toLowerCase() === "pos") return true;
  const list = Array.isArray(tags) ? tags.map(String) : String(tags ?? "").split(",");
  return list.some((t) => t.trim().toLowerCase() === POS_TAG);
}
