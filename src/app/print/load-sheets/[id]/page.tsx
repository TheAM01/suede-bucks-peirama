import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLoadSheetDetail } from "@/lib/load-sheet-detail";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { AutoPrint } from "../../labels/auto-print";

export const metadata: Metadata = { title: "Load sheet manifest" };

/**
 * Printable courier manifest for one outgoing load sheet — the paper the rider
 * signs at pickup: sheet facts, one line per parcel, totals, and signature
 * lines. Outside `/dashboard` so no chrome prints; gated by the proxy plus
 * the session check below. Raw black-on-white on purpose (it's paper).
 */
export default async function LoadSheetManifestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const { detail, error } = await getLoadSheetDetail(id);

  if (!detail) {
    return (
      <main className="min-h-screen bg-white p-8 text-black">
        <p>Couldn&apos;t load this load sheet: {error}</p>
      </main>
    );
  }

  const { sheet, parcels, warning } = detail;
  const cod = parcels.reduce((n, p) => n + p.codAmount, 0);
  const value = parcels.reduce((n, p) => n + p.total, 0);

  return (
    <main className="min-h-screen bg-white p-8 text-[13px] text-black print:p-0">
      <style>{`@page { size: A4; margin: 14mm; } @media print { .no-print { display: none !important; } }`}</style>
      <AutoPrint ready />
      {warning ? <p className="no-print mb-4 text-red-700">{warning}</p> : null}

      <header className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-xs uppercase tracking-wider">Peirama · courier load sheet</p>
          <h1 className="text-2xl font-bold">{String(sheet.reference)}</h1>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right">
          <dt className="text-left text-xs uppercase">Courier</dt>
          <dd className="font-semibold">{String(sheet.courier)}</dd>
          <dt className="text-left text-xs uppercase">From</dt>
          <dd>{String(sheet.location)}</dd>
          <dt className="text-left text-xs uppercase">Created</dt>
          <dd>{formatDateTime(String(sheet.createdAt))}</dd>
          <dt className="text-left text-xs uppercase">Posted</dt>
          <dd>{sheet.datePosted ? formatDateTime(String(sheet.datePosted)) : "—"}</dd>
        </dl>
      </header>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left text-xs uppercase">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">Order</th>
            <th className="py-1.5 pr-2">Consignment</th>
            <th className="py-1.5 pr-2">Customer</th>
            <th className="py-1.5 pr-2">City</th>
            <th className="py-1.5 pr-2">Phone</th>
            <th className="py-1.5 pr-2 text-right">COD</th>
          </tr>
        </thead>
        <tbody>
          {parcels.map((p, i) => (
            <tr key={p.orderId} className="break-inside-avoid border-b border-neutral-400">
              <td className="py-1.5 pr-2 tabular-nums">{i + 1}</td>
              <td className="py-1.5 pr-2 font-semibold">{p.number || p.orderId}</td>
              <td className="py-1.5 pr-2 font-mono">{p.consignmentId}</td>
              <td className="py-1.5 pr-2">{p.customer}</td>
              <td className="py-1.5 pr-2">{p.city}</td>
              <td className="py-1.5 pr-2">{p.phone}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {p.codAmount ? formatCurrency(p.codAmount) : "PAID"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold">
            <td className="py-2 pr-2" colSpan={3}>
              {parcels.length} {parcels.length === 1 ? "parcel" : "parcels"}
            </td>
            <td className="py-2 pr-2" colSpan={3}>
              Order value {formatCurrency(value)}
            </td>
            <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(cod)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-1 text-right text-xs">COD total is the cash the courier collects and pays back to the store.</p>

      {sheet.notes ? <p className="mt-4 whitespace-pre-wrap">Notes: {String(sheet.notes)}</p> : null}

      <section className="mt-12 grid grid-cols-2 gap-12 break-inside-avoid">
        {["Handed over by (store)", "Received by (rider)"].map((who) => (
          <div key={who} className="space-y-6">
            <p className="text-xs uppercase">{who}</p>
            <div className="border-b border-black pb-1">Name</div>
            <div className="border-b border-black pb-1">Signature</div>
            <div className="border-b border-black pb-1">Date / time</div>
          </div>
        ))}
      </section>
    </main>
  );
}
