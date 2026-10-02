import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { PosTill } from "@/components/dashboard/pos-till";

export const metadata: Metadata = { title: "Till" };

/** The point-of-sale till — see PosTill and src/lib/pos.ts. */
export default async function TillPage() {
  await requirePage("/dashboard/pos/till", "manage");
  return <PosTill />;
}
