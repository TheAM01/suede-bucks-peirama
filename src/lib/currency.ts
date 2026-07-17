/**
 * Currency registry and the app's active-currency state.
 *
 * There is no settings backend, so the operator's choice is persisted to
 * localStorage and applied on the client. The module-level `active` value
 * exists because `formatCurrency` is called from plain functions (resource
 * stat computations) that can't read React context; `CurrencyProvider` keeps
 * it in sync and re-renders the tree when it changes.
 *
 * Amounts are formatted, never converted — figures are shown in whatever
 * currency the store reports them in.
 */

export interface CurrencyDef {
  code: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: "USD", label: "US Dollar", locale: "en-US" },
  { code: "GBP", label: "British Pound", locale: "en-GB" },
  { code: "EUR", label: "Euro", locale: "en-IE" },
  { code: "PKR", label: "Pakistani Rupee", locale: "en-PK" },
];

export const DEFAULT_CURRENCY = CURRENCIES[0];

export const CURRENCY_STORAGE_KEY = "suedebucks:currency";

export function findCurrency(code: string): CurrencyDef | undefined {
  return CURRENCIES.find((c) => c.code === code);
}

// Server renders always use the default; only the client provider mutates this.
let active: CurrencyDef = DEFAULT_CURRENCY;

export function getActiveCurrency(): CurrencyDef {
  return active;
}

export function setActiveCurrency(code: string): CurrencyDef {
  active = findCurrency(code) ?? DEFAULT_CURRENCY;
  return active;
}
