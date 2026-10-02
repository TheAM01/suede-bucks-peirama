import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { DispatchReturnsView } from "@/components/dashboard/dispatch-returns-view";

export const metadata: Metadata = { title: "Returns" };

export default async function ReturnsPage() {
  await requirePage("/dashboard/returns");

  return <DispatchReturnsView initialTab="returns" />;
}
