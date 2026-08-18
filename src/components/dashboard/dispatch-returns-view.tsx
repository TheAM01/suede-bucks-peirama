"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";
import { ResourceView } from "./resource-view";

type SubTab = "dispatch" | "returns";

/**
 * Dispatch and Returns share one page with a top-level switch — both are
 * "what happens to a shipment after the sale," just moving in opposite
 * directions. Switching tabs updates the URL (`/dashboard/dispatch` <->
 * `/dashboard/returns`) so the sidebar highlight and the bottom bar's
 * "How to use this page" guide link stay in sync with whichever half is
 * showing, instead of only reflecting whichever route was loaded first.
 */
export function DispatchReturnsView({ initialTab }: { initialTab: SubTab }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<SubTab>(initialTab);

  function change(next: SubTab) {
    setTab(next);
    router.replace(`/dashboard/${next}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <Segmented
        value={tab}
        onChange={change}
        options={[
          { value: "dispatch", label: "Dispatch" },
          { value: "returns", label: "Returns" },
        ]}
      />
      <ResourceView key={tab} resourceKey={tab} />
    </div>
  );
}
