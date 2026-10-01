"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from "@/components/icons";
import { useResource } from "@/lib/store";
import { performanceBy, SHIPMENT_STUCK_DAYS, type PerformanceRow } from "@/config/logistics";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const days = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)} d`);

/**
 * Courier scorecards from the shipments board (src/config/logistics.ts):
 * delivery and return (RTO) rates over finished parcels, average days from
 * dispatch to delivery, parcels stuck in transit, and COD collected — by
 * courier, then by destination city.
 */
export function CourierPerformanceView() {
  const { rows, loading, error } = useResource("shipments");
  const byCourier = React.useMemo(() => performanceBy(rows, (r) => String(r.courier ?? "")), [rows]);
  const byCity = React.useMemo(() => performanceBy(rows, (r) => String(r.city ?? "")), [rows]);
  const [overall] = React.useMemo(() => performanceBy(rows, () => "All"), [rows]);

  if (loading) return <LoadingState label="Loading shipments…" />;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Delivery rate"
          value={pct(overall?.deliveryRate ?? null)}
          caption={overall ? `${formatNumber(overall.delivered + overall.returned)} finished parcels` : undefined}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Return rate (RTO)" value={pct(overall?.rtoRate ?? null)} icon={RotateCcw} tone="destructive" />
        <StatCard label="Avg. days to deliver" value={days(overall?.avgDeliveryDays ?? null)} icon={Clock} tone="info" />
        <StatCard
          label={`Stuck over ${SHIPMENT_STUCK_DAYS} days`}
          value={formatNumber(overall?.stuck ?? 0)}
          caption={overall ? `of ${formatNumber(overall.inTransit)} in transit` : undefined}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <ScoreTable
        title="By courier"
        description="Rates count finished parcels only (delivered or returned). Parcels still awaiting pickup aren't included."
        firstHeader="Courier"
        rows={byCourier}
      />
      <ScoreTable
        title="By city"
        description="Where parcels go — useful for spotting cities with high returns. Cities are recorded when the consignment is assigned."
        firstHeader="City"
        rows={byCity}
      />
    </div>
  );
}

function ScoreTable({
  title,
  description,
  firstHeader,
  rows,
}: {
  title: string;
  description: string;
  firstHeader: string;
  rows: PerformanceRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">No dispatched parcels yet.</p>
        </CardContent>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{firstHeader}</TableHead>
              <TableHead className="text-right">Shipments</TableHead>
              <TableHead className="text-right">In transit</TableHead>
              <TableHead className="text-right">Stuck</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead className="text-right">Delivery rate</TableHead>
              <TableHead className="text-right">RTO rate</TableHead>
              <TableHead className="text-right">Avg. days</TableHead>
              <TableHead className="text-right">COD collected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key} className="hover:bg-transparent">
                <TableCell className="font-medium">{r.key}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.shipments)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.inTransit)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", r.stuck > 0 && "font-semibold text-warning")}>
                  {formatNumber(r.stuck)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.delivered)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(r.returned)}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(r.deliveryRate)}</TableCell>
                <TableCell
                  className={cn("text-right tabular-nums", (r.rtoRate ?? 0) >= 0.2 && "font-semibold text-destructive")}
                >
                  {pct(r.rtoRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{days(r.avgDeliveryDays)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(r.codCollected)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
