"use client";

import * as React from "react";
import { useResource } from "@/lib/store";
import { codByCourier } from "@/config/logistics";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResourceView } from "./resource-view";

/**
 * COD reconciliation: each courier's cash position (COD on delivered parcels
 * vs what they've remitted), computed from the shipments board and the
 * remittance records, above the remittance list where payments are recorded.
 */
export function CodView() {
  const shipments = useResource("shipments");
  const remittances = useResource("cod-remittances");
  const balances = React.useMemo(
    () => codByCourier(shipments.rows, remittances.rows),
    [shipments.rows, remittances.rows],
  );
  const totals = balances.reduce(
    (a, b) => ({
      inField: a.inField + b.inField,
      collected: a.collected + b.collected,
      remitted: a.remitted + b.remitted,
      outstanding: a.outstanding + b.outstanding,
    }),
    { inField: 0, collected: 0, remitted: 0, outstanding: 0 },
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Courier balances</CardTitle>
          <CardDescription>
            Collected is the COD on parcels marked delivered (or fulfilled). Outstanding is what the
            courier still owes you after the remittances below.
          </CardDescription>
        </CardHeader>
        {shipments.loading || remittances.loading ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </CardContent>
        ) : balances.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No consignments yet — balances appear once orders are assigned to a courier.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Courier</TableHead>
                <TableHead className="text-right">Delivered parcels</TableHead>
                <TableHead className="text-right">COD in the field</TableHead>
                <TableHead className="text-right">COD collected</TableHead>
                <TableHead className="text-right">Remitted</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.courier} className="hover:bg-transparent">
                  <TableCell className="font-medium">{b.courier}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(b.deliveredParcels)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(b.inField)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(b.collected)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(b.remitted)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      b.outstanding > 0 ? "text-warning" : b.outstanding < 0 ? "text-destructive" : "text-success",
                    )}
                  >
                    {formatCurrency(b.outstanding)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 hover:bg-transparent">
                <TableCell className="font-semibold">All couriers</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(totals.inField)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(totals.collected)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(totals.remitted)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(totals.outstanding)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
        {balances.some((b) => b.outstanding < 0) ? (
          <CardContent className="pt-0">
            <p className="text-xs text-destructive">
              A negative balance means more was recorded as remitted than delivered COD — check for a
              duplicate remittance or a parcel that hasn&apos;t been marked delivered.
            </p>
          </CardContent>
        ) : null}
      </Card>

      <ResourceView resourceKey="cod-remittances" />
    </div>
  );
}
