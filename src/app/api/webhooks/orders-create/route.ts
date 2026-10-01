import { NextResponse, type NextRequest } from "next/server";
import { readIntegrations } from "@/lib/integrations";
import { verifyShopifyWebhook } from "@/lib/shopify-webhooks";
import { intakeFromWebhook } from "@/lib/order-workflow";
import { recordSale, type SaleWebhookOrder } from "@/lib/inventory-ledger";

export const dynamic = "force-dynamic";

/**
 * Shopify `orders/create` webhook — order intake, plus the order's line items
 * recorded as `sale` lines in the stock movement ledger. Checks the shipping address
 * and routes the new order to Exception, Pending CC, or Active (see
 * intakeFromWebhook() in src/lib/order-workflow.ts). Registered from the
 * Integrations page. Idempotent: Shopify retries deliveries, and a repeat
 * never overwrites an order staff have already moved.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const config = await readIntegrations();
  const secret = config.shopify?.clientSecret;

  if (!secret || !verifyShopifyWebhook(raw, hmac, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: Parameters<typeof intakeFromWebhook>[0] & SaleWebhookOrder;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // The stock ledger's sale lines (best-effort, idempotent — never fails the delivery).
  await recordSale(payload);
  const { error } = await intakeFromWebhook(payload);
  // A non-2xx makes Shopify retry — right for a transient DB outage.
  if (error) return NextResponse.json({ error }, { status: 503 });
  return NextResponse.json({ ok: true });
}
