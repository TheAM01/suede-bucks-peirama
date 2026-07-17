import type { Row } from "@/config/resource-types";

/**
 * Pure aggregation helpers for the overview/analytics pages. Everything is
 * computed from store rows (`createdAt` is an ISO `YYYY-MM-DD` string) — no
 * placeholder numbers. Deltas return `undefined` when the comparison window
 * has no data, so the UI simply omits the badge instead of inventing one.
 */

const DAY_MS = 86_400_000;

const num = (r: Row, k: string) => Number(r[k] ?? 0);
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export interface Trend {
  data: number[];
  labels: string[];
  total: number;
}

/** Daily revenue for the trailing `days` days, oldest first. */
export function revenueTrend(orders: Row[], days: number): Trend {
  const now = Date.now();
  const keys = Array.from({ length: days }, (_, i) =>
    dayKey(now - (days - 1 - i) * DAY_MS),
  );
  const buckets = new Map(keys.map((k) => [k, 0]));
  for (const o of orders) {
    const k = String(o.createdAt ?? "").slice(0, 10);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + num(o, "total"));
  }
  const data = keys.map((k) => buckets.get(k) ?? 0);
  const labelEvery = days > 14 ? 3 : 2;
  const labels = keys.map((k, i) =>
    i % labelEvery === 0 ? String(Number(k.slice(8))) : "",
  );
  return { data, labels, total: data.reduce((a, b) => a + b, 0) };
}

/** Sum (or count when `valueKey` is omitted) over the trailing window and the window before it. */
export function windowTotals(
  rows: Row[],
  days: number,
  valueKey?: string,
): { cur: number; prev: number } {
  const now = Date.now();
  const win = days * DAY_MS;
  let cur = 0;
  let prev = 0;
  for (const r of rows) {
    const t = Date.parse(String(r.createdAt ?? ""));
    if (!Number.isFinite(t)) continue;
    const v = valueKey ? num(r, valueKey) : 1;
    if (t > now - win) cur += v;
    else if (t > now - 2 * win) prev += v;
  }
  return { cur, prev };
}

/** Signed % change, or `undefined` when there is no baseline to compare against. */
export function pctChange(cur: number, prev: number): number | undefined {
  if (prev <= 0) return undefined;
  return ((cur - prev) / prev) * 100;
}

/** % change of the trailing `days` window vs the window before it. */
export function periodDelta(
  rows: Row[],
  days: number,
  valueKey?: string,
): number | undefined {
  const { cur, prev } = windowTotals(rows, days, valueKey);
  return pctChange(cur, prev);
}

/** Current calendar month's revenue and its month-over-month delta. */
export function monthOverMonth(orders: Row[]): { revenue: number; delta?: number } {
  const now = new Date();
  const curKey = now.toISOString().slice(0, 7);
  const prevKey = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  )
    .toISOString()
    .slice(0, 7);
  let cur = 0;
  let prev = 0;
  for (const o of orders) {
    const k = String(o.createdAt ?? "").slice(0, 7);
    if (k === curKey) cur += num(o, "total");
    else if (k === prevKey) prev += num(o, "total");
  }
  return { revenue: cur, delta: pctChange(cur, prev) };
}
