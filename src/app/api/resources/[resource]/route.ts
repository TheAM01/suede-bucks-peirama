import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getResource } from "@/config/resources";
import { readIntegrations } from "@/lib/integrations";
import { SHOPIFY_READERS } from "@/lib/shopify-reads";
import { SHOPIFY_WRITERS } from "@/lib/shopify-writes";
import { isAppOwned, listAppRows, createAppRow } from "@/lib/app-data";
import { listAdjustments, createAdjustment } from "@/lib/stock-adjustments";
import { listLoadSheets, createLoadSheet, type LoadSheetResource } from "@/lib/dispatch";
import { attachOrderOps } from "@/lib/order-ops";
import { listMovements } from "@/lib/inventory-ledger";
import { createDoc, listDocs, listInbound } from "@/lib/inventory-docs";
import { listShipments, reconcileLoadSheets, validateRemittance } from "@/lib/logistics";
import { isInventoryDocKind } from "@/config/inventory-docs";
import { prepareRegister } from "@/lib/pos";

export const dynamic = "force-dynamic";

/**
 * Resource data API.
 * - App-owned resources (registers, pos-staff, segments, returns, leads,
 *   suppliers, cod-remittances): MongoDB, full CRUD. Stock adjustments, load
 *   sheets (dispatch, return-load-sheets), and inventory documents
 *   (purchase-orders, transfers, stocktakes) are MongoDB too, through their
 *   own modules. Read models: stock-movements (the ledger), inbound (open POs
 *   and transfers), shipments (consigned orders).
 * - Shopify-backed resources: live Admin API reads when connected, EMPTY when
 *   not; writes go through the SHOPIFY_WRITERS mutation registry. Resources
 *   with no writer (transactions, abandoned, categories, inventory,
 *   locations) stay read-only.
 * Never returns placeholder data.
 */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ resource: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { resource } = await ctx.params;
  if (!getResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }

  if (resource === "stock-adjustments") {
    const { rows, error } = await listAdjustments();
    return NextResponse.json({ rows, source: "db", readOnly: false, error: error ?? null });
  }

  if (resource === "dispatch" || resource === "return-load-sheets") {
    const { rows, error } = await listLoadSheets(resource as LoadSheetResource);
    return NextResponse.json({ rows, source: "db", readOnly: false, error: error ?? null });
  }

  if (isInventoryDocKind(resource)) {
    const { rows, error } = await listDocs(resource);
    return NextResponse.json({ rows, source: "db", readOnly: false, error: error ?? null });
  }

  if (resource === "stock-movements" || resource === "inbound") {
    const { rows, error } = resource === "inbound" ? await listInbound() : await listMovements();
    return NextResponse.json({ rows, source: "db", readOnly: true, error: error ?? null });
  }

  // Writable only so rows can be ticked for the Shipments control panel —
  // its config turns off create / edit / delete.
  if (resource === "shipments") {
    const { rows, error } = await listShipments();
    return NextResponse.json({ rows, source: "db", readOnly: false, error: error ?? null });
  }

  if (isAppOwned(resource)) {
    const { rows, error } = await listAppRows(resource);
    return NextResponse.json({
      rows,
      source: "db",
      readOnly: false,
      error: error ?? null,
    });
  }

  const config = await readIntegrations();
  if (!config.shopify) {
    return NextResponse.json({
      rows: [],
      source: "empty",
      readOnly: true,
      error: null,
    });
  }

  const reader = SHOPIFY_READERS[resource];
  if (!reader) {
    return NextResponse.json({ rows: [], source: "empty", readOnly: true, error: null });
  }
  const { rows: rawRows, error } = await reader();
  // Orders carries a staff-editable operational status Shopify has no field
  // for (see src/lib/order-ops.ts) — merge it in on top of the live read.
  const rows = resource === "orders" ? await attachOrderOps(rawRows) : rawRows;
  return NextResponse.json({
    rows,
    source: "shopify",
    readOnly: !SHOPIFY_WRITERS[resource],
    error: error ?? null,
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { resource } = await ctx.params;
  if (!getResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  if (resource === "stock-adjustments") {
    const { row, error } = await createAdjustment(body);
    if (error || !row) {
      return NextResponse.json({ error: error ?? "Create failed." }, { status: 422 });
    }
    return NextResponse.json({ row });
  }

  if (resource === "dispatch" || resource === "return-load-sheets") {
    const { row, error } = await createLoadSheet(resource as LoadSheetResource, body);
    if (error || !row) {
      return NextResponse.json({ error: error ?? "Create failed." }, { status: 422 });
    }
    return NextResponse.json({ row });
  }

  if (isInventoryDocKind(resource)) {
    const { row, error } = await createDoc(resource, body);
    if (error || !row) {
      return NextResponse.json({ error: error ?? "Create failed." }, { status: 422 });
    }
    return NextResponse.json({ row });
  }

  if (resource === "registers") {
    const prepared = await prepareRegister(body);
    if (!prepared.body) return NextResponse.json({ error: prepared.error }, { status: 422 });
    const { row, error } = await createAppRow(resource, prepared.body);
    if (error) return NextResponse.json({ error }, { status: 503 });
    return NextResponse.json({ row });
  }

  if (resource === "cod-remittances") {
    const invalid = validateRemittance(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 422 });
    const { row, error } = await createAppRow(resource, body);
    if (error) return NextResponse.json({ error }, { status: 503 });
    await reconcileLoadSheets(body.loadSheetIds);
    return NextResponse.json({ row });
  }

  if (!isAppOwned(resource)) {
    const writer = SHOPIFY_WRITERS[resource];
    if (!writer?.create) {
      return NextResponse.json(
        { error: writer?.notes?.create ?? "This Shopify resource is view-only." },
        { status: 405 },
      );
    }
    const { row, error } = await writer.create(body);
    if (error || !row) {
      return NextResponse.json({ error: error ?? "Create failed." }, { status: 502 });
    }
    return NextResponse.json({ row });
  }

  const { row, error } = await createAppRow(resource, body);
  if (error) return NextResponse.json({ error }, { status: 503 });
  return NextResponse.json({ row });
}
