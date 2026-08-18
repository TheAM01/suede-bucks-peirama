import { NextResponse, type NextRequest } from "next/server";
import { readIntegrations } from "@/lib/integrations";
import { verifyShopifyWebhook, redactCustomer } from "@/lib/shopify-webhooks";

export const dynamic = "force-dynamic";

/**
 * Mandatory Shopify compliance webhook: erase a specific customer's data,
 * fired ~10 days after a deletion request (or sooner for stores under GDPR).
 * This app's only trace of a customer is their id inside a segment's
 * `customerIds` list — see redactCustomer() in src/lib/shopify-webhooks.ts.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const config = await readIntegrations();
  const secret = config.shopify?.clientSecret;

  if (!secret || !verifyShopifyWebhook(raw, hmac, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as { customer?: { id?: number } };
  if (payload.customer?.id) {
    await redactCustomer(payload.customer.id);
  }

  return NextResponse.json({ ok: true });
}
