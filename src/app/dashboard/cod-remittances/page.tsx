import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CodView } from "@/components/dashboard/cod-view";

export const metadata: Metadata = { title: "COD Reconciliation" };

export default async function Page() {
  if (!(await getCurrentUser())) redirect("/login");
  return <CodView />;
}
