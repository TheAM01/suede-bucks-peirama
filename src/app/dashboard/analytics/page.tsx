import { requirePage } from "@/lib/guard";
import type { Metadata } from "next";
import { AnalyticsView } from "@/components/dashboard/analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requirePage("/dashboard/analytics");
  return <AnalyticsView />;
}
