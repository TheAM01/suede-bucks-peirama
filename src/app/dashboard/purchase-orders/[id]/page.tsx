import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDoc } from "@/lib/inventory-docs";
import { InventoryDocDetail } from "@/components/dashboard/inventory-doc-detail";

export const metadata: Metadata = { title: "Purchase Orders" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const { row, error } = await getDoc("purchase-orders", id);
  return <InventoryDocDetail kind="purchase-orders" id={id} initial={row ?? null} error={error ?? null} />;
}
