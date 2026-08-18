import { NextResponse, type NextRequest } from "next/server";
import { readIntegrations } from "@/lib/integrations";
import { verifyShopifyWebhook } from "@/lib/shopify-webhooks";

export const dynamic = "force-dynamic";

/**
 * Mandatory Shopify compliance webhook: a customer (or the merchant on
 * their behalf) has requested the data this app holds on them. This app
 * never persists customer PII — everything shown in the dashboard is read
 * live from Shopify and never stored — so there is nothing to furnish
 * beyond what Shopify itself already has. Logged for an audit trail; no
 * data payload is returned here (Shopify doesn't expect one over the
 * webhook itself — furnishing data, if any existed, is a manual step for
 * the merchant).
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const config = await readIntegrations();
  const secret = config.shopify?.clientSecret;

  if (!secret || !verifyShopifyWebhook(raw, hmac, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as { customer?: { id?: number }; shop_id?: number };
  console.log(
    `[webhooks] customers/data_request received for customer ${payload.customer?.id} (shop ${payload.shop_id}) — this app stores no customer PII, nothing to furnish.`,
  );

  return NextResponse.json({ ok: true });
}
