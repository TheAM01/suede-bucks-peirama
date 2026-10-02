"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { useAccess } from "@/components/access-provider";
import { ResourceView } from "./resource-view";
import { OrderControlPanel } from "./order-control-panel";
import { ScanDispatchButton } from "./scanners";

/**
 * The Orders page: the generic resource engine for the table/tabs/stats, plus
 * the order workflow on top — a control panel for ticked orders instead of
 * the generic bulk bar, and a scan-to-dispatch button next to the tabs.
 * Action results arrive as toasts; the rows themselves have already moved
 * (the control panel is optimistic) and are re-read from the server here.
 */
export function OrdersView() {
  const store = useStore();
  const toast = useToast();
  const access = useAccess();

  return (
    <ResourceView
      resourceKey="orders"
      toolbar={access.can("orders", "manage") || access.can("dispatch", "manage") ? <ScanDispatchButton /> : undefined}
      selectionBar={(ctx) => (
        <OrderControlPanel
          ctx={ctx}
          onDone={(message) => {
            if (message?.tone === "error") toast.error("Some orders weren't updated", message.text);
            else if (message) toast.success(message.text);
            store.refresh("orders");
          }}
        />
      )}
    />
  );
}
