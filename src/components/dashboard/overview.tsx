"use client";

import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowRight,
} from "@/components/icons";
import { useResource } from "@/lib/store";
import {
  revenueTrend,
  windowTotals,
  pctChange,
  periodDelta,
  monthOverMonth,
} from "@/lib/insights";
import { chartColor } from "@/lib/tone";
import {
  formatCurrency,
  formatCompactCurrency,
  formatNumber,
  relativeTime,
} from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarList } from "@/components/ui/bar-list";
import { LoadingState } from "@/components/ui/spinner";
import { MiniBars } from "./mini-bars";
import type { Row } from "@/config/resource-types";

const num = (r: Row, k: string) => Number(r[k] ?? 0);

export function DashboardOverview() {
  const ordersState = useResource("orders");
  const customersState = useResource("customers");
  const productsState = useResource("products");

  if (ordersState.loading || customersState.loading || productsState.loading) {
    return <LoadingState label="Loading overview…" />;
  }
  const orders = ordersState.rows;
  const customers = customersState.rows;
  const products = productsState.rows;

  const revenue = orders.reduce((a, o) => a + num(o, "total"), 0);
  const aov = orders.length ? revenue / orders.length : 0;

  // Trailing-30-day deltas vs the 30 days before (omitted when no baseline).
  const revDelta = periodDelta(orders, 30, "total");
  const orderDelta = periodDelta(orders, 30);
  const customerDelta = periodDelta(customers, 30);
  const revWin = windowTotals(orders, 30, "total");
  const cntWin = windowTotals(orders, 30);
  const aovDelta =
    cntWin.cur > 0 && cntWin.prev > 0
      ? pctChange(revWin.cur / cntWin.cur, revWin.prev / cntWin.prev)
      : undefined;

  const trend = revenueTrend(orders, 14);
  const month = monthOverMonth(orders);

  // Channel split
  const online = orders.filter((o) => o.channel === "online");
  const pos = orders.filter((o) => o.channel === "pos");
  const onlineRevenue = online.reduce((a, o) => a + num(o, "total"), 0);
  const channelItems = [
    { label: "Online store", value: onlineRevenue, color: chartColor(0) },
    { label: "Point of sale", value: pos.reduce((a, o) => a + num(o, "total"), 0), color: chartColor(1) },
  ].map((c) => ({ ...c, display: formatCurrency(c.value) }));
  const onlineShare = revenue > 0 ? (onlineRevenue / revenue) * 100 : 0;
  const itemsPerOrder = orders.length
    ? orders.reduce((a, o) => a + num(o, "items"), 0) / orders.length
    : 0;

  // Top products by on-hand value (price × stock).
  const topProducts = [...products]
    .map((p) => ({
      label: String(p.name),
      value: num(p, "price") * num(p, "stock"),
      sub: String(p.category),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((p, i) => ({ ...p, display: formatCurrency(p.value), color: chartColor(i) }));

  // Recent orders
  const recent = [...orders]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(revenue)} icon={DollarSign} tone="primary" delta={revDelta} caption={revDelta !== undefined ? "vs prior 30 days" : undefined} />
        <StatCard label="Orders" value={formatNumber(orders.length)} icon={ShoppingCart} tone="info" delta={orderDelta} caption={orderDelta !== undefined ? "vs prior 30 days" : undefined} />
        <StatCard label="Customers" value={formatNumber(customers.length)} icon={Users} tone="success" delta={customerDelta} caption={customerDelta !== undefined ? "vs prior 30 days" : undefined} />
        <StatCard label="Avg. order value" value={formatCurrency(aov)} icon={Receipt} tone="highlight" delta={aovDelta} caption={aovDelta !== undefined ? "vs prior 30 days" : undefined} />
      </div>

      {/* Hero + channel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-transparent bg-primary text-primary-foreground shadow-elevated lg:col-span-2">
          <CardContent className="flex h-full flex-col justify-between gap-6 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-primary-foreground/70">
                  Net sales · this month
                </p>
                <p className="mt-2 font-heading text-4xl font-semibold tabular-nums md:text-6xl">
                  {formatCompactCurrency(month.revenue)}
                </p>
                {month.delta !== undefined ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm text-primary-foreground/80">
                    <ArrowUpRight className="size-4" />
                    {month.delta >= 0 ? "+" : ""}
                    {month.delta.toFixed(1)}% month over month
                  </p>
                ) : null}
              </div>
              <Badge className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground">
                Live
              </Badge>
            </div>
            <MiniBars
              data={trend.data}
              labels={trend.labels}
              formatValue={formatCurrency}
              tone="inverted"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <BarList items={channelItems} />
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Online share</span>
                <span className="font-semibold tabular-nums">{onlineShare.toFixed(1)}%</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Avg. items per order</span>
                <span className="font-semibold tabular-nums">{itemsPerOrder.toFixed(1)} items</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top products + recent orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/products">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            <CardTitle>Top products by stock value</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={topProducts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/orders">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {recent.map((o) => (
              <Link
                key={o.id}
                href="/dashboard/orders"
                className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {String(o.number)}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {String(o.customer)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTime(String(o.createdAt))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge
                    variant={
                      o.payment === "paid"
                        ? "success"
                        : o.payment === "pending"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {String(o.payment)}
                  </Badge>
                  <span className="tabular-nums text-sm font-medium">
                    {formatCurrency(num(o, "total"))}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
