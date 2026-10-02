"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  User,
  X,
} from "@/components/icons";
import {
  PAYMENT_METHODS,
  computeCart,
  type CartLineInput,
  type Discount,
  type PaymentMethod,
} from "@/config/pos";
import { useResource, useStore } from "@/lib/store";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";

// --- types & helpers ------------------------------------------------------------------

interface CatalogItem {
  variantId: string;
  title: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  barcode: string;
  price: number;
  available: number | null;
}

interface Cashier {
  id: string;
  name: string;
  role: string;
}

type CustomerChoice =
  | { kind: "existing"; id: string; name: string; phone: string }
  | { kind: "new"; firstName: string; lastName: string; phone: string; email: string };

interface ExchangeCredit {
  orderName: string;
  credit: number;
}

const REGISTER_KEY = "suedebucks:pos-register";

async function api<T>(url: string, init?: RequestInit): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !body) return { error: body?.error ?? `Server responded ${res.status}.` };
    return { data: body };
  } catch {
    return { error: "Couldn't reach the server." };
  }
}

function readStoredRegister(): string {
  try {
    return localStorage.getItem(REGISTER_KEY) ?? "";
  } catch {
    return "";
  }
}

// --- the till ----------------------------------------------------------------------------

/**
 * The point-of-sale till. Pick the register (remembered on this device), sign
 * in with a staff PIN, then scan or search products into the cart, add
 * discounts and a customer, and take payment — the sale becomes a paid,
 * fulfilled Shopify order from the register's store (src/lib/pos.ts). Return
 * mode refunds or exchanges items from an earlier sale.
 */
export function PosTill() {
  const store = useStore();
  const toast = useToast();
  const registers = useResource("registers");
  const usable = registers.rows.filter((r) => r.status !== "inactive" && r.locationId);

  const [registerId, setRegisterId] = React.useState("");
  const [registerReady, setRegisterReady] = React.useState(false);
  React.useEffect(() => {
    // localStorage is per-device and only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegisterId(readStoredRegister());
    setRegisterReady(true);
  }, []);
  const register = usable.find((r) => r.id === registerId) ?? null;

  const [cashier, setCashier] = React.useState<{ cashier: Cashier; pin: string } | null>(null);
  const [mode, setMode] = React.useState<"sale" | "return">("sale");

  function chooseRegister(id: string) {
    setRegisterId(id);
    try {
      localStorage.setItem(REGISTER_KEY, id);
    } catch {
      // per-device convenience only
    }
  }

  if (registers.loading || !registerReady) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading registers…</p>;
  }

  if (!register) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Which register is this?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {usable.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No registers ready to sell"
              description={
                registers.error
                  ? registers.error
                  : "Add a register on the Registers page and pick the store it sells from."
              }
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                This device remembers its register. Sales take stock from that register&apos;s store.
              </p>
              <div className="grid gap-2">
                {usable.map((r) => (
                  <Button key={r.id} variant="outline" className="h-auto justify-start py-3" onClick={() => chooseRegister(r.id)}>
                    <span className="text-left">
                      <span className="block font-medium">{String(r.name)}</span>
                      <span className="block text-xs text-muted-foreground">{String(r.location ?? "")}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!cashier) {
    return (
      <PinPad
        registerName={String(register.name)}
        onChangeRegister={() => chooseRegister("")}
        onSignedIn={(c, pin) => {
          setCashier({ cashier: c, pin });
          toast.success(`Signed in as ${c.name}`, String(register.name));
        }}
      />
    );
  }

  return (
    <TillWorkspace
      key={register.id}
      register={{ id: register.id, name: String(register.name), location: String(register.location ?? "") }}
      cashier={cashier.cashier}
      pin={cashier.pin}
      mode={mode}
      setMode={setMode}
      onSwitchCashier={() => setCashier(null)}
      onChangeRegister={() => {
        setCashier(null);
        chooseRegister("");
      }}
      onSaleDone={() => store.refresh("orders")}
    />
  );
}

// --- PIN sign-in --------------------------------------------------------------------------

function PinPad({
  registerName,
  onSignedIn,
  onChangeRegister,
}: {
  registerName: string;
  onSignedIn: (c: Cashier, pin: string) => void;
  onChangeRegister: () => void;
}) {
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(value = pin) {
    if (value.length < 4) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await api<{ cashier: Cashier }>("/api/pos/cashier", {
      method: "POST",
      body: JSON.stringify({ pin: value }),
    });
    setBusy(false);
    if (data?.cashier) onSignedIn(data.cashier, value);
    else {
      setError(err ?? "Couldn't sign in.");
      setPin("");
    }
  }

  const press = (d: string) => setPin((p) => (p.length < 8 ? p + d : p));

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Cashier sign-in</CardTitle>
        <p className="text-sm text-muted-foreground">{registerName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Enter your PIN"
            aria-label="PIN"
            className="text-center text-lg tracking-[0.5em]"
          />
        </form>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Button key={d} type="button" variant="outline" className="h-12 text-lg" onClick={() => press(d)} disabled={busy}>
              {d}
            </Button>
          ))}
          <Button type="button" variant="ghost" className="h-12" onClick={() => setPin("")} disabled={busy} aria-label="Clear">
            <X />
          </Button>
          <Button type="button" variant="outline" className="h-12 text-lg" onClick={() => press("0")} disabled={busy}>
            0
          </Button>
          <Button type="button" className="h-12" onClick={() => void submit()} disabled={busy || pin.length < 4} aria-label="Sign in">
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
          </Button>
        </div>
        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
        <Button variant="ghost" size="sm" className="w-full" onClick={onChangeRegister}>
          Use a different register
        </Button>
      </CardContent>
    </Card>
  );
}

