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

  // Figures come from the POS orders themselves (the till writes real Shopify orders).
  const isToday = (o: Row) => new Date(String(o.placedAt || o.createdAt)).toDateString() === new Date().toDateString();
  const posOrders = orders.filter((o) => o.channel === "pos");
  const today = posOrders.filter(isToday);
  const salesToday = today.reduce((a, o) => a + num(o, "total"), 0);
  const cashToday = today.filter((o) => /cash/i.test(String(o.gateway ?? ""))).reduce((a, o) => a + num(o, "total"), 0);
  const inUse = registers.filter((r) => r.status !== "inactive" && r.locationId);
  const activeStaff = staff.filter((s) => s.status !== "suspended").length;
  const recent = posOrders.slice(0, 8);
  const salesBy = (registerName: string) =>
    today.filter((o) => (Array.isArray(o.tags) ? o.tags : []).includes(`register:${registerName}`)).reduce((a, o) => a + num(o, "total"), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Sell in person from the Till; every sale lands in Orders under POS sale.</p>
        <Button asChild>
          <Link href="/dashboard/pos/till">
            <Store />
            Open till
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="POS sales today" value={formatCurrency(salesToday)} icon={DollarSign} tone="primary" caption={`${formatNumber(today.length)} sales`} />
        <StatCard label="Cash taken today" value={formatCurrency(cashToday)} icon={Wallet} tone="info" />
        <StatCard label="Registers in use" value={formatNumber(inUse.length)} icon={MonitorSmartphone} tone="success" caption={`of ${registers.length}`} />
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
                  <span className="tabular-nums text-sm font-medium" title="Sales today">
                    {formatCurrency(salesBy(String(r.name)))}
                  </span>
                  <Badge variant={!r.locationId ? "warning" : r.status === "inactive" ? "secondary" : "success"}>
                    {!r.locationId ? "Needs a store" : r.status === "inactive" ? "Switched off" : "In use"}
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
          {recent.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No in-store sales yet"
              description="Sales rung up on the Till appear here."
            />
          ) : (
            <div className="space-y-1">
              {recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/dashboard/orders/${o.id}`}
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
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
