/**
 * Consignment ID schemas — the shape of the ID generated when an order is
 * assigned a consignment (Packaged → Finalized). Picked from a fixed list on
 * the Settings page; the choice is stored server-side (src/lib/app-settings.ts)
 * and applied by `assign_consignment` in src/lib/order-workflow.ts.
 *
 * Tokens are replaced by the order's values, reduced to uppercase letters and
 * digits so the ID stays scannable and URL-safe (it ends up in the label QR).
 * Every template carries `<ms-since-epoch>` or `<order-number>` so IDs stay unique.
 * Client-safe plain data.
 */

export const CONSIGNMENT_TOKENS = [
  { token: "<order-city>", meaning: "Shipping city, e.g. KARACHI" },
  { token: "<courier-name>", meaning: "Courier, e.g. INSTA or MANUALKARACHI" },
  { token: "<order-number>", meaning: "Shopify order number without #, e.g. 1004" },
  { token: "<ms-since-epoch>", meaning: "Milliseconds since 1970 at assignment" },
] as const;

export const CONSIGNMENT_TEMPLATES = [
  "FKHIT<order-city>V<courier-name>A<ms-since-epoch>",
  "<courier-name>-<order-city>-<ms-since-epoch>",
  "<order-city>-<order-number>-<ms-since-epoch>",
  "SB<order-number>-<courier-name>",
  "SB-<ms-since-epoch>",
] as const;

export type ConsignmentTemplate = (typeof CONSIGNMENT_TEMPLATES)[number];

export const DEFAULT_CONSIGNMENT_TEMPLATE: ConsignmentTemplate = CONSIGNMENT_TEMPLATES[0];

export function isConsignmentTemplate(v: unknown): v is ConsignmentTemplate {
  return typeof v === "string" && (CONSIGNMENT_TEMPLATES as readonly string[]).includes(v);
}

const clean = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export interface ConsignmentValues {
  city: unknown;
  courier: unknown;
  orderNumber: unknown;
  /** milliseconds since epoch */
  ms: number;
}

/** Fill a template. Empty values fall back to a placeholder so the ID's shape never collapses. */
export function renderConsignmentId(template: string, v: ConsignmentValues): string {
  return template
    .replaceAll("<order-city>", clean(v.city) || "NOCITY")
    .replaceAll("<courier-name>", clean(v.courier) || "NOCOURIER")
    .replaceAll("<order-number>", clean(v.orderNumber) || "0")
    .replaceAll("<ms-since-epoch>", String(Math.floor(v.ms)));
}

/** Example values for the Settings preview. */
export const SAMPLE_CONSIGNMENT_VALUES: Omit<ConsignmentValues, "ms"> = {
  city: "Karachi",
  courier: "Insta",
  orderNumber: "#1004",
};
