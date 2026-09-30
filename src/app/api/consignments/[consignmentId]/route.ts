import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findByConsignment } from "@/lib/order-ops";
import { runOrderAction } from "@/lib/order-workflow";
import { SCAN_ADVANCE, statusLabel } from "@/config/order-workflow";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ consignmentId: string }> };

async function resolve(ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return { fail: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const consignmentId = decodeURIComponent((await ctx.params).consignmentId).trim();
  const { doc, error } = await findByConsignment(consignmentId);
  if (error) return { fail: NextResponse.json({ error }, { status: 503 }) };
  if (!doc) {
    return {
      fail: NextResponse.json(
        { error: `No order has consignment ${consignmentId}.` },
        { status: 404 },
      ),
    };
  }
  return { doc };
}

/** Look up the parcel behind a scanned label QR (the Dispatch page's load-sheet scanner). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if ("fail" in r) return r.fail;
  const d = r.doc;
  return NextResponse.json({
    consignment: {
      orderId: d._id,
      consignmentId: d.consignmentId,
      number: d.number ?? "",
      courier: d.courier ?? "",
      opsStatus: d.opsStatus,
      codAmount: d.codAmount ?? 0,
      total: d.total ?? 0,
      loadSheet: d.loadSheet ?? "",
    },
  });
}

/**
 * Act on the order behind a scanned label QR. Default (the Orders page's
 * Scan to dispatch box): dispatch. With `{ advance: true }` (the label QR's
 * own /scan page): move it to whatever comes next for its current tab, per
 * SCAN_ADVANCE — Finalized → In Pickup & Packing → Dispatched.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if ("fail" in r) return r.fail;
  const body = (await req.json().catch(() => null)) as { advance?: unknown } | null;
  const from = r.doc.opsStatus;
  const base = { number: r.doc.number, orderId: r.doc._id, from };

  const action = body?.advance === true ? SCAN_ADVANCE[from] : "dispatch";
  if (!action) {
    return NextResponse.json(
      { ...base, error: `Nothing to do — this order is in ${statusLabel(from)}.` },
      { status: 422 },
    );
  }
  const result = await runOrderAction(r.doc._id, action, { via: "QR scan" });
  if (result.error) return NextResponse.json({ ...result, ...base }, { status: 422 });
  return NextResponse.json({ ...result, ...base });
}
