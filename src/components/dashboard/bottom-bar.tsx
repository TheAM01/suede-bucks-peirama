"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  HelpCircle,
  ShoppingBag,
  Server,
} from "@/components/icons";
import { navItemForPath } from "@/config/nav";
import { useDashboardUI, PAGE_SIZE_OPTIONS } from "./ui-context";
import { cn } from "@/lib/utils";
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuTrigger,
} from "@/components/ui/menu";

interface ServiceStatus {
  ok: boolean;
  detail: string;
}

const SERVICE_META = [
  { key: "app" as const, label: "Application", icon: Server },
  { key: "db" as const, label: "Database", icon: Database },
  { key: "shopify" as const, label: "Shopify", icon: ShoppingBag },
];

const INITIAL_STATUS: Record<string, ServiceStatus> = {
  app: { ok: true, detail: "Checking…" },
  db: { ok: true, detail: "Checking…" },
  shopify: { ok: true, detail: "Checking…" },
};

const STATUS_POLL_MS = 60_000;

/** Poll the auth-gated status API for live connectivity. */
function useConnectivity(): Record<string, ServiceStatus> {
  const [status, setStatus] = React.useState(INITIAL_STATUS);
  React.useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Record<string, ServiceStatus>;
        if (!cancelled) setStatus((prev) => ({ ...prev, ...json }));
      } catch {
        // Network failure: the app itself is unreachable-ish; mark app degraded.
        if (!cancelled) {
          setStatus((prev) => ({
            ...prev,
            app: { ok: false, detail: "Status check failed" },
          }));
        }
      }
    }
    poll();
    const t = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  return status;
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex size-2">
      {ok ? (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
      ) : null}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          ok ? "bg-success" : "bg-destructive",
        )}
      />
    </span>
  );
}

export function BottomBar() {
  const pathname = usePathname();
  const nav = navItemForPath(pathname);
  const { page, setPage, pageSize, setPageSize, total } = useDashboardUI();

  const status = useConnectivity();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const allOk = SERVICE_META.every((s) => status[s.key]?.ok);

  const showPagination = total > 0;

  return (
    <footer className="sticky bottom-0 z-20 h-8 shrink-0 border-t border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid h-8 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 text-xs md:px-8">
        {/* Left: connectivity + how-to */}
        <div className="flex items-center gap-1.5 justify-self-start">
          <Menu>
            <MenuTrigger>
              <button
                type="button"
                title="Connectivity status"
                className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="flex items-center gap-1">
                  {SERVICE_META.map((s) => (
                    <Dot key={s.key} ok={status[s.key]?.ok ?? true} />
                  ))}
                </span>
                <span className="hidden font-medium sm:inline">
                  {allOk ? "Live" : "Degraded"}
                </span>
              </button>
            </MenuTrigger>
            <MenuContent align="start" width="w-64" className="mb-2 mt-0 -translate-y-full">
              <MenuLabel>System status</MenuLabel>
              {SERVICE_META.map((s) => {
                const Icon = s.icon;
                const st = status[s.key] ?? { ok: true, detail: "…" };
                return (
                  <div
                    key={s.key}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{st.detail}</p>
                    </div>
                    <Dot ok={st.ok} />
                  </div>
                );
              })}
            </MenuContent>
          </Menu>

          <span className="hidden h-4 w-px bg-border sm:block" />

          <Link
            href={`/dashboard/guide#${nav?.guide ?? "overview"}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <HelpCircle className="size-3.5" />
            <span className="hidden sm:inline">How to use this page</span>
            <span className="sm:hidden">Help</span>
          </Link>
        </div>

        {/* Center: pagination (hidden on pages that don't paginate) */}
        <div className="justify-self-center">
          {showPagination ? (
            <div className="flex items-center gap-2 tabular-nums text-muted-foreground">
              <label className="hidden items-center gap-1.5 md:flex">
                <span>Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-6 cursor-pointer rounded-md border border-border bg-card pl-1.5 pr-5 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Rows per page"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <span className="hidden h-4 w-px bg-border md:block" />
              <span className="hidden sm:inline">
                {from}–{to} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="flex size-6 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="min-w-[3.5rem] text-center font-medium text-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="flex size-6 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: wordmark */}
        <div className="flex items-center gap-1.5 justify-self-end text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          <span className="font-grotesk font-semibold tracking-tight">
            SuedeBucks/Peirama
          </span>
        </div>
      </div>
    </footer>
  );
}
