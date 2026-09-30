import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { getOrderOps } from "@/lib/order-ops";
import { readOrderBrief } from "@/lib/shopify-order-detail";
import { formatCurrency } from "@/lib/utils";
import { scanPath } from "@/config/order-workflow";
import { AutoPrint } from "./auto-print";

export const metadata: Metadata = { title: "Shipping labels" };

interface Label {
  orderId: string;
  error?: string;
  number?: string;
  consignmentId?: string;
  courier?: string;
  codAmount?: number;
  name?: string;
  phone?: string;
  lines?: string[];
  qrSvg?: string;
}

/**
 * Printable shipping labels, one per page: `/print/labels?ids=1,2,3`. The QR
 * encodes this site's `/scan/<consignment id>` URL — opening it (a phone
 * camera scan) moves the order to its next stage; the in-app scanners
 * (Scan to dispatch, Scan load sheet) pull the consignment id back out of it.
 * The URL's origin is whatever host served this page, so print labels from
 * the public deployment, not localhost, or phones won't be able to open them. Customer name/address are read live
 * from Shopify (never stored app-side). Outside `/dashboard` so the sidebar
 * and bars don't print; gated by the proxy plus the session check below.
 */
export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await getCurrentUser())) redirect("/login");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const raw = (await searchParams).ids;
  const ids = String(Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  const labels: Label[] = await Promise.all(
    ids.map(async (orderId): Promise<Label> => {
      const [ops, brief] = await Promise.all([getOrderOps(orderId), readOrderBrief(orderId)]);
      if (!brief.order) return { orderId, error: brief.error ?? "Order not found." };
      const consignmentId = ops.doc?.consignmentId;
      if (!consignmentId) {
        return { orderId, number: brief.order.number, error: "No consignment assigned yet." };
      }
      const a = brief.order.address;
      return {
        orderId,
        number: brief.order.number,
        consignmentId,
        courier: ops.doc?.courier,
        codAmount: ops.doc?.codAmount ?? 0,
        name: a ? `${a.firstName} ${a.lastName}`.trim() || brief.order.customer : brief.order.customer,
        phone: a?.phone,
        lines: a
          ? [a.address1, a.address2, [a.city, a.province, a.zip].filter(Boolean).join(" "), a.country].filter(Boolean)
          : [],
        qrSvg: await QRCode.toString(`${origin}${scanPath(consignmentId)}`, {
          type: "svg",
          margin: 1,
          errorCorrectionLevel: "M",
        }),
      };
    }),
  );

  return (
    <main className="min-h-screen bg-white p-6 text-black print:p-0">
      <style>{`@page { size: 4in 6in; margin: 0.2in; } @media print { .no-print { display: none !important; } }`}</style>
      <AutoPrint ready={labels.some((l) => !l.error)} />
      {labels.length === 0 ? <p>No orders selected.</p> : null}
      <div className="flex flex-wrap gap-6 print:block">
        {labels.map((l) =>
          l.error ? (
            <div key={l.orderId} className="no-print w-[4in] rounded border border-red-400 p-4 text-sm">
              <strong>{l.number ?? l.orderId}</strong>: {l.error}
            </div>
          ) : (
            <section
              key={l.orderId}
              className="flex h-[5.6in] w-[3.6in] break-after-page flex-col border-2 border-black p-4 print:border-0"
            >
              <div className="flex items-baseline justify-between border-b-2 border-black pb-2">
                <span className="text-lg font-bold">{l.number}</span>
                <span className="text-sm font-semibold">{l.courier}</span>
              </div>
              <div
                className="mx-auto my-3 w-[2.4in] [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: l.qrSvg ?? "" }}
              />
              <p className="text-center font-mono text-base font-bold tracking-wider">{l.consignmentId}</p>
              <div className="mt-3 border-t-2 border-black pt-2">
                <p className="text-xs uppercase">Ship to</p>
                <p className="text-lg font-bold leading-tight">{l.name}</p>
                {l.lines?.map((line) => (
                  <p key={line} className="text-sm leading-snug">{line}</p>
                ))}
                {l.phone ? <p className="mt-1 text-sm font-semibold">{l.phone}</p> : null}
              </div>
              <div className="mt-auto flex items-center justify-between border-t-2 border-black pt-2">
                <span className="text-xs uppercase">Collect on delivery</span>
                <span className="text-lg font-bold">
                  {l.codAmount ? formatCurrency(l.codAmount) : "PAID"}
                </span>
              </div>
            </section>
          ),
        )}
      </div>
    </main>
  );
}
