"use client";

import Link from "next/link";
import {
  MonitorSmartphone,
  DollarSign,
  Wallet,
  IdCard,
  MapPin,
  ArrowRight,
  Store,
} from "@/components/icons";
import { useResource } from "@/lib/store";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import type { Row } from "@/config/resource-types";

const num = (r: Row, k: string) => Number(r[k] ?? 0);

export function PosView() {
  const registersState = useResource("registers");
  const locationsState = useResource("locations");
  const staffState = useResource("pos-staff");
  const ordersState = useResource("orders");

  if (
    registersState.loading ||
    locationsState.loading ||
    staffState.loading ||
    ordersState.loading
  ) {
    return <LoadingState label="Loading point of sale…" />;
  }
  const registers = registersState.rows;
  const locations = locationsState.rows;
  const staff = staffState.rows;
  const orders = ordersState.rows;

  const openRegisters = registers.filter((r) => r.status === "open");
  const posSales = registers.reduce((a, r) => a + num(r, "sales"), 0);
  const cash = openRegisters.reduce((a, r) => a + num(r, "cashFloat"), 0);
  const activeStaff = staff.filter((s) => s.status === "active").length;
  const posOrders = orders.filter((o) => o.channel === "pos").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open registers" value={formatNumber(openRegisters.length)} icon={MonitorSmartphone} tone="success" caption={`of ${registers.length}`} />
        <StatCard label="POS sales today" value={formatCurrency(posSales)} icon={DollarSign} tone="primary" />
        <StatCard label="Cash in drawers" value={formatCurrency(cash)} icon={Wallet} tone="info" />
        <StatCard label="Active staff" value={formatNumber(activeStaff)} icon={IdCard} tone="highlight" caption={`${staff.length} total`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Registers */}
        <Card>
          <CardHeader
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/registers">
                  Manage
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            <CardTitle>Registers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {registers.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <MonitorSmartphone className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{String(r.name)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {String(r.location)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular-nums text-sm font-medium">
                    {formatCurrency(num(r, "sales"))}
                  </span>
                  <Badge variant={r.status === "open" ? "success" : "secondary"}>
                    {String(r.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/locations">
                  Manage
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {locations.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    {l.type === "warehouse" ? (
                      <Store className="size-4" />
                    ) : (
                      <MapPin className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{String(l.name)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {String(l.city)}, {String(l.country)}
                    </p>
                  </div>
                </div>
                <Badge variant={l.status === "active" ? "success" : "secondary"}>
                  {String(l.status)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent POS sales */}
      <Card>
        <CardHeader
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/orders">
                All orders
                <ArrowRight />
              </Link>
            </Button>
          }
        >
          <CardTitle>Recent in-store sales</CardTitle>
        </CardHeader>
        <CardContent>
          {posOrders.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No in-store sales yet"
              description="POS orders will appear here as your registers ring up sales."
            />
          ) : (
            <div className="space-y-1">
              {posOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {String(o.number)}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {String(o.customer)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {num(o, "items")} items
                    </p>
                  </div>
                  <span className="tabular-nums text-sm font-medium">
                    {formatCurrency(num(o, "total"))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
