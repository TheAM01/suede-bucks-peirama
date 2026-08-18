import { NextResponse, type NextRequest } from "next/server";
import { readIntegrations } from "@/lib/integrations";
import { verifyShopifyWebhook, redactShop } from "@/lib/shopify-webhooks";

export const dynamic = "force-dynamic";

/**
 * Mandatory Shopify compliance webhook: fired 48 hours after the merchant
 * uninstalls the app. This app is single-tenant (one Shopify store per
 * deployment), so "the shop's data" is everything app-owned — clears every
 * app-owned Mongo collection. See redactShop() in src/lib/shopify-webhooks.ts
 * for exactly what that covers.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const config = await readIntegrations();
  const secret = config.shopify?.clientSecret;

  if (!secret || !verifyShopifyWebhook(raw, hmac, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  await redactShop();

  return NextResponse.json({ ok: true });
}
