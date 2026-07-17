/**
 * Admin API access scopes the Dev Dashboard app needs. Single source of
 * truth — rendered on the Integrations page and referenced by the docs.
 * Client-safe (plain data, no secrets).
 */

/** Required for the resources this dashboard manages. */
export const SHOPIFY_SCOPES_REQUIRED = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_draft_orders",
  "write_draft_orders",
  "read_customers",
  "write_customers",
  "read_inventory",
  "write_inventory",
  "read_discounts",
  "write_discounts",
  "read_price_rules",
  "write_price_rules",
  "read_checkouts",
  "read_locations",
  "read_fulfillments",
  "write_fulfillments",
] as const;

/** Nice to have — enable if the store's plan supports them. */
export const SHOPIFY_SCOPES_OPTIONAL = [
  { scope: "read_reports", why: "Analytics aggregates" },
  { scope: "read_users", why: "POS staff (Shopify Plus / POS Pro)" },
  { scope: "read_gift_cards", why: "Gift-card balances (Plus)" },
] as const;

export const SHOPIFY_SCOPES_STRING = SHOPIFY_SCOPES_REQUIRED.join(",");
