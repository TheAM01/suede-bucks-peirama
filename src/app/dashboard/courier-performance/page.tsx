import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CourierPerformanceView } from "@/components/dashboard/courier-performance-view";

export const metadata: Metadata = { title: "Courier Performance" };

export default async function Page() {
  if (!(await getCurrentUser())) redirect("/login");
  return <CourierPerformanceView />;
}
