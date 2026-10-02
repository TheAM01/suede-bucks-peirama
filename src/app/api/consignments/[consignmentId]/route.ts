import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findByConsignment } from "@/lib/order-ops";
import { runOrderAction } from "@/lib/order-workflow";
import { MANUAL_COURIER, SCAN_ADVANCE, statusLabel, type OrderAction } from "@/config/order-workflow";
import { listDraftSheets } from "@/lib/dispatch";

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
 * Scan to dispatch box, and a load sheet's own scanner): put it on a sheet —
 * dispatch it, or add it if it's already dispatched with no sheet. With
 * `{ advance: true }` (the label QR's own /scan page): whatever comes next for
 * its current tab, per SCAN_ADVANCE.
 *
 * The load sheet is never picked automatically. Without `target` (an open
 * sheet's id, or "new" with an optional `location`), a sheet step answers 409
 * `{ needsSheet: true, courier, sheets }` — the courier's open sheets — and the
 * scanner asks, then resends with `target`.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if ("fail" in r) return r.fail;
  const body = (await req.json().catch(() => null)) as
    | { advance?: unknown; target?: unknown; location?: unknown }
    | null;
  const d = r.doc;
  const from = d.opsStatus;
  const base = { number: d.number, orderId: d._id, from, courier: d.courier ?? "", consignmentId: d.consignmentId };

  let action: OrderAction | undefined;
  if (body?.advance === true) {
    action = SCAN_ADVANCE[from];
    // A rescan on delivery only fulfils the manual courier's parcels; other
    // couriers' are fulfilled from the app, never by a stray scan.
    if (action === "mark_fulfilled" && d.courier !== MANUAL_COURIER) action = undefined;
  } else {
    action = from === "dispatched" && !d.loadSheet ? "add_to_load_sheet" : "dispatch";
  }
  if (!action) {
    return NextResponse.json(
      { ...base, error: `Nothing to do — this order is in ${statusLabel(from)}.` },
      { status: 422 },
    );
  }

  const target = typeof body?.target === "string" ? body.target : "";
  if ((action === "dispatch" || action === "add_to_load_sheet") && !target) {
    if (action === "dispatch" && from !== "in_pickup_packing") {
      return NextResponse.json(
        { ...base, error: d.loadSheet ? `Already on load sheet ${d.loadSheet}.` : `Can't dispatch an order that's in ${statusLabel(from)}.` },
        { status: 422 },
      );
    }
    const { sheets, error } = await listDraftSheets(d.courier ?? "");
    if (error) return NextResponse.json({ ...base, error }, { status: 503 });
    return NextResponse.json({ ...base, needsSheet: true, action, sheets }, { status: 409 });
  }

  const result = await runOrderAction(d._id, action, {
    via: "QR scan",
    target,
    location: typeof body?.location === "string" ? body.location : undefined,
  });
  if (result.error) return NextResponse.json({ ...result, ...base }, { status: 422 });
  return NextResponse.json({ ...result, ...base });
}
