import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RotateCcw } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Card>
      <EmptyState
        icon={RotateCcw}
        title="Returns is coming soon"
        description="Return merchandise authorizations, refund tracking, and restock handling will land here — this page is a placeholder until that scope is defined."
      />
    </Card>
  );
}
