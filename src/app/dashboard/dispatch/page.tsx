import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { DispatchReturnsView } from "@/components/dashboard/dispatch-returns-view";

export const metadata: Metadata = { title: "Dispatch" };

export default async function DispatchPage() {
  await requirePage("/dashboard/dispatch");

  return <DispatchReturnsView initialTab="dispatch" />;
}
