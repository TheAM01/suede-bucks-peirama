import type { Metadata } from "next";
import { requireAccess } from "@/lib/guard";
import { can } from "@/config/permissions";
import { scanPath } from "@/config/order-workflow";
import { ScanAdvance } from "./scan-advance";

export const metadata: Metadata = { title: "Scan label" };

/**
 * Where a shipping label's QR code points. Opening it (typically a phone
 * camera scan) moves the parcel's order to its next stage — see SCAN_ADVANCE
 * in src/config/order-workflow.ts. The move happens client-side after load
 * (a POST), never during the GET render, so link previews and prefetches
 * can't advance an order. Signed-out scanners are bounced through /login and
 * brought back here by the proxy's `next` param.
 */
export default async function ScanPage({
  params,
}: {
  params: Promise<{ consignmentId: string }>;
}) {
  const { consignmentId: raw } = await params;
  const consignmentId = decodeURIComponent(raw);
  await requireAccess(scanPath(consignmentId), (u) => can(u, "orders", "manage") || can(u, "dispatch", "manage"));

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <ScanAdvance consignmentId={consignmentId} />
    </main>
  );
}
