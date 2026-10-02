import { requirePage } from "@/lib/guard";
import type { Metadata } from "next";
import { PosView } from "@/components/dashboard/pos-view";

export const metadata: Metadata = { title: "POS Overview" };

export default async function PosPage() {
  await requirePage("/dashboard/pos");
  return <PosView />;
}
