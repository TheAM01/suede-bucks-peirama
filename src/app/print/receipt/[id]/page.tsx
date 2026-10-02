import type { Metadata } from "next";
import { requireAccess } from "@/lib/guard";
import { can } from "@/config/permissions";
import { readOrderDetail } from "@/lib/shopify-order-detail";
import { shopifyQuery } from "@/lib/shopify-client";
import { POS_ATTR } from "@/config/pos";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { AutoPrint } from "../../labels/auto-print";

export const metadata: Metadata = { title: "Receipt" };

/**
 * Till receipt for an order, sized for an 80mm thermal printer (72mm printable)
 * and printed as soon as it opens. Reads the order live from Shopify, plus the
 * register / cashier / payment attributes the till stored on it. Reprintable
 * any time from the order's page.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("/print/receipt", (u) => can(u, "orders", "view") || can(u, "till", "manage"));
  const { id } = await params;
  const [{ order, error }, shop] = await Promise.all([
    readOrderDetail(id),
    shopifyQuery<{ shop: { name: string } }>(`{ shop { name } }`),
  ]);

  if (!order) {
    return <p className="p-6 font-mono text-sm">Couldn&apos;t load this receipt: {error}</p>;
  }
  const attr = (k: string) => order.attributes.find((a) => a.key === k)?.value ?? "";
  const storeName = shop.ok ? shop.data.shop.name : "Receipt";
  const discount = Number(attr(POS_ATTR.discount) || 0);
  const tendered = attr(POS_ATTR.tendered);
  const change = attr(POS_ATTR.change);

  return (
    <main className="min-h-screen bg-white p-4 text-black print:p-0">
      <style>{`@page { size: 80mm auto; margin: 4mm; } @media print { .no-print { display: none !important; } }`}</style>
      <AutoPrint ready />
      <div className="mx-auto w-[72mm] font-mono text-[11px] leading-snug">
        <div className="text-center">
          <p className="text-[15px] font-bold uppercase">{storeName}</p>
          {attr(POS_ATTR.location) ? <p>{attr(POS_ATTR.location)}</p> : null}
          <p className="mt-1">{formatDateTime(order.createdAt)}</p>
          <p className="font-bold">Receipt {order.number}</p>
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        {order.lineItems.map((l) => (
          <div key={l.id} className="mb-1">
            <p className="break-words">{l.variantTitle ? `${l.title} — ${l.variantTitle}` : l.title}</p>
            <div className="flex justify-between">
              <span>
                {l.quantity} × {formatCurrency(l.quantity ? l.total / l.quantity : 0)}
              </span>
              <span>{formatCurrency(l.total)}</span>
            </div>
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-black" />

        <Row label="Subtotal" value={formatCurrency(order.totals.subtotal)} />
        {discount > 0 ? <Row label="Discounts" value={`−${formatCurrency(discount)}`} /> : null}
        {attr(POS_ATTR.exchange) ? <Row label="Exchange credit" value={attr(POS_ATTR.exchange)} /> : null}
        {order.totals.tax > 0 ? <Row label="Tax" value={formatCurrency(order.totals.tax)} /> : null}
        <div className="mt-1 flex justify-between text-[14px] font-bold">
          <span>TOTAL</span>
          <span>{formatCurrency(order.totals.total)}</span>
        </div>
        {order.totals.refunded > 0 ? <Row label="Refunded" value={`−${formatCurrency(order.totals.refunded)}`} /> : null}

        <div className="my-2 border-t border-dashed border-black" />
        <Row label="Paid by" value={attr(POS_ATTR.payment) || "—"} />
        {attr(POS_ATTR.reference) ? <Row label="Reference" value={attr(POS_ATTR.reference)} /> : null}
        {tendered ? <Row label="Cash received" value={formatCurrency(Number(tendered))} /> : null}
        {change ? <Row label="Change" value={formatCurrency(Number(change))} /> : null}
        {order.customer.name && order.customer.name !== "Guest" ? <Row label="Customer" value={order.customer.name} /> : null}
        <Row label="Served by" value={attr(POS_ATTR.cashier) || "—"} />
        {attr(POS_ATTR.register) ? <Row label="Register" value={attr(POS_ATTR.register)} /> : null}

        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-center">Thank you for shopping with us.</p>
        <p className="text-center">Keep this receipt for returns and exchanges.</p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
