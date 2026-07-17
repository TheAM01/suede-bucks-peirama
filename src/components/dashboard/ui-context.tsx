"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export const PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [50, 100, 300];

interface DashboardUI {
  search: string;
  setSearch: (s: string) => void;
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  total: number;
  setTotal: (n: number) => void;
}

const Ctx = React.createContext<DashboardUI | null>(null);

export function DashboardUIProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSizeState] = React.useState(PAGE_SIZE);
  const [total, setTotal] = React.useState(0);

  // Changing page size jumps back to the first page so the view stays coherent.
  const setPageSize = React.useCallback((n: number) => {
    setPageSizeState(n);
    setPage(1);
  }, []);

  // Reset transient view state on navigation. Done during render (guarded by a
  // path change) rather than in an effect — the React-recommended pattern for
  // adjusting state when an input changes, and it avoids a wasted re-render.
  const [prevPath, setPrevPath] = React.useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setSearch("");
    setPage(1);
    // Reset the row count so pages that don't paginate (dashboard, analytics,
    // settings, POS, guide) report 0 and the bottom-bar controls stay hidden
    // until a list page publishes a real total.
    setTotal(0);
  }

  const value = React.useMemo(
    () => ({ search, setSearch, page, setPage, pageSize, setPageSize, total, setTotal }),
    [search, page, pageSize, setPageSize, total],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardUI(): DashboardUI {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDashboardUI must be used within DashboardUIProvider");
  return ctx;
}
