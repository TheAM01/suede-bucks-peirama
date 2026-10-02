"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Check,
  DollarSign,
  Package,
  Printer,
  Wallet,
  Send,
  Truck,
} from "@/components/icons";
import type { LoadSheetDetail } from "@/lib/load-sheet-detail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { postOrderAction } from "./order-control-panel";
import { ScanIntoSheetButton } from "./scanners";
import { SheetPicker, openSheetsFor, type SheetChoice } from "./sheet-picker";
import { useResource } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { statusLabel } from "@/config/order-workflow";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BadgeVariant } from "@/config/resource-types";

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "warning" },
  posted: { label: "Posted", variant: "success" },
  archived: { label: "Archived", variant: "secondary" },
};

/**
 * Load sheet detail: header facts, totals, every parcel on the sheet, the
 * stage buttons (Post / Reconcile / Archive — saved through the same
 * `/api/resources/dispatch/[id]` PATCH the edit drawer uses), and the
 * printable manifest link.
 */
export function LoadSheetDetailView({
  id,
  detail,
  error,
}: {
  id: string;
  detail: LoadSheetDetail | null;
  error: string | null;
}) {
  const router = useRouter();
  const store = useStore();
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const toast = useToast();
  // Optimistic overlay on the server-rendered detail: a sheet patch and parcels
  // taken off, both tied to the detail they were made against — a fresh server
  // render (router.refresh) replaces them with the real thing.
  const [overlay, setOverlay] = React.useState<{
    for: LoadSheetDetail | null;
    patch: Record<string, unknown>;
    gone: Set<string>;
  }>({ for: detail, patch: {}, gone: new Set() });
  const live = overlay.for === detail ? overlay : { for: detail, patch: {}, gone: new Set<string>() };
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [moving, setMoving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [moveTo, setMoveTo] = React.useState<SheetChoice | null>(null);
  const { rows: allSheets } = useResource("dispatch");

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/dashboard/dispatch">
        <ArrowLeft />
        Dispatch
      </Link>
    </Button>
  );

  if (!detail) {
    return (
      <div className="space-y-6">
        <div>{back}</div>
        <Card>
          <div className="p-5">
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load this load sheet"
              description={error ?? "Unknown error."}
            />
          </div>
        </Card>
      </div>
    );
  }

  const sheet = { ...detail.sheet, ...live.patch };
  const parcels = detail.parcels.filter((p) => !live.gone.has(p.orderId));
  const { warning } = detail;
  const status = STATUS_BADGE[String(sheet.status)] ?? { label: String(sheet.status), variant: "outline" as const };
  const reconciled = sheet.reconciliation === "reconciled";

  async function save(patch: Record<string, unknown>, done: string) {
    setBusy(true);
    setActionError(null);
    const prior = live;
    setOverlay({ ...live, patch: { ...live.patch, ...patch } });
    const res = await store.update("dispatch", id, { ...sheet, ...patch });
    setBusy(false);
    if (!res.ok) {
      setOverlay(prior);
      const reason = res.error ?? "Couldn't save the change.";
      setActionError(reason);
      toast.error(`${String(sheet.reference)} wasn't updated`, reason);
    } else {
      toast.success(done, `Load sheet ${String(sheet.reference)}`);
      router.refresh();
    }
  }

  const isDraft = sheet.status === "draft";
  const outOfSync = parcels.filter((p) => p.syncIssue);
  const pickedParcels = parcels.filter((p) => picked.has(p.orderId));

  function refreshAll() {
    store.refresh("dispatch");
    store.refresh("orders");
    store.refresh("shipments");
    router.refresh();
  }

  /** Remove / move the ticked parcels, one order at a time (a "new" sheet is opened once, then reused). */
  async function runOnPicked(action: "remove_from_sheet" | "move_to_sheet", choice?: SheetChoice) {
    setBusy(true);
    setActionError(null);
    const batch = pickedParcels;
    // They leave this sheet's list at once; any the server refuses come back.
    const gone = new Set(live.gone);
    for (const p of batch) gone.add(p.orderId);
    setOverlay({ ...live, gone });
    setPicked(new Set());
    const errors: string[] = [];
    const kept: string[] = [];
    let target = choice?.target;
    for (const p of batch) {
      const res = await postOrderAction(p.orderId, action, target ? { target, location: choice?.location } : {});
      if (res.error) {
        errors.push(`${p.number || p.consignmentId}: ${res.error}`);
        kept.push(p.orderId);
      } else if (target === "new" && res.loadSheetId) target = res.loadSheetId;
    }
    setBusy(false);
    if (kept.length) {
      setOverlay((o) => ({ ...o, gone: new Set([...o.gone].filter((x) => !kept.includes(x))) }));
    }
    const ok = batch.length - errors.length;
    const verb = action === "remove_from_sheet" ? "Removed from" : "Moved off";
    if (errors.length) {
      setActionError(errors.join(" · "));
      toast.error(`${errors.length} of ${batch.length} parcels weren't changed`, errors.join(" · "));
    }
    if (ok) toast.success(`${verb} ${String(sheet.reference)} — ${ok} ${ok === 1 ? "parcel" : "parcels"}`);
    refreshAll();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          {back}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Load sheet {String(sheet.reference)}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant={reconciled ? "success" : "outline"}>
              {reconciled ? "Reconciled" : "Reconciliation pending"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {String(sheet.courier)} · from {String(sheet.location)} · created{" "}
            {formatDateTime(String(sheet.createdAt))}
            {sheet.datePosted ? ` · posted ${formatDateTime(String(sheet.datePosted))}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDraft ? (
            <ScanIntoSheetButton sheetId={id} reference={String(sheet.reference)} onDone={refreshAll} />
          ) : null}
          {sheet.status === "draft" ? (
            <Button onClick={() => save({ status: "posted" }, "Posted — handed to courier")} disabled={busy}>
              <Send />
              Post — handed to courier
            </Button>
          ) : null}
          {sheet.status !== "draft" && !reconciled ? (
            <Button variant="outline" onClick={() => save({ reconciliation: "reconciled" }, "COD marked reconciled")} disabled={busy}>
              <Check />
              Mark COD reconciled
            </Button>
          ) : null}
          {sheet.status === "posted" ? (
            <Button variant="outline" onClick={() => save({ status: "archived" }, "Archived")} disabled={busy}>
              <Archive />
              Archive
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <a href={`/print/load-sheets/${id}`} target="_blank" rel="noreferrer">
              <Printer />
              Print
            </a>
          </Button>
        </div>
      </div>

      {actionError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}
      {warning ? (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
          <AlertCircle className="size-4 shrink-0 text-warning" />
          <span>{warning}</span>
        </div>
      ) : null}

      {outOfSync.length ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            {outOfSync.length} {outOfSync.length === 1 ? "parcel doesn't" : "parcels don't"} match this sheet — see
            the <span className="font-medium">Out of sync</span> badges below.
            {isDraft ? " Tick them and remove them, or move them to the right sheet." : ""}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Parcels" value={formatNumber(parcels.length)} icon={Truck} tone="primary" />
        <StatCard label="COD to collect" value={formatCurrency(Number(sheet.codAmount ?? 0))} icon={Wallet} tone="warning" />
        <StatCard label="Total value" value={formatCurrency(Number(sheet.totalAmount ?? 0))} icon={DollarSign} tone="info" />
        <StatCard
          label="Weight"
          value={sheet.weight ? `${formatNumber(Number(sheet.weight))} kg` : "—"}
          icon={Package}
          tone="highlight"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Parcels on this sheet</CardTitle>
          {isDraft && picked.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{picked.size} selected</span>
              <Button variant="outline" size="sm" onClick={() => setMoving(true)} disabled={busy}>
                <Truck />
                Move to another sheet
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setRemoving(true)} disabled={busy}>
                Remove from sheet
              </Button>
            </div>
          ) : null}
        </CardHeader>
        {parcels.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No parcels yet. Dispatch orders from the Orders page onto this sheet, or add
              dispatched orders with Add to load sheet.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {isDraft ? (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      aria-label="Select all parcels"
                      checked={parcels.length > 0 && picked.size === parcels.length}
                      onChange={() =>
                        setPicked(picked.size === parcels.length ? new Set() : new Set(parcels.map((p) => p.orderId)))
                      }
                    />
                  </TableHead>
                ) : null}
                <TableHead className="w-10">#</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Consignment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">COD</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcels.map((p, i) => (
                <TableRow
                  key={p.orderId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/orders/${p.orderId}`)}
                >
                  {isDraft ? (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        aria-label={`Select ${p.number}`}
                        checked={picked.has(p.orderId)}
                        onChange={() =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.orderId)) next.delete(p.orderId);
                            else next.add(p.orderId);
                            return next;
                          })
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="tabular-nums text-muted-foreground/60">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.number || p.orderId}</TableCell>
                  <TableCell className="font-mono text-[13px]">{p.consignmentId || "—"}</TableCell>
                  <TableCell>{p.customer || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.city || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone || "—"}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{statusLabel(p.opsStatus)}</Badge>
                      {p.syncIssue ? (
                        <Badge variant="destructive" title={p.syncIssue}>
                          Out of sync
                        </Badge>
                      ) : null}
                    </span>
                    {p.syncIssue ? <p className="mt-1 text-xs text-destructive">{p.syncIssue}</p> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.codAmount ? formatCurrency(p.codAmount) : "Paid"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(p.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {moving ? (
        <Dialog
          open
          onClose={() => setMoving(false)}
          title={`Move ${picked.size} ${picked.size === 1 ? "parcel" : "parcels"}`}
          description={`To another open ${String(sheet.courier)} sheet, or a new one.`}
          footer={
            <>
              <Button variant="outline" onClick={() => setMoving(false)}>
                Cancel
              </Button>
              <Button
                disabled={!moveTo || busy}
                onClick={() => {
                  setMoving(false);
                  void runOnPicked("move_to_sheet", moveTo!);
                }}
              >
                Move
              </Button>
            </>
          }
        >
          <SheetPicker
            name="move-to-sheet"
            courier={String(sheet.courier)}
            sheets={openSheetsFor(allSheets, String(sheet.courier))}
            exclude={id}
            value={moveTo}
            onChange={setMoveTo}
          />
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={removing}
        onCancel={() => setRemoving(false)}
        onConfirm={() => {
          setRemoving(false);
          void runOnPicked("remove_from_sheet");
        }}
        title={`Remove ${picked.size} ${picked.size === 1 ? "parcel" : "parcels"} from ${String(sheet.reference)}?`}
        description="They go back to In Pickup & Packing (not dispatched), and come off this sheet's totals."
        confirmLabel="Remove"
      />

      {sheet.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{String(sheet.notes)}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
