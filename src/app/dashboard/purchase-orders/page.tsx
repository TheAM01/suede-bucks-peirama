import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ResourceView } from "@/components/dashboard/resource-view";

export const metadata: Metadata = { title: "Purchase Orders" };

/** Literal route (it also has an [id] detail page); the list itself is the generic resource view. */
export default async function Page() {
  if (!(await getCurrentUser())) redirect("/login");
  return <ResourceView resourceKey="purchase-orders" />;
}
