import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OrdersView } from "@/components/dashboard/orders-view";

export const metadata: Metadata = { title: "Orders" };

/** Literal route (wins over [resource]) so Orders gets its workflow control panel and scanner. */
export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <OrdersView />;
}
