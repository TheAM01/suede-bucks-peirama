import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDoc } from "@/lib/inventory-docs";
import { InventoryDocDetail } from "@/components/dashboard/inventory-doc-detail";

export const metadata: Metadata = { title: "Stocktakes" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const { row, error } = await getDoc("stocktakes", id);
  return <InventoryDocDetail kind="stocktakes" id={id} initial={row ?? null} error={error ?? null} />;
}
