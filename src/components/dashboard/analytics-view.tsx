"use client";

import {
  DollarSign,
  ShoppingCart,
  Percent,
  RotateCcw,
  TrendingUp,
} from "@/components/icons";
import { useResource } from "@/lib/store";
import { revenueTrend, periodDelta } from "@/lib/insights";
import { chartColor } from "@/lib/tone";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BarList } from "@/components/ui/bar-list";
import { LoadingState } from "@/components/ui/spinner";
import { MiniBars } from "./mini-bars";
import type { Row } from "@/config/resource-types";

const num = (r: Row, k: string) => Number(r[k] ?? 0);

export function AnalyticsView() {
  const ordersState = useResource("orders");
  const productsState = useResource("products");
  const customersState = useResource("customers");

  if (ordersState.loading || productsState.loading || customersState.loading) {
    return <LoadingState label="Loading analytics…" />;
  }
  const orders = ordersState.rows;
  const products = productsState.rows;
  const customers = customersState.rows;

  const revenue = orders.reduce((a, o) => a + num(o, "total"), 0);
  const refundedOrders = orders.filter((o) => o.payment === "refunded");
  const refunded = refundedOrders.length;
  const fulfillmentRate = orders.length
    ? (orders.filter((o) => o.fulfillment === "fulfilled").length / orders.length) * 100
    : 0;

  const revDelta = periodDelta(orders, 30, "total");
  const orderDelta = periodDelta(orders, 30);
  const refundDelta = periodDelta(refundedOrders, 30);
  const trend = revenueTrend(orders, 18);

  // Net sales by order channel (sessions/traffic aren't available from Shopify orders).
  const channelRevenue = new Map<string, number>();
  for (const o of orders) {
    const c = o.channel === "pos" ? "Point of sale" : "Online store";
    channelRevenue.set(c, (channelRevenue.get(c) ?? 0) + num(o, "total"));
  }
  const channelItems = [...channelRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      display: formatCurrency(value),
      color: chartColor(i),
    }));

  // Sales by category (catalog value proxy).
  const byCategory = new Map<string, number>();
  for (const p of products) {
    const c = String(p.category ?? "Other");
    byCategory.set(c, (byCategory.get(c) ?? 0) + num(p, "price") * num(p, "stock"));
  }
  const categoryItems = [...byCategory.entries()]
    .map(([label, value], i) => ({
      label,
      value,
      display: formatCurrency(value),
      color: chartColor(i),
    }))
    .sort((a, b) => b.value - a.value);

  // Top customers by spend.
  const topCustomers = [...customers]
    .sort((a, b) => num(b, "spent") - num(a, "spent"))
    .slice(0, 6)
    .map((c, i) => ({
      label: String(c.name),
      value: num(c, "spent"),
      sub: `${num(c, "orders")} orders`,
      display: formatCurrency(num(c, "spent")),
      color: chartColor(i),
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatCurrency(revenue)} icon={DollarSign} tone="primary" delta={revDelta} caption={revDelta !== undefined ? "vs prior 30 days" : undefined} />
        <StatCard label="Orders" value={formatNumber(orders.length)} icon={ShoppingCart} tone="info" delta={orderDelta} caption={orderDelta !== undefined ? "vs prior 30 days" : undefined} />
        <StatCard label="Fulfillment rate" value={`${fulfillmentRate.toFixed(1)}%`} icon={Percent} tone="success" caption="of orders fulfilled" />
        <StatCard label="Refunds" value={formatNumber(refunded)} icon={RotateCcw} tone="warning" delta={refundDelta} caption={refundDelta !== undefined ? "vs prior 30 days" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
          <CardDescription>Daily net sales over the last 18 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <MiniBars data={trend.data} labels={trend.labels} formatValue={formatCurrency} className="h-52" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by channel</CardTitle>
            <CardDescription>Net sales by order channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={channelItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog value by category</CardTitle>
            <CardDescription>On-hand retail value grouped by category.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={categoryItems} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          action={
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <TrendingUp className="size-3.5" /> Top spenders
            </span>
          }
        >
          <CardTitle>Top customers</CardTitle>
          <CardDescription>Ranked by lifetime spend.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarList items={topCustomers} />
        </CardContent>
      </Card>
    </div>
  );
}
