import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { canRead } from "@/config/permissions";
import { readIntegrations } from "@/lib/integrations";
import { readOrderDetail } from "@/lib/shopify-order-detail";
import { getOrderOps } from "@/lib/order-ops";

export const dynamic = "force-dynamic";

/**
 * Single-order detail — line items, fulfillments, payments, and timeline from
 * Shopify, plus the app's own workflow document (`ops`: status, address flags,
 * consignment, history). `ops` is null when the database isn't reachable —
 * the Shopify half still renders.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await apiGuard((u) => canRead(u, "orders"));
  if (g.fail) return g.fail;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing order id" }, { status: 400 });

  const config = await readIntegrations();
  if (!config.shopify) {
    return NextResponse.json(
      { error: "No store connected — connect Shopify to view order history." },
      { status: 409 },
    );
  }

  const [{ order, error }, ops] = await Promise.all([readOrderDetail(id), getOrderOps(id)]);
  if (error || !order) {
    return NextResponse.json({ error: error ?? "Order not found." }, { status: 502 });
  }
  return NextResponse.json({ order, ops: ops.doc ?? null });
}
