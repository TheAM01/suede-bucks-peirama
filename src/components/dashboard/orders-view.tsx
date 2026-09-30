"use client";

import * as React from "react";
import { AlertCircle, Check, X } from "@/components/icons";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ResourceView } from "./resource-view";
import { OrderControlPanel } from "./order-control-panel";
import { ScanDispatchButton } from "./scanners";

type Notice = { tone: "success" | "error"; text: string } | null;

/**
 * The Orders page: the generic resource engine for the table/tabs/stats, plus
 * the order workflow on top — a control panel for ticked orders instead of
 * the generic bulk bar, and a scan-to-dispatch button next to the tabs.
 */
export function OrdersView() {
  const store = useStore();
  const [notice, setNotice] = React.useState<Notice>(null);

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
            notice.tone === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {notice.tone === "success" ? (
            <Check className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <ResourceView
        resourceKey="orders"
        toolbar={<ScanDispatchButton />}
        selectionBar={(ctx) => (
          <OrderControlPanel
            ctx={ctx}
            onDone={(message) => {
              setNotice(message);
              store.refresh("orders");
            }}
          />
        )}
      />
    </div>
  );
}
