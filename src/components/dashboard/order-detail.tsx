"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  Truck,
  PackageCheck,
  RotateCcw,
  X,
  Info,
  AlertCircle,
  ExternalLink,
  MapPin,
  User,
  RefreshCw,
} from "@/components/icons";
import type {
  OrderDetail,
  TimelineEntry,
  TimelineKind,
} from "@/lib/shopify-order-detail";
import type { IconType } from "@/components/icons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BadgeVariant } from "@/config/resource-types";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

const PAYMENT_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  refunded: { label: "Refunded", variant: "secondary" },
};

const FULFILLMENT_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  fulfilled: { label: "Fulfilled", variant: "success" },
  partial: { label: "Partially fulfilled", variant: "warning" },
  unfulfilled: { label: "Unfulfilled", variant: "destructive" },
};

/** Icon + accent per timeline step. */
const STEP_STYLE: Record<TimelineKind, { icon: IconType; className: string }> = {
  placed: { icon: ShoppingCart, className: "border-primary/30 bg-primary/10 text-primary" },
  payment: { icon: CreditCard, className: "border-success/30 bg-success/10 text-success" },
  // Matches the Badge "info" variant, which maps to the chart-3 token.
  fulfillment: {
    icon: Truck,
    className:
      "border-[hsl(var(--chart-3)/0.3)] bg-[hsl(var(--chart-3)/0.14)] text-[hsl(var(--chart-3))]",
  },
  delivery: { icon: PackageCheck, className: "border-success/30 bg-success/10 text-success" },
  refund: { icon: RotateCcw, className: "border-warning/30 bg-warning/10 text-warning" },
  cancelled: { icon: X, className: "border-destructive/30 bg-destructive/10 text-destructive" },
  event: { icon: Info, className: "border-border bg-muted text-muted-foreground" },
};

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No activity recorded for this order yet.
      </p>
    );
  }
  return (
    <ol className="relative">
      {entries.map((e, i) => {
        const style = STEP_STYLE[e.kind] ?? STEP_STYLE.event;
        const Icon = style.icon;
        const last = i === entries.length - 1;
        return (
          <li key={e.id} className={cn("relative flex gap-4", !last && "pb-6")}>
            {/* Connector runs from this dot to the next one. */}
            {!last ? (
              <span
                aria-hidden
                className="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-border"
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                style.className,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="font-medium leading-snug">{e.title}</p>
                <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(e.at)}
                </time>
              </div>
              {e.detail ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>
              ) : null}
              {e.amount !== undefined && e.amount > 0 ? (
                <p className="mt-0.5 text-sm font-medium tabular-nums">
                  {formatCurrency(e.amount)}
                </p>
              ) : null}
              {e.reference ? (
                <p className="mt-1 text-xs">
                  {e.referenceUrl ? (
                    <a
                      href={e.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                    >
                      {e.reference}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-muted-foreground">{e.reference}</span>
                  )}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "muted" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={cn("text-muted-foreground", strong && "font-medium text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          strong && "text-base font-semibold",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // No state is touched before the first await, so mounting this doesn't
  // cascade a render. `isStale` drops a response whose request has been
  // superseded (order changed, or a manual retry raced the initial load).
  const load = React.useCallback(
    async (isStale: () => boolean = () => false) => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as
          | { order?: OrderDetail; error?: string }
          | null;
        if (isStale()) return;
        if (!res.ok || !body?.order) {
          setError(body?.error ?? `Failed to load this order (${res.status}).`);
          setOrder(null);
        } else {
          setOrder(body.order);
          setError(null);
        }
      } catch {
        if (isStale()) return;
        setError("Network error while loading this order.");
        setOrder(null);
      } finally {
        if (!isStale()) setLoading(false);
      }
    },
    [orderId],
  );

  React.useEffect(() => {
    let cancelled = false;
    // Fetch-on-mount: every setState lands in an async continuation, after the
    // await, so nothing is set synchronously during the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  function retry() {
    setLoading(true);
    setError(null);
    void load();
  }

  const backLink = (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/dashboard/orders">
        <ArrowLeft />
        Orders
      </Link>
    </Button>
  );

  if (loading) return <LoadingState label="Loading order…" />;

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div>{backLink}</div>
        <Card>
          <div className="p-5">
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load this order"
              description={error ?? "Unknown error."}
              action={
                <Button onClick={retry}>
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          </div>
        </Card>
      </div>
    );
  }

  const pay = PAYMENT_BADGE[order.payment] ?? { label: order.payment, variant: "outline" as const };
  const ful =
    FULFILLMENT_BADGE[order.fulfillment] ?? { label: order.fulfillment, variant: "outline" as const };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          {backLink}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {order.number || `Order ${order.id}`}
            </h1>
            <Badge variant={pay.variant}>{pay.label}</Badge>
            <Badge variant={ful.variant}>{ful.label}</Badge>
            <Badge variant={order.channel === "pos" ? "primary" : "info"}>
              {order.channel === "pos" ? "POS" : "Online"}
            </Badge>
            {order.cancelledAt ? <Badge variant="destructive">Cancelled</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Placed {formatDateTime(order.createdAt)} · {order.customer.name}
          </p>
        </div>
        <Button variant="outline" onClick={retry}>
          <RefreshCw />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline entries={order.timeline} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            {order.lineItems.length === 0 ? (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No line items returned for this order.
                </p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{li.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {[li.variantTitle, li.sku].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{li.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(li.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.fulfillments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing shipped yet — this order has no fulfillments.
                </p>
              ) : (
                order.fulfillments.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-muted-foreground" />
                        <span className="font-medium">
                          {f.displayStatus || f.status || "Shipment"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {f.createdAt ? formatDateTime(f.createdAt) : ""}
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {f.trackingCompany ? (
                        <div>
                          <dt className="text-xs text-muted-foreground">Carrier</dt>
                          <dd>{f.trackingCompany}</dd>
                        </div>
                      ) : null}
                      {f.trackingNumber ? (
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Tracking</dt>
                          <dd className="truncate font-mono text-[13px]">
                            {f.trackingUrl ? (
                              <a
                                href={f.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                {f.trackingNumber}
                                <ExternalLink className="size-3 shrink-0" />
                              </a>
                            ) : (
                              f.trackingNumber
                            )}
                          </dd>
                        </div>
                      ) : null}
                      {f.estimatedDeliveryAt ? (
                        <div>
                          <dt className="text-xs text-muted-foreground">Est. delivery</dt>
                          <dd>{formatDateTime(f.estimatedDeliveryAt)}</dd>
                        </div>
                      ) : null}
                      {f.deliveredAt ? (
                        <div>
                          <dt className="text-xs text-muted-foreground">Delivered</dt>
                          <dd>{formatDateTime(f.deliveredAt)}</dd>
                        </div>
                      ) : null}
                    </dl>

                    {f.items.length > 0 ? (
                      <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
                        {f.items.map((i, idx) => (
                          <li key={`${f.id}-${idx}`} className="flex justify-between gap-3">
                            <span className="truncate">{i.title}</span>
                            <span className="shrink-0 tabular-nums">×{i.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <SummaryRow label="Subtotal" value={formatCurrency(order.totals.subtotal)} />
              <SummaryRow label="Shipping" value={formatCurrency(order.totals.shipping)} />
              <SummaryRow label="Tax" value={formatCurrency(order.totals.tax)} />
              <div className="border-t border-border pt-2.5">
                <SummaryRow label="Total" value={formatCurrency(order.totals.total)} strong />
              </div>
              {order.totals.refunded > 0 ? (
                <SummaryRow
                  label="Refunded"
                  value={`−${formatCurrency(order.totals.refunded)}`}
                  tone="warning"
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              {order.customer.email ? (
                <a
                  href={`mailto:${order.customer.email}`}
                  className="block truncate text-primary hover:underline"
                >
                  {order.customer.email}
                </a>
              ) : null}
              {order.customer.phone ? (
                <p className="text-muted-foreground">{order.customer.phone}</p>
              ) : null}
            </CardContent>
          </Card>

          {order.shippingAddress ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Shipping address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {order.shippingAddress}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payment transactions recorded.
                </p>
              ) : (
                order.transactions.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium capitalize">{t.kind.replace(/_/g, " ")}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[t.gateway, t.status].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums">{formatCurrency(t.amount)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {order.note || order.tags.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes &amp; tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.note ? (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {order.note}
                  </p>
                ) : null}
                {order.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {order.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
