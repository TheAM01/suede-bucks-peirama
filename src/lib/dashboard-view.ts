/**
 * The Legacy/New dashboard view setting.
 *
 * There is no settings backend, so the operator's choice is persisted to
 * localStorage and applied on the client — same pattern as `lib/currency.ts`.
 * "Legacy" hides sidebar links added after the original page set, without
 * blocking their routes: a hidden page is still reachable by URL.
 */

export type DashboardView = "legacy" | "new";

export const DASHBOARD_VIEW_STORAGE_KEY = "suedebucks:dashboard-view";

export const DEFAULT_DASHBOARD_VIEW: DashboardView = "new";

/** Sidebar hrefs visible in "Legacy" mode — everything else is hidden, not blocked. */
export const LEGACY_VISIBLE_HREFS = new Set<string>([
  "/dashboard",
  "/dashboard/analytics",
  "/dashboard/customers",
  "/dashboard/products",
  "/dashboard/inventory",
  "/dashboard/stock-adjustments",
  "/dashboard/orders",
  "/dashboard/draft-orders",
  "/dashboard/returns",
  "/dashboard/dispatch",
  "/dashboard/return-load-sheets",
  "/dashboard/leads",
  "/dashboard/settings",
  "/dashboard/integrations",
  "/dashboard/guide",
]);

export function isDashboardView(v: string): v is DashboardView {
  return v === "legacy" || v === "new";
}
