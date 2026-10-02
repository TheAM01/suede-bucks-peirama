import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { ShipmentsView } from "@/components/dashboard/shipments-view";

export const metadata: Metadata = { title: "Shipments" };

export default async function Page() {
  await requirePage("/dashboard/shipments");
  return <ShipmentsView />;
}