// --- workspace ------------------------------------------------------------------------------

interface CartEntry extends CartLineInput {
  available: number | null;
}

function TillWorkspace({
  register,
  cashier,
  pin,
  mode,
  setMode,
  onSwitchCashier,
  onChangeRegister,
  onSaleDone,
}: {
  register: { id: string; name: string; location: string };
  cashier: Cashier;
  pin: string;
  mode: "sale" | "return";
  setMode: (m: "sale" | "return") => void;
  onSwitchCashier: () => void;
  onChangeRegister: () => void;
  onSaleDone: () => void;
}) {
  const toast = useToast();
  const [catalog, setCatalog] = React.useState<CatalogItem[]>([]);
  const [catalogState, setCatalogState] = React.useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });
  const [cart, setCart] = React.useState<CartEntry[]>([]);
  const [cartDiscount, setCartDiscount] = React.useState<Discount | null>(null);
  const [customer, setCustomer] = React.useState<CustomerChoice | null>(null);
  const [exchange, setExchange] = React.useState<ExchangeCredit | null>(null);
  const [paying, setPaying] = React.useState(false);
  const [done, setDone] = React.useState<{ orderId: string; name: string; total: number; change: number; method: string } | null>(null);

  const loadCatalog = React.useCallback(async () => {
    setCatalogState({ loading: true, error: null });
    const { data, error } = await api<{ items: CatalogItem[] }>(`/api/pos/catalog?registerId=${encodeURIComponent(register.id)}`);
    if (data) setCatalog(data.items);
    setCatalogState({ loading: false, error: data ? null : (error ?? "Couldn't load products.") });
  }, [register.id]);

  React.useEffect(() => {
    // Fetch-on-mount: state is only set after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCatalog();
  }, [loadCatalog]);

  const totals = computeCart(cart, cartDiscount, exchange?.credit ?? 0);

  function addItem(item: CatalogItem) {
    setCart((prev) => {
      const at = prev.findIndex((l) => l.variantId === item.variantId);
      if (at >= 0) return prev.map((l, i) => (i === at ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        { variantId: item.variantId, title: item.title, sku: item.sku, unitPrice: item.price, quantity: 1, discount: null, available: item.available },
      ];
    });
  }

  function resetSale() {
    setCart([]);
    setCartDiscount(null);
    setCustomer(null);
    setExchange(null);
    setDone(null);
  }

  return (
    <div className="space-y-4">
      {/* Till header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <Button size="sm" variant={mode === "sale" ? "default" : "ghost"} onClick={() => setMode("sale")}>
              Sale
            </Button>
            <Button size="sm" variant={mode === "return" ? "default" : "ghost"} onClick={() => setMode("return")}>
              <RotateCcw />
              Return
            </Button>
          </div>
          <Badge variant="outline">{register.name}</Badge>
          <span className="text-sm text-muted-foreground">{register.location}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">
            <User />
            {cashier.name}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onSwitchCashier}>
            Switch cashier
          </Button>
          <Button variant="ghost" size="sm" onClick={onChangeRegister}>
            Change register
          </Button>
        </div>
      </div>

      {mode === "return" ? (
        <ReturnDesk
          registerId={register.id}
          pin={pin}
          onExchange={(credit) => {
            setExchange(credit);
            setMode("sale");
            toast.info(`Exchange credit ${formatCurrency(credit.credit)}`, `Add the replacement items — the credit comes off this sale.`);
          }}
          onRefunded={() => void loadCatalog()}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <ProductPicker
            items={catalog}
            loading={catalogState.loading}
            error={catalogState.error}
            onReload={() => void loadCatalog()}
            onAdd={addItem}
            onNotFound={(code) => toast.error("Not found", `No product with barcode or SKU ${code}.`)}
          />
          <CartPanel
            cart={cart}
            setCart={setCart}
            totals={totals}
            cartDiscount={cartDiscount}
            setCartDiscount={setCartDiscount}
            customer={customer}
            setCustomer={setCustomer}
            exchange={exchange}
            onClearExchange={() => setExchange(null)}
            onPay={() => setPaying(true)}
            onClear={resetSale}
          />
        </div>
      )}

      {paying ? (
        <PaymentDialog
          total={totals.total}
          onClose={() => setPaying(false)}
          onPaid={async (payment) => {
            const { data, error } = await api<{ orderId: string; name: string; total: number; change: number }>("/api/pos/sale", {
              method: "POST",
              body: JSON.stringify({
                registerId: register.id,
                pin,
                lines: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity, discount: l.discount })),
                cartDiscount,
                customer:
                  customer?.kind === "existing"
                    ? { id: customer.id }
                    : customer?.kind === "new"
                      ? { firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone, email: customer.email }
                      : null,
                payment,
                exchange,
              }),
            });
            if (!data) {
              toast.error("Sale not completed", error);
              return false;
            }
            // Stock left the shelf: show it straight away, then confirm from Shopify.
            setCatalog((prev) =>
              prev.map((it) => {
                const sold = cart.find((l) => l.variantId === it.variantId);
                return sold && it.available != null ? { ...it, available: it.available - sold.quantity } : it;
              }),
            );
            setPaying(false);
            setDone({ ...data, method: PAYMENT_METHODS.find((m) => m.value === payment.method)?.label ?? "" });
            toast.success(`Sale ${data.name} complete`, formatCurrency(data.total));
            onSaleDone();
            return true;
          }}
        />
      ) : null}

      {done ? (
        <Dialog
          open
          onClose={resetSale}
          title={`Sale ${done.name} complete`}
          footer={
            <>
              <Button variant="outline" onClick={() => window.open(`/print/receipt/${done.orderId}`, "_blank", "noopener")}>
                <Printer />
                Print receipt
              </Button>
              <Button onClick={resetSale} autoFocus>
                New sale
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Total paid by {done.method}</p>
            <p className="font-heading text-3xl font-semibold">{formatCurrency(done.total)}</p>
            {done.change > 0 ? (
              <p className="rounded-lg bg-success/10 px-3 py-2 text-lg font-semibold text-success">
                Change due: {formatCurrency(done.change)}
              </p>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

// --- products --------------------------------------------------------------------------------

function ProductPicker({
  items,
  loading,
  error,
  onReload,
  onAdd,
  onNotFound,
}: {
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onAdd: (item: CatalogItem) => void;
  onNotFound: (code: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const shown = (q
    ? items.filter((i) => i.title.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.barcode.toLowerCase() === q)
    : items
  ).slice(0, 48);

  return (
    <Card className="min-w-0">
      <CardContent className="space-y-4 pt-5">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!q) return;
            // A scanner types the code and presses Enter: exact barcode / SKU adds straight to the cart.
            const exact = items.find((i) => i.barcode.toLowerCase() === q || i.sku.toLowerCase() === q);
            if (exact) onAdd(exact);
            else if (shown.length === 1) onAdd(shown[0]);
            else if (shown.length === 0) onNotFound(query.trim());
            else return;
            setQuery("");
            ref.current?.focus();
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={ref}
              autoFocus
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scan a barcode, or search by name or SKU"
              aria-label="Scan or search products"
              autoComplete="off"
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onReload} aria-label="Reload products" disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading && items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading products…
          </p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{q ? "No products match." : "No products to sell."}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((i) => (
              <button
                key={i.variantId}
                type="button"
                onClick={() => {
                  onAdd(i);
                  ref.current?.focus();
                }}
                className="flex min-h-24 flex-col justify-between rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span className="line-clamp-2 text-sm font-medium">{i.title}</span>
                <span className="mt-2 flex items-end justify-between gap-2">
                  <span className="font-semibold tabular-nums">{formatCurrency(i.price)}</span>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      i.available == null ? "text-muted-foreground" : i.available <= 0 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {i.available == null ? "—" : `${formatNumber(i.available)} here`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- cart ------------------------------------------------------------------------------------

function DiscountEditor({
  value,
  onChange,
  label,
}: {
  value: Discount | null;
  onChange: (d: Discount | null) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Select
        aria-label={`${label} type`}
        className="h-8 w-20"
        value={value?.type ?? "percent"}
        onChange={(e) => onChange({ type: e.target.value as Discount["type"], value: value?.value ?? 0 })}
      >
        <option value="percent">%</option>
        <option value="amount">Amt</option>
      </Select>
      <Input
        aria-label={label}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className="h-8 w-24 text-right"
        value={value?.value ? String(value.value) : ""}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(n > 0 ? { type: value?.type ?? "percent", value: n } : null);
        }}
      />
    </div>
  );
}

function CartPanel({
  cart,
  setCart,
  totals,
  cartDiscount,
  setCartDiscount,
  customer,
  setCustomer,
  exchange,
  onClearExchange,
  onPay,
  onClear,
}: {
  cart: CartEntry[];
  setCart: React.Dispatch<React.SetStateAction<CartEntry[]>>;
  totals: ReturnType<typeof computeCart>;
  cartDiscount: Discount | null;
  setCartDiscount: (d: Discount | null) => void;
  customer: CustomerChoice | null;
  setCustomer: (c: CustomerChoice | null) => void;
  exchange: ExchangeCredit | null;
  onClearExchange: () => void;
  onPay: () => void;
  onClear: () => void;
}) {
  const [discountFor, setDiscountFor] = React.useState<string | null>(null);
  const setQty = (id: string, q: number) =>
    setCart((prev) => (q <= 0 ? prev.filter((l) => l.variantId !== id) : prev.map((l) => (l.variantId === id ? { ...l, quantity: q } : l))));
  const unusedCredit = exchange ? Math.max(0, exchange.credit - totals.credit) : 0;

  return (
    <Card className="flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Cart</CardTitle>
        {cart.length ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        {exchange ? (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            <span>
              Exchange credit from <span className="font-mono">{exchange.orderName}</span>:{" "}
              <span className="font-semibold">{formatCurrency(exchange.credit)}</span>
              {unusedCredit > 0 && cart.length ? (
                <span className="block text-xs text-warning">
                  {formatCurrency(unusedCredit)} of it isn&apos;t used by this sale and won&apos;t be paid out.
                </span>
              ) : null}
            </span>
            <button type="button" onClick={onClearExchange} aria-label="Remove exchange credit" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Scan or tap a product to start a sale.</p>
          ) : (
            <ul className="divide-y divide-border">
              {totals.lines.map((l) => {
                const entry = cart.find((c) => c.variantId === l.variantId)!;
                const short = entry.available != null && entry.quantity > entry.available;
                return (
                  <li key={l.variantId} className="space-y-2 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{l.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(l.unitPrice)} each{l.sku ? ` · ${l.sku}` : ""}
                        </p>
                        {short ? <p className="text-xs text-warning">Only {entry.available} in stock here</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">{formatCurrency(l.lineTotal)}</p>
                        {l.discountAmount > 0 ? (
                          <p className="text-xs text-success tabular-nums">−{formatCurrency(l.discountAmount)}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" onClick={() => setQty(l.variantId, l.quantity - 1)} aria-label="One fewer">
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                        <Button variant="outline" size="icon-sm" onClick={() => setQty(l.variantId, l.quantity + 1)} aria-label="One more">
                          <Plus />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDiscountFor(discountFor === l.variantId ? null : l.variantId)}>
                          {entry.discount ? "Discount ✓" : "Discount"}
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setQty(l.variantId, 0)} aria-label={`Remove ${l.title}`}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    {discountFor === l.variantId ? (
                      <DiscountEditor
                        label={`Discount on ${l.title}`}
                        value={entry.discount ?? null}
                        onChange={(d) => setCart((prev) => prev.map((c) => (c.variantId === l.variantId ? { ...c, discount: d } : c)))}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <CustomerPicker value={customer} onChange={setCustomer} />

        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Sale discount</span>
            <DiscountEditor label="Discount on the whole sale" value={cartDiscount} onChange={setCartDiscount} />
          </div>
          <Line label="Items" value={formatCurrency(totals.gross)} />
          {totals.lineDiscounts > 0 ? <Line label="Item discounts" value={`−${formatCurrency(totals.lineDiscounts)}`} /> : null}
          {totals.cartDiscount > 0 ? <Line label="Sale discount" value={`−${formatCurrency(totals.cartDiscount)}`} /> : null}
          {totals.credit > 0 ? <Line label="Exchange credit" value={`−${formatCurrency(totals.credit)}`} /> : null}
          <div className="flex items-center justify-between pt-1 text-lg font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <Button size="lg" className="w-full" disabled={cart.length === 0} onClick={onPay}>
          {totals.total > 0 ? `Charge ${formatCurrency(totals.total)}` : "Complete exchange"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// --- customer --------------------------------------------------------------------------------

function CustomerPicker({ value, onChange }: { value: CustomerChoice | null; onChange: (c: CustomerChoice | null) => void }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{ id: string; name: string; phone: string; email: string }[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ firstName: "", lastName: "", phone: "", email: "" });

  React.useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await api<{ customers: typeof results }>(`/api/pos/customers?q=${encodeURIComponent(query.trim())}`);
      setResults(data?.customers ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (value) {
    const name = value.kind === "existing" ? value.name : `${value.firstName} ${value.lastName}`.trim() || value.phone;
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {name}
            {value.kind === "new" ? <span className="text-muted-foreground"> · new</span> : null}
          </span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label="Remove customer" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <User />
        Add customer (optional)
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      {adding ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="First name" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
            <Input placeholder="Last name" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            <Input placeholder="Phone (+92…)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <Input placeholder="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Back
            </Button>
            <Button
              size="sm"
              disabled={!draft.firstName.trim() && !draft.phone.trim()}
              onClick={() => {
                onChange({ kind: "new", ...draft });
                setOpen(false);
              }}
            >
              Use this customer
            </Button>
          </div>
        </>
      ) : (
        <>
          <Input autoFocus placeholder="Search name, phone, or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
          {query.trim().length >= 2 ? (
            <ul className="max-h-40 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      onChange({ kind: "existing", id: c.id, name: c.name, phone: c.phone });
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Walk-in
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus />
              New customer
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// --- payment ---------------------------------------------------------------------------------

function PaymentDialog({
  total,
  onClose,
  onPaid,
}: {
  total: number;
  onClose: () => void;
  onPaid: (payment: { method: PaymentMethod; tendered?: number; reference?: string }) => Promise<boolean>;
}) {
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [tendered, setTendered] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const cash = method === "cash";
  const given = Number(tendered) || 0;
  const change = Math.max(0, given - total);
  const short = cash && total > 0 && given < total;
  // Quick cash buttons: exact, then the next round notes up.
  const quick = Array.from(new Set([total, ...[500, 1000, 5000].map((n) => Math.ceil(total / n) * n)])).filter((n) => n > 0).slice(0, 4);

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      title={`Take payment — ${formatCurrency(total)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <ArrowLeft />
            Back
          </Button>
          <Button
            disabled={busy || short}
            onClick={async () => {
              setBusy(true);
              const ok = await onPaid({ method, tendered: cash ? given : undefined, reference: reference.trim() || undefined });
              if (!ok) setBusy(false);
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            Complete sale
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PAYMENT_METHODS.map((m) => (
            <Button key={m.value} variant={method === m.value ? "default" : "outline"} onClick={() => setMethod(m.value)} disabled={busy}>
              {m.label}
            </Button>
          ))}
        </div>
        {cash ? (
          <div className="space-y-2">
            <Label htmlFor="tendered">Cash received</Label>
            <Input
              id="tendered"
              autoFocus
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              className="text-lg"
            />
            <div className="flex flex-wrap gap-2">
              {quick.map((n) => (
                <Button key={n} variant="outline" size="sm" onClick={() => setTendered(String(n))}>
                  {formatCurrency(n)}
                </Button>
              ))}
            </div>
            <div className={cn("rounded-lg px-3 py-2 text-lg font-semibold", short ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
              {short ? `Still due: ${formatCurrency(total - given)}` : `Change: ${formatCurrency(change)}`}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              autoFocus
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={method === "card" ? "Approval code from the card slip" : "Transaction ID"}
            />
            <p className="text-xs text-muted-foreground">Optional, but it makes the payment easy to trace later.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// --- returns ---------------------------------------------------------------------------------

interface SaleLookup {
  orderId: string;
  name: string;
  isPos: boolean;
  createdAt: string;
  customer: string;
  lines: { lineItemId: string; title: string; sku: string; quantity: number; refundable: number; unitPaid: number }[];
}

function ReturnDesk({
  registerId,
  pin,
  onExchange,
  onRefunded,
}: {
  registerId: string;
  pin: string;
  onExchange: (credit: ExchangeCredit) => void;
  onRefunded: () => void;
}) {
  const toast = useToast();
  const [number, setNumber] = React.useState("");
  const [sale, setSale] = React.useState<SaleLookup | null>(null);
  const [qty, setQty] = React.useState<Record<string, number>>({});
  const [refundAs, setRefundAs] = React.useState<PaymentMethod>("cash");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function lookup() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await api<{ sale: SaleLookup }>(`/api/pos/sale-lookup?number=${encodeURIComponent(number.trim())}`);
    setBusy(false);
    if (!data) {
      setSale(null);
      setError(err ?? "Not found.");
      return;
    }
    setSale(data.sale);
    setQty({});
  }

  const picked = sale ? sale.lines.filter((l) => (qty[l.lineItemId] ?? 0) > 0) : [];
  const estimate = picked.reduce((a, l) => a + l.unitPaid * (qty[l.lineItemId] ?? 0), 0);

  async function submit(mode: "refund" | "exchange") {
    if (!sale) return;
    setBusy(true);
    const { data, error: err } = await api<{ amount: number; mode: string }>("/api/pos/return", {
      method: "POST",
      body: JSON.stringify({
        orderId: sale.orderId,
        registerId,
        pin,
        mode,
        refundAs,
        lines: picked.map((l) => ({ lineItemId: l.lineItemId, quantity: qty[l.lineItemId] })),
      }),
    });
    setBusy(false);
    if (!data) {
      toast.error("Return not recorded", err);
      return;
    }
    onRefunded();
    if (mode === "exchange") {
      onExchange({ orderName: sale.name, credit: data.amount });
    } else {
      const label = PAYMENT_METHODS.find((m) => m.value === refundAs)?.label ?? "";
      toast.success(`Refund ${formatCurrency(data.amount)} recorded`, `Give it back as ${label}. Items are back in stock here.`);
    }
    setSale(null);
    setNumber("");
  }

  return (
    <Card className="max-w-3xl">
      <CardContent className="space-y-4 pt-5">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
        >
          <Input autoFocus value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Receipt / order number, e.g. PF1032K" aria-label="Order number" />
          <Button type="submit" disabled={busy || !number.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Search />}
            Find sale
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {sale ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{sale.name}</span>
              {sale.isPos ? <Badge variant="primary">POS sale</Badge> : <Badge variant="warning">Online order</Badge>}
              {sale.customer ? <span className="text-muted-foreground">· {sale.customer}</span> : null}
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {sale.lines.map((l) => (
                <li key={l.lineItemId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(l.unitPaid)} paid each · {l.refundable} of {l.quantity} returnable
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={l.refundable}
                    step={1}
                    disabled={l.refundable === 0}
                    className="h-8 w-20 text-right"
                    aria-label={`Units of ${l.title} to return`}
                    value={qty[l.lineItemId] ? String(qty[l.lineItemId]) : ""}
                    placeholder="0"
                    onChange={(e) =>
                      setQty((q) => ({ ...q, [l.lineItemId]: Math.max(0, Math.min(l.refundable, Math.floor(Number(e.target.value) || 0))) }))
                    }
                  />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="refund-as">Refund given as</Label>
                <Select id="refund-as" value={refundAs} onChange={(e) => setRefundAs(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                About <span className="font-semibold text-foreground">{formatCurrency(estimate)}</span> — Shopify works out the exact amount.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={busy || picked.length === 0} onClick={() => void submit("exchange")}>
                Exchange for other items
              </Button>
              <Button variant="destructive" disabled={busy || picked.length === 0} onClick={() => void submit("refund")}>
                Refund
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Returned items go back into this register&apos;s store stock. An exchange gives the value as credit
              on the next sale instead of money back.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
