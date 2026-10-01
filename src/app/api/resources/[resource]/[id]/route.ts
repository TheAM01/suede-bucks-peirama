import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getResource } from "@/config/resources";
import { SHOPIFY_WRITERS } from "@/lib/shopify-writes";
import { isAppOwned, updateAppRow, deleteAppRow } from "@/lib/app-data";
import { updateAdjustment, deleteAdjustment } from "@/lib/stock-adjustments";
import { updateLoadSheet, deleteLoadSheet, type LoadSheetResource } from "@/lib/dispatch";
import { setOrderOps, deleteOrderOps } from "@/lib/order-ops";

export const dynamic = "force-dynamic";

async function guard(ctx: { params: Promise<{ resource: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return { fail: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const { resource, id } = await ctx.params;
  if (!getResource(resource)) {
    return { fail: NextResponse.json({ error: "unknown resource" }, { status: 404 }) };
  }
  return { resource, id };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> },
) {
  const g = await guard(ctx);
  if ("fail" in g) return g.fail;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  if (g.resource === "stock-adjustments") {
    const { row, error } = await updateAdjustment(g.id, body);
    if (error) return NextResponse.json({ error }, { status: 422 });
    return NextResponse.json({ ok: true, row });
  }

  if (g.resource === "dispatch" || g.resource === "return-load-sheets") {
    const { row, error } = await updateLoadSheet(g.resource as LoadSheetResource, g.id, body);
    if (error) return NextResponse.json({ error }, { status: 422 });
    return NextResponse.json({ ok: true, row });
  }

  if (g.resource === "orders") {
    const writer = SHOPIFY_WRITERS.orders;
    // Only touch Shopify when the note was sent — a status-only patch (bulk
    // "Move to") must not overwrite the note with "".
    if (writer?.update && "notes" in body) {
      const { error } = await writer.update(g.id, body);
      if (error) return NextResponse.json({ error }, { status: 502 });
    }
    const { error } = await setOrderOps(g.id, body.opsStatus);
    if (error) return NextResponse.json({ error }, { status: 503 });
    return NextResponse.json({ ok: true });
  }

  if (!isAppOwned(g.resource)) {
    const writer = SHOPIFY_WRITERS[g.resource];
    if (!writer?.update) {
      return NextResponse.json(
        { error: writer?.notes?.update ?? "This Shopify resource is view-only." },
        { status: 405 },
      );
    }
    const { error } = await writer.update(g.id, body);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  const { row, error } = await updateAppRow(g.resource, g.id, body);
  if (error) return NextResponse.json({ error }, { status: 503 });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> },
) {
  const g = await guard(ctx);
  if ("fail" in g) return g.fail;

  if (g.resource === "stock-adjustments") {
    const { error } = await deleteAdjustment(g.id);
    if (error) return NextResponse.json({ error }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  if (g.resource === "dispatch" || g.resource === "return-load-sheets") {
    const { error } = await deleteLoadSheet(g.resource as LoadSheetResource, g.id);
    if (error) return NextResponse.json({ error }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  if (g.resource === "orders") {
    const { error } = await SHOPIFY_WRITERS.orders.remove!(g.id);
    if (error) return NextResponse.json({ error }, { status: 502 });
    // The Shopify order is gone; its workflow record would only be an orphan.
    await deleteOrderOps(g.id);
    return NextResponse.json({ ok: true });
  }

  if (!isAppOwned(g.resource)) {
    const writer = SHOPIFY_WRITERS[g.resource];
    if (!writer?.remove) {
      return NextResponse.json(
        { error: writer?.notes?.remove ?? "This Shopify resource is view-only." },
        { status: 405 },
      );
    }
    const { error } = await writer.remove(g.id);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await deleteAppRow(g.resource, g.id);
  if (error) return NextResponse.json({ error }, { status: 503 });
  return NextResponse.json({ ok: true });
}
