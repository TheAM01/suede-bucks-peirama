import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DispatchReturnsView } from "@/components/dashboard/dispatch-returns-view";

export const metadata: Metadata = { title: "Dispatch" };

export default async function DispatchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <DispatchReturnsView initialTab="dispatch" />;
}
