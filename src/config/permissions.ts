import { NAV } from "./nav";

/**
 * Role-based access, per page. Every sidebar page is an *area*; each user
 * holds one level per area:
 *
 *   none   — the page is hidden and its data / actions are refused
 *   view   — read-only: the page shows, but nothing can be created, edited, or acted on
 *   manage — full use of the page
 *
 * The Owner (the ADMIN_USERNAME account from the environment) always has
 * everything and can't be edited or locked out. Other users live in MongoDB
 * (src/lib/users.ts) with a per-user checklist of levels. Client-safe.
 */

export type Level = "none" | "view" | "manage";
export const LEVELS: Level[] = ["none", "view", "manage"];
const RANK: Record<Level, number> = { none: 0, view: 1, manage: 2 };

export const atLeast = (have: Level | undefined, need: Level) => RANK[have ?? "none"] >= RANK[need];

export type Permissions = Record<string, Level>;

export interface Area {
  key: string;
  label: string;
  href: string;
  group: string;
}

/** "/dashboard/pos/till" → "till", "/dashboard/orders" → "orders". */
export function areaKeyOf(href: string): string {
  const rest = href.replace(/^\/dashboard\/?/, "");
  if (rest === "pos/till") return "till";
  return rest.split("/")[0] ?? "";
}

/** Pages everyone signed in can open: the home page, the guide, and their own account. */
const ALWAYS_OPEN = new Set(["", "guide", "account"]);

/** The permission checklist: every sidebar page except the always-open ones. */
export const AREAS: Area[] = NAV.flatMap((cat) =>
  cat.items
    .filter((i) => !ALWAYS_OPEN.has(areaKeyOf(i.href)))
    .map((i) => ({ key: areaKeyOf(i.href), label: i.title, href: i.href, group: cat.label })),
);

/**
 * Data a page reads from other pages' resources (pickers, summaries). Being
 * able to view the page grants read access to these — never write access.
 */
export const READS_ALSO: Record<string, string[]> = {
  analytics: ["orders", "customers", "products", "transactions"],
  segments: ["customers"],
  "stock-adjustments": ["inventory", "locations"],
  "purchase-orders": ["suppliers", "locations", "inventory"],
  transfers: ["locations", "inventory"],
  stocktakes: ["locations", "inventory"],
  inventory: ["locations"],
  orders: ["dispatch"],
  shipments: ["orders"],
  dispatch: ["orders", "shipments"],
  "return-load-sheets": ["returns"],
  "cod-remittances": ["shipments", "dispatch"],
  "courier-performance": ["shipments"],
  pos: ["registers", "locations", "pos-staff", "orders"],
  till: ["registers", "orders"],
  registers: ["locations"],
  "pos-staff": ["locations"],
  returns: ["return-load-sheets"],
};

export interface Access {
  isOwner: boolean;
  permissions: Permissions;
}

export function levelOf(access: Access, area: string): Level {
  if (access.isOwner || ALWAYS_OPEN.has(area)) return "manage";
  return access.permissions[area] ?? "none";
}

export function can(access: Access, area: string, need: Level): boolean {
  return atLeast(levelOf(access, area), need);
}

/** May this user read a resource's rows? Its own page, or any page that reads it. */
export function canRead(access: Access, resource: string): boolean {
  if (can(access, resource, "view")) return true;
  return Object.entries(READS_ALSO).some(([area, reads]) => reads.includes(resource) && can(access, area, "view"));
}

/** May this user open a dashboard path? */
export function canOpenPath(access: Access, pathname: string): boolean {
  return can(access, areaKeyOf(pathname), "view");
}

/** A permission set with every area at one level (for quick presets in the user editor). */
export function allAt(level: Level): Permissions {
  return Object.fromEntries(AREAS.map((a) => [a.key, level]));
}

/** Keep only known areas and valid levels. */
export function sanitizePermissions(input: unknown): Permissions {
  const out: Permissions = {};
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  for (const a of AREAS) {
    const v = src[a.key];
    out[a.key] = v === "view" || v === "manage" ? v : "none";
  }
  return out;
}
