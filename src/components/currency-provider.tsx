"use client";

import * as React from "react";
import {
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  findCurrency,
  setActiveCurrency,
  type CurrencyDef,
} from "@/lib/currency";

interface CurrencyContextValue {
  currency: CurrencyDef;
  setCurrency: (code: string) => void;
}

const Ctx = React.createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState<CurrencyDef>(DEFAULT_CURRENCY);

  // Read after mount rather than during render: the server has no access to
  // localStorage, so touching it during render would desync hydration.
  React.useEffect(() => {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (!stored) return;
    const next = findCurrency(stored);
    if (!next || next.code === DEFAULT_CURRENCY.code) return;
    setActiveCurrency(next.code);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrencyState(next);
  }, []);

  const setCurrency = React.useCallback((code: string) => {
    const next = setActiveCurrency(code);
    setCurrencyState(next);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, next.code);
  }, []);

  const value = React.useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useCurrency must be used within <CurrencyProvider>");
  return ctx;
}
