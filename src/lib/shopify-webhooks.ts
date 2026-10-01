import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb, isDbConfigured } from "./db";
import { APP_OWNED_COLLECTIONS } from "./app-data";
import { INVENTORY_DOC_COLLECTIONS } from "./inventory-docs";

/**
 * Shopify's three mandatory GDPR compliance webhooks
 * (customers/data_request, customers/redact, shop/redact) — required by the
 * Shopify API Terms of Service for every app, and checked as part of
 * Protected Customer Data approval. Handlers live in
 * src/app/api/webhooks/*, this module holds the shared signature
 * verification and redaction logic.
 *
 * This app never stores a customer's PII itself — names/emails/addresses
 * are always read live from Shopify, never persisted. The only trace of a
 * customer in this app's own database is their numeric id inside a
 * segment's `customerIds` list, so redaction is narrow: drop that id from
 * every segment on `customers/redact`, and clear every app-owned collection
 * on `shop/redact` (this app is single-tenant — one Shopify store per
 * deployment — so "the shop's data" is simply everything app-owned).
 */

/** Verify the raw request body against Shopify's HMAC header using the app's client secret. */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** customers/redact — drop the customer's id from every segment's membership list. */
export async function redactCustomer(customerId: string | number): Promise<void> {
  if (!isDbConfigured() || !customerId) return;
  const db = await getDb();
  if (!db) return;
  const id = String(customerId);
  await db
    .collection<{ customerIds: string[] }>(APP_OWNED_COLLECTIONS.segments)
    .updateMany({ customerIds: id }, { $pull: { customerIds: id } });
}

const REDACT_ON_UNINSTALL = [
  ...Object.values(APP_OWNED_COLLECTIONS),
  "app_stock_adjustments",
  "app_dispatch_load_sheets",
  "app_return_load_sheets",
  "app_order_ops",
  ...INVENTORY_DOC_COLLECTIONS,
  "app_stock_movements",
  "app_reorder_points",
  "app_settings",
  // Retired pages (Packages, Shipments) — their old documents are still store data.
  "app_packages",
  "app_shipments",
];

/** shop/redact — clear every app-owned collection. Single-tenant app: the shop's data is all of it. */
export async function redactShop(): Promise<void> {
  if (!isDbConfigured()) return;
  const db = await getDb();
  if (!db) return;
  await Promise.all(
    REDACT_ON_UNINSTALL.map((name) => db.collection(name).deleteMany({})),
  );
}
