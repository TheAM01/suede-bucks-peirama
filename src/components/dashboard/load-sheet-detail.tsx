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

  const { sheet, parcels, warning } = detail;
  const status = STATUS_BADGE[String(sheet.status)] ?? { label: String(sheet.status), variant: "outline" as const };
  const reconciled = sheet.reconciliation === "reconciled";

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    const res = await store.update("dispatch", id, { ...sheet, ...patch });
    setBusy(false);
    if (!res.ok) setActionError(res.error ?? "Couldn't save the change.");
    else router.refresh();
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
          {sheet.status === "draft" ? (
            <Button onClick={() => save({ status: "posted" })} disabled={busy}>
              <Send />
              Post — handed to courier
            </Button>
          ) : null}
          {sheet.status !== "draft" && !reconciled ? (
            <Button variant="outline" onClick={() => save({ reconciliation: "reconciled" })} disabled={busy}>
              <Check />
              Mark COD reconciled
            </Button>
          ) : null}
          {sheet.status === "posted" ? (
            <Button variant="outline" onClick={() => save({ status: "archived" })} disabled={busy}>
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
        <CardHeader>
          <CardTitle>Parcels on this sheet</CardTitle>
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
                  <TableCell className="tabular-nums text-muted-foreground/60">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.number || p.orderId}</TableCell>
                  <TableCell className="font-mono text-[13px]">{p.consignmentId || "—"}</TableCell>
                  <TableCell>{p.customer || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.city || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabel(p.opsStatus)}</Badge>
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
