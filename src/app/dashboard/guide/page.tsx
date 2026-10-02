import { requirePage } from "@/lib/guard";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GuideContent } from "@/components/guide/guide-content";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Guide" };

export default async function GuidePage() {
  await requirePage("/dashboard/guide");
  return (
    <Suspense fallback={<LoadingState />}>
      <GuideContent />
    </Suspense>
  );
}
