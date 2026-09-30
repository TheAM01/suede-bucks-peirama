import "server-only";
import type { Row } from "@/config/resource-types";
import { findByConsignment, type OrderOpsDoc } from "./order-ops";
import { runOrderAction } from "./order-workflow";
import { postLoadSheet, resolveLoadSheet } from "./dispatch";

/**
 * Build a posted dispatch load sheet from scanned label QR codes: each code is
 * a consignment id, resolved to its order through `app_order_ops`. A parcel
 * must be In Pickup & Packing (it's dispatched onto the sheet) or already
 * Dispatched but on no sheet yet (it's just added). Totals and COD come from
 * each order's Create Package snapshot as parcels are attached, never from
 * the client. The sheet is posted at the end — that's the courier handover.
 * Lives apart from dispatch.ts so that module stays free of order-workflow
 * imports (order-workflow itself uses dispatch.ts).
 */
export async function createScannedLoadSheet(input: {
  courier?: unknown;
  location?: unknown;
  consignmentIds?: unknown;
}): Promise<{ row?: Row; error?: string; dispatchErrors?: string[] }> {
  const courier = String(input.courier ?? "").trim();
  const location = String(input.location ?? "").trim();
  if (!courier) return { error: "Pick a courier." };
  if (!location) return { error: "Pick the location this sheet dispatches from." };

  const ids = Array.isArray(input.consignmentIds)
    ? Array.from(new Set(input.consignmentIds.map((v) => String(v ?? "").trim()).filter(Boolean)))
    : [];
  if (ids.length === 0) return { error: "Scan at least one package." };

  const parcels: OrderOpsDoc[] = [];
  for (const id of ids) {
    const { doc, error } = await findByConsignment(id);
    if (error) return { error };
    if (!doc) return { error: `No order has consignment ${id}.` };
    const name = doc.number || id;
    const ready =
      doc.opsStatus === "in_pickup_packing" || (doc.opsStatus === "dispatched" && !doc.loadSheet);
    if (!ready) {
      return {
        error: doc.loadSheet
          ? `${name} is already on load sheet ${doc.loadSheet}.`
          : `${name} isn't ready for pickup (label not printed yet).`,
      };
    }
    if (doc.courier && doc.courier !== courier) {
      return { error: `${name} is booked with ${doc.courier}, not ${courier}.` };
    }
    parcels.push(doc);
  }

  const resolved = await resolveLoadSheet(courier, "new", location);
  if (!resolved.sheet) return { error: resolved.error };
  const sheetId = resolved.sheet.id;

  const dispatchErrors: string[] = [];
  for (const p of parcels) {
    const action = p.opsStatus === "in_pickup_packing" ? "dispatch" : "add_to_load_sheet";
    const res = await runOrderAction(p._id, action, { target: sheetId, via: "load sheet scan" });
    if (res.error) dispatchErrors.push(`${p.number || p.consignmentId}: ${res.error}`);
  }

  const posted = await postLoadSheet(sheetId);
  if (!posted.row) return { error: posted.error };
  return { row: posted.row, dispatchErrors };
}
