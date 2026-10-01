import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ShipmentsView } from "@/components/dashboard/shipments-view";

export const metadata: Metadata = { title: "Shipments" };

export default async function Page() {
  if (!(await getCurrentUser())) redirect("/login");
  return <ShipmentsView />;
}
