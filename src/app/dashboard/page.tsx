import { requirePage } from "@/lib/guard";
import type { Metadata } from "next";
import { AlertCircle } from "@/components/icons";
import { DashboardOverview } from "@/components/dashboard/overview";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requirePage("/dashboard");
  const { denied } = await searchParams;
  return (
    <div className="space-y-6">
      {denied ? (
        // Where requirePage() sends someone who opened a page they have no access to.
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>You don&apos;t have access to that page. Ask an admin if you need it.</span>
        </div>
      ) : null}
      <DashboardOverview />
    </div>
  );
}
