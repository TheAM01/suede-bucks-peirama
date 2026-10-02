"use client";

import * as React from "react";
import { Check, Loader2, RotateCcw } from "@/components/icons";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { ResourceView, type SelectionContext } from "./resource-view";
import { SelectionDock } from "./selection-dock";
import { postOrderAction } from "./order-control-panel";
import type { OrderAction } from "@/config/order-workflow";

type Notice = { tone: "success" | "error"; text: string } | null;

/**
 * Shipments: the tracking board over every consigned order (src/lib/logistics.ts).
 * Ticked parcels get two tracking actions, run through the same order workflow
 * endpoint as the Orders control panel — Mark delivered (in transit only) and
 * Mark returned (RTO). Both update the board optimistically; results are toasts.
 */
export function ShipmentsView() {
  const store = useStore();
  const toast = useToast();

  return (
    <ResourceView
      resourceKey="shipments"
      selectionBar={(ctx) => (
        <ShipmentsPanel
          ctx={ctx}
          onDone={(n) => {
            if (n?.tone === "error") toast.error("Some parcels weren't updated", n.text);
            else if (n) toast.success(n.text);
            store.refresh("shipments");
            store.refresh("orders");
          }}
        />
      )}
    />
  );
}

function ShipmentsPanel({ ctx, onDone }: { ctx: SelectionContext; onDone: (n: Notice) => void }) {
  const { rows, clear } = ctx;
  const store = useStore();
  const [busy, setBusy] = React.useState(false);
  const [returning, setReturning] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const canDeliver = rows.every((r) => r.stage === "in_transit");
  const canReturn = rows.every((r) => r.stage === "in_transit" || r.stage === "delivered");

  async function run(action: OrderAction, payload: Record<string, unknown> = {}) {
    setBusy(true);
    const stage = action === "mark_delivered" ? "delivered" : "returned";
    const rollback = store.patchRows("shipments", rows.map((r) => r.id), { stage, stuck: false });
    const errors: string[] = [];
    const failedIds: string[] = [];
    for (const r of rows) {
      const res = await postOrderAction(r.id, action, payload);
      if (res.error) {
        errors.push(`${r.number}: ${res.error}`);
        failedIds.push(r.id);
      }
    }
    if (failedIds.length) rollback(failedIds);
    setBusy(false);
    const done = rows.length - errors.length;
    onDone(
      errors.length
        ? { tone: "error", text: errors.join(" · ") }
        : { tone: "success", text: `${action === "mark_delivered" ? "Delivered" : "Returned"} — ${done} ${done === 1 ? "parcel" : "parcels"}.` },
    );
    clear();
  }

  return (
    <>
      <SelectionDock>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-md">
          <p className="flex items-center gap-2 text-sm font-medium">
            {rows.length} {rows.length === 1 ? "parcel" : "parcels"} selected
            {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!canDeliver && !canReturn ? (
              <span className="text-sm text-muted-foreground">
                Tracking actions apply to parcels in transit or delivered.
              </span>
            ) : null}
            {canDeliver ? (
              <Button size="sm" onClick={() => void run("mark_delivered")} disabled={busy}>
                <Check />
                Mark delivered
              </Button>
            ) : null}
            {canReturn ? (
              <Button size="sm" variant="destructive" onClick={() => setReturning(true)} disabled={busy}>
                <RotateCcw />
                Mark returned (RTO)
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={clear} disabled={busy}>
              Clear
            </Button>
          </div>
        </div>
      </SelectionDock>

      {returning ? (
        <Dialog
          open
          onClose={() => setReturning(false)}
          title={`Mark ${rows.length} ${rows.length === 1 ? "parcel" : "parcels"} returned?`}
          description="For parcels the courier brings back undelivered. Their COD is no longer owed. Put the items back into stock with a stock adjustment once they're checked."
          footer={
            <>
              <Button variant="outline" onClick={() => setReturning(false)}>
                Back
              </Button>
              <Button
                variant="destructive"
                disabled={!reason.trim()}
                onClick={() => {
                  setReturning(false);
                  void run("mark_returned", { reason: reason.trim() });
                }}
              >
                Mark returned
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="rto-reason">Reason</Label>
            <Textarea
              id="rto-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer refused / unreachable"
              autoFocus
            />
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
