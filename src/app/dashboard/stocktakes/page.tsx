import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { ResourceView } from "@/components/dashboard/resource-view";

export const metadata: Metadata = { title: "Stocktakes" };

/** Literal route (it also has an [id] detail page); the list itself is the generic resource view. */
export default async function Page() {
  await requirePage("/dashboard/stocktakes");
  return <ResourceView resourceKey="stocktakes" />;
}
