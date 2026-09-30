import "server-only";
import type { Row } from "@/config/resource-types";
import { getLoadSheet } from "./dispatch";
import { findBySheet } from "./order-ops";
import { readOrderSummaries } from "./shopify-order-detail";

/**
 * Everything the load sheet detail page and its printable manifest show: the
 * sheet itself plus one line per parcel on it. Parcel money (COD, value) comes
 * from each order's Create Package snapshot in `app_order_ops`; the customer's
 * name, city, and phone are read live from Shopify (this app stores no PII).
 * A Shopify failure still returns the parcels, just without those three fields.
 */

export interface SheetParcel {
  orderId: string;
  number: string;
  consignmentId: string;
  opsStatus: string;
  codAmount: number;
  total: number;
  customer: string;
  city: string;
  phone: string;
}

export interface LoadSheetDetail {
  sheet: Row;
  parcels: SheetParcel[];
  /** Shopify lookup problem — parcels are listed without customer details */
  warning?: string;
}

export async function getLoadSheetDetail(
  id: string,
): Promise<{ detail?: LoadSheetDetail; error?: string }> {
  const { row: sheet, error } = await getLoadSheet("dispatch", id);
  if (!sheet) return { error };

  const reference = String(sheet.reference ?? "");
  const ids = Array.isArray(sheet.consignmentIds) ? sheet.consignmentIds.map(String) : [];
  const found = await findBySheet(reference, ids);
  if (!found.docs) return { error: found.error };

  // Keep the sheet's own scan/attach order; strays that only reference it go last.
  const order = new Map(ids.map((c, i) => [c, i]));
  const docs = [...found.docs].sort(
    (a, b) =>
      (order.get(a.consignmentId ?? "") ?? Infinity) - (order.get(b.consignmentId ?? "") ?? Infinity),
  );

  const summaries = await readOrderSummaries(docs.map((d) => d._id));
  const parcels = docs.map((d): SheetParcel => {
    const s = summaries.byId.get(d._id);
    return {
      orderId: d._id,
      number: d.number ?? "",
      consignmentId: d.consignmentId ?? "",
      opsStatus: d.opsStatus,
      codAmount: d.codAmount ?? 0,
      total: d.total ?? 0,
      customer: s?.customer ?? "",
      city: s?.city ?? "",
      phone: s?.phone ?? "",
    };
  });

  return {
    detail: {
      sheet,
      parcels,
      warning: summaries.error ? `Customer details couldn't be loaded from Shopify: ${summaries.error}` : undefined,
    },
  };
}
