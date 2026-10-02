import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { getDoc } from "@/lib/inventory-docs";
import { InventoryDocDetail } from "@/components/dashboard/inventory-doc-detail";

export const metadata: Metadata = { title: "Transfers" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("/dashboard/transfers");
  const { id } = await params;
  const { row, error } = await getDoc("transfers", id);
  return <InventoryDocDetail kind="transfers" id={id} initial={row ?? null} error={error ?? null} />;
}
