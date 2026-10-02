import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { CourierPerformanceView } from "@/components/dashboard/courier-performance-view";

export const metadata: Metadata = { title: "Courier Performance" };

export default async function Page() {
  await requirePage("/dashboard/courier-performance");
  return <CourierPerformanceView />;
}
