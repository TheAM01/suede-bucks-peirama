import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { OrdersView } from "@/components/dashboard/orders-view";

export const metadata: Metadata = { title: "Orders" };

/** Literal route (wins over [resource]) so Orders gets its workflow control panel and scanner. */
export default async function OrdersPage() {
  await requirePage("/dashboard/orders");

  return <OrdersView />;
}
