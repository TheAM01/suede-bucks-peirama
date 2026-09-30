"use client";

import * as React from "react";
import { QrCode, Check, AlertCircle, Trash2, Loader2 } from "@/components/icons";
import { COURIER_OPTIONS, LOCATION_OPTIONS } from "@/config/resources";
import { consignmentFromScan, statusLabel } from "@/config/order-workflow";
import { useStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";

/**
 * Scanner input. USB/Bluetooth barcode scanners act as a keyboard — they type
 * the QR's contents and press Enter — so a focused text box is the whole
 * integration; the code can also be typed by hand. Keeps focus after each
 * scan so the next parcel can be scanned straight away.
 */
function ScanInput({ onScan, disabled }: { onScan: (code: string) => void; disabled?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  React.useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Label QRs hold a full /scan/<id> URL; hand-typed codes are the bare id.
        const code = consignmentFromScan(value);
        if (code) onScan(code);
        setValue("");
        ref.current?.focus();
      }}
      className="flex gap-2"
    >
      <Input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Scan a label, or type a consignment ID"
        aria-label="Consignment ID"
        autoComplete="off"
        disabled={disabled}
      />
      <Button type="submit" variant="outline" disabled={disabled || !value.trim()}>
        Add
      </Button>
    </form>
  );
}

// --- scan to dispatch -----------------------------------------------------------------

interface DispatchLine {
  code: string;
  ok: boolean;
  text: string;
}

/** Orders page: scan printed labels to dispatch their orders one by one. */
export function ScanDispatchButton() {
  const store = useStore();
  const [open, setOpen] = React.useState(false);
  const [lines, setLines] = React.useState<DispatchLine[]>([]);
  const [busy, setBusy] = React.useState(false);

  async function scan(code: string) {
    if (lines.some((l) => l.code === code && l.ok)) {
      setLines((prev) => [{ code, ok: false, text: "Already dispatched in this session." }, ...prev]);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/consignments/${encodeURIComponent(code)}`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        number?: string;
        loadSheet?: string;
      };
      setLines((prev) => [
        res.ok
          ? {
              code,
              ok: true,
              text: `${body.number ?? code} dispatched${body.loadSheet ? ` onto ${body.loadSheet}` : ""}.`,
            }
          : { code, ok: false, text: body.error ?? `Server responded ${res.status}.` },
        ...prev,
      ]);
    } catch {
      setLines((prev) => [{ code, ok: false, text: "Couldn't reach the server." }, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    if (lines.some((l) => l.ok)) {
      store.refresh("orders");
      store.refresh("dispatch");
    }
    setLines([]);
  }

  const dispatched = lines.filter((l) => l.ok).length;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <QrCode />
        Scan to dispatch
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Scan to dispatch"
        description="Each scanned label dispatches its order onto its courier's open draft load sheet. Only orders In Pickup & Packing (label printed) can be dispatched."
        footer={<Button onClick={close}>Done{dispatched ? ` (${dispatched} dispatched)` : ""}</Button>}
      >
        <div className="space-y-4">
          <ScanInput onScan={scan} disabled={busy} />
          <ul className="space-y-1.5">
            {lines.map((l, i) => (
              <li
                key={`${l.code}-${i}`}
                className={cn("flex items-start gap-2 text-sm", l.ok ? "text-success" : "text-destructive")}
              >
                {l.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
                <span>
                  <span className="font-mono">{l.code}</span> — {l.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  );
}

// --- scan a load sheet ----------------------------------------------------------------

interface Parcel {
  consignmentId: string;
  orderId: string;
  number: string;
  courier: string;
  opsStatus: string;
  codAmount: number;
  total: number;
  loadSheet: string;
}

/** Dispatch page: build a posted load sheet by scanning every parcel handed to one courier. */
export function ScanLoadSheetButton() {
  const store = useStore();
  const [open, setOpen] = React.useState(false);
  const [courier, setCourier] = React.useState(COURIER_OPTIONS[0].value);
  const [location, setLocation] = React.useState(LOCATION_OPTIONS[0].value);
  const [parcels, setParcels] = React.useState<Parcel[]>([]);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null);

  function reset() {
    setParcels([]);
    setScanError(null);
    setResult(null);
  }

  async function scan(code: string) {
    setScanError(null);
    if (parcels.some((p) => p.consignmentId === code)) {
      setScanError(`${code} is already on this sheet.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/consignments/${encodeURIComponent(code)}`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; consignment?: Parcel };
      const p = body.consignment;
      if (!res.ok || !p) {
        setScanError(body.error ?? `Server responded ${res.status}.`);
      } else if (p.loadSheet) {
        setScanError(`${p.number || code} is already on load sheet ${p.loadSheet}.`);
      } else if (p.opsStatus !== "in_pickup_packing" && p.opsStatus !== "dispatched") {
        setScanError(`${p.number || code} is ${statusLabel(p.opsStatus)} — only parcels with a printed label can go on a sheet.`);
      } else if (p.courier && p.courier !== courier) {
        setScanError(`${p.number || code} is booked with ${p.courier}, not ${courier}.`);
      } else {
        setParcels((prev) => [...prev, p]);
      }
    } catch {
      setScanError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/dispatch/scan-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courier, location, consignmentIds: parcels.map((p) => p.consignmentId) }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        row?: { reference?: string };
        dispatchErrors?: string[];
      };
      if (!res.ok) {
        setResult({ ok: false, text: body.error ?? `Server responded ${res.status}.` });
        return;
      }
      store.refresh("dispatch");
      store.refresh("orders");
      const errs = body.dispatchErrors ?? [];
      setParcels([]);
      setResult({
        ok: errs.length === 0,
        text: errs.length
          ? `${body.row?.reference} posted, but some orders weren't marked dispatched: ${errs.join(" · ")}`
          : `${body.row?.reference} posted — ${parcels.length} parcels dispatched.`,
      });
    } catch {
      setResult({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  }

  const cod = parcels.reduce((n, p) => n + p.codAmount, 0);
  const total = parcels.reduce((n, p) => n + p.total, 0);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <QrCode />
        Scan load sheet
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        className="max-w-xl"
        title="Scan a load sheet"
        description="Scan every parcel you're handing to the courier. Creating the sheet posts it and marks each order Dispatched."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Close
            </Button>
            <Button onClick={create} disabled={busy || parcels.length === 0}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Create load sheet ({parcels.length})
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ls-courier">Courier</Label>
              <Select
                id="ls-courier"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                disabled={parcels.length > 0}
              >
                {COURIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ls-location">Location</Label>
              <Select id="ls-location" value={location} onChange={(e) => setLocation(e.target.value)}>
                {LOCATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <ScanInput onScan={scan} disabled={busy} />
          {scanError ? <p className="text-sm text-destructive">{scanError}</p> : null}
          {result ? (
            <p className={cn("text-sm", result.ok ? "text-success" : "text-destructive")}>{result.text}</p>
          ) : null}

          {parcels.length ? (
            <div className="rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {parcels.map((p) => (
                  <li key={p.consignmentId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{p.number}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.consignmentId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">{p.codAmount ? formatCurrency(p.codAmount) : "Paid"}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${p.number}`}
                        onClick={() => setParcels((prev) => prev.filter((x) => x.consignmentId !== p.consignmentId))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                <span>{parcels.length} parcels · {formatCurrency(total)} total</span>
                <span className="tabular-nums">COD {formatCurrency(cod)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
