import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readIntegrations } from "@/lib/integrations";
import { readOrderDetail } from "@/lib/shopify-order-detail";

export const dynamic = "force-dynamic";

/** Single-order detail — line items, fulfillments, payments, and timeline. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing order id" }, { status: 400 });

  const config = await readIntegrations();
  if (!config.shopify) {
    return NextResponse.json(
      { error: "No store connected — connect Shopify to view order history." },
      { status: 409 },
    );
  }

  const { order, error } = await readOrderDetail(id);
  if (error || !order) {
    return NextResponse.json({ error: error ?? "Order not found." }, { status: 502 });
  }
  return NextResponse.json({ order });
}
