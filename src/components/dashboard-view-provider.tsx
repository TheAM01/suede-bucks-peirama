"use client";

import * as React from "react";
import {
  DASHBOARD_VIEW_STORAGE_KEY,
  DEFAULT_DASHBOARD_VIEW,
  isDashboardView,
  type DashboardView,
} from "@/lib/dashboard-view";

interface DashboardViewContextValue {
  view: DashboardView;
  setView: (v: DashboardView) => void;
}

const Ctx = React.createContext<DashboardViewContextValue | null>(null);

export function DashboardViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = React.useState<DashboardView>(DEFAULT_DASHBOARD_VIEW);

  // Read after mount rather than during render: the server has no access to
  // localStorage, so touching it during render would desync hydration.
  React.useEffect(() => {
    const stored = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
    if (!stored || !isDashboardView(stored) || stored === DEFAULT_DASHBOARD_VIEW) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewState(stored);
  }, []);

  const setView = React.useCallback((v: DashboardView) => {
    setViewState(v);
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, v);
  }, []);

  const value = React.useMemo(() => ({ view, setView }), [view, setView]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardView(): DashboardViewContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDashboardView must be used within DashboardViewProvider");
  return ctx;
}
