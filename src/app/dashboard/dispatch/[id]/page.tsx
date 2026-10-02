import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { getLoadSheetDetail } from "@/lib/load-sheet-detail";
import { LoadSheetDetailView } from "@/components/dashboard/load-sheet-detail";

export const metadata: Metadata = { title: "Load sheet" };

/** One outgoing load sheet: its parcels, totals, stage controls, and a link to the printable manifest. */
export default async function LoadSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePage("/dashboard/dispatch");
  const { id } = await params;
  const { detail, error } = await getLoadSheetDetail(id);
  return <LoadSheetDetailView id={id} detail={detail ?? null} error={error ?? null} />;
}
