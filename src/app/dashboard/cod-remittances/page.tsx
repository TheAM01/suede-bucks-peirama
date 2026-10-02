import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { CodView } from "@/components/dashboard/cod-view";

export const metadata: Metadata = { title: "COD Reconciliation" };

export default async function Page() {
  await requirePage("/dashboard/cod-remittances");
  return <CodView />;
}
