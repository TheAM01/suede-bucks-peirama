import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PosTill } from "@/components/dashboard/pos-till";

export const metadata: Metadata = { title: "Till" };

/** The point-of-sale till — see PosTill and src/lib/pos.ts. */
export default async function TillPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return <PosTill />;
}
