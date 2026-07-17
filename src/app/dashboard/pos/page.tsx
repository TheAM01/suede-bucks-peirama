import type { Metadata } from "next";
import { PosView } from "@/components/dashboard/pos-view";

export const metadata: Metadata = { title: "POS Overview" };

export default function PosPage() {
  return <PosView />;
}
