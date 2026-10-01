"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2, RotateCcw, X } from "@/components/icons";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
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
 * Mark returned (RTO).
 */
export function ShipmentsView() {
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
          {notice.tone === "success" ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <ResourceView
        resourceKey="shipments"
        selectionBar={(ctx) => (
          <ShipmentsPanel
            ctx={ctx}
            onDone={(n) => {
              setNotice(n);
              store.refresh("shipments");
              store.refresh("orders");
            }}
          />
        )}
      />
    </div>
  );
}

function ShipmentsPanel({ ctx, onDone }: { ctx: SelectionContext; onDone: (n: Notice) => void }) {
  const { rows, clear } = ctx;
  const [busy, setBusy] = React.useState(false);
  const [returning, setReturning] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const canDeliver = rows.every((r) => r.stage === "in_transit");
  const canReturn = rows.every((r) => r.stage === "in_transit" || r.stage === "delivered");

  async function run(action: OrderAction, payload: Record<string, unknown> = {}) {
    setBusy(true);
    const errors: string[] = [];
    for (const r of rows) {
      const res = await postOrderAction(r.id, action, payload);
      if (res.error) errors.push(`${r.number}: ${res.error}`);
    }
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
