import type { Metadata } from "next";
import { OrderDetailView } from "@/components/dashboard/order-detail";
import { requirePage } from "@/lib/guard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePage("/dashboard/orders");
  return <OrderDetailView orderId={id} />;
}
