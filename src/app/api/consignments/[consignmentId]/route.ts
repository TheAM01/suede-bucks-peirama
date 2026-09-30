import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findByConsignment } from "@/lib/order-ops";
import { runOrderAction } from "@/lib/order-workflow";

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
    },
  });
}

/** Scan-to-dispatch: dispatch the order behind a scanned label QR. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if ("fail" in r) return r.fail;
  const result = await runOrderAction(r.doc._id, "dispatch", { via: "QR scan" });
  if (result.error) return NextResponse.json({ ...result, number: r.doc.number }, { status: 422 });
  return NextResponse.json({ ...result, number: r.doc.number });
}
