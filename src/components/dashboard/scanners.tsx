"use client";

import * as React from "react";
import { QrCode, Check, AlertCircle, Trash2, Loader2 } from "@/components/icons";
import { COURIER_OPTIONS, LOCATION_OPTIONS } from "@/config/resources";
import { consignmentFromScan, normalizeCourier, statusLabel } from "@/config/order-workflow";
import { useResource, useStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { SheetPicker, openSheetsFor, type OpenSheet, type SheetChoice } from "./sheet-picker";

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

/** What the consignment endpoint answers when a scanned parcel needs its load sheet chosen. */
interface NeedsSheet {
  code: string;
  number: string;
  courier: string;
  sheets: OpenSheet[];
}

export interface ScanReply {
  error?: string;
  number?: string;
  courier?: string;
  needsSheet?: boolean;
  sheets?: OpenSheet[];
  loadSheet?: string;
  loadSheetId?: string;
  status?: string;
  from?: string;
  orderId?: string;
}

/** POST a scanned consignment to the consignment endpoint. Never throws. */
export async function postScan(
  code: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; status: number; reply: ScanReply }> {
  try {
    const res = await fetch(`/api/consignments/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, reply: (await res.json().catch(() => ({}))) as ScanReply };
  } catch {
    return { ok: false, status: 0, reply: { error: "Couldn't reach the server." } };
  }
}

function ScanLog({ lines }: { lines: DispatchLine[] }) {
  return (
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
  );
}

/**
 * Orders page: scan printed labels to dispatch their orders one by one. Every
 * scan asks which of that courier's open sheets the parcel goes on (or a new
 * one) — the sheet last used for that courier is highlighted, so Enter
 * confirms it.
 */
export function ScanDispatchButton() {
  const store = useStore();
  const [open, setOpen] = React.useState(false);
  const [lines, setLines] = React.useState<DispatchLine[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState<NeedsSheet | null>(null);
  const [choice, setChoice] = React.useState<SheetChoice | null>(null);
  /** last sheet each courier's parcels went on this session */
  const lastFor = React.useRef(new Map<string, string>());

  const log = (line: DispatchLine) => setLines((prev) => [line, ...prev]);

  async function scan(code: string) {
    if (lines.some((l) => l.code === code && l.ok)) {
      log({ code, ok: false, text: "Already dispatched in this session." });
      return;
    }
    setBusy(true);
    const { ok, status, reply } = await postScan(code);
    setBusy(false);
    if (status === 409 && reply.needsSheet) {
      const courier = reply.courier ?? "";
      const sheets = reply.sheets ?? [];
      const last = lastFor.current.get(courier);
      setPending({ code, number: reply.number ?? code, courier, sheets });
      setChoice(last && sheets.some((s) => s.id === last) ? { target: last } : null);
      return;
    }
    log(
      ok
        ? { code, ok: true, text: `${reply.number ?? code} dispatched.` }
        : { code, ok: false, text: reply.error ?? `Server responded ${status}.` },
    );
  }

  async function confirm() {
    if (!pending || !choice) return;
    setBusy(true);
    const { ok, status, reply } = await postScan(pending.code, { target: choice.target, location: choice.location });
    setBusy(false);
    if (ok) {
      if (reply.loadSheetId) lastFor.current.set(pending.courier, reply.loadSheetId);
      log({ code: pending.code, ok: true, text: `${reply.number ?? pending.number} dispatched onto ${reply.loadSheet ?? "the sheet"}.` });
    } else {
      log({ code: pending.code, ok: false, text: reply.error ?? `Server responded ${status}.` });
    }
    setPending(null);
    setChoice(null);
  }

  function close() {
    setOpen(false);
    if (lines.some((l) => l.ok)) {
      store.refresh("orders");
      store.refresh("dispatch");
      store.refresh("shipments");
    }
    setLines([]);
    setPending(null);
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
        description="Scan each printed label, then pick which of its courier's load sheets it goes on. Only orders In Pickup & Packing (label printed) can be dispatched."
        footer={
          <Button variant="outline" onClick={close}>
            Done{dispatched ? ` (${dispatched} dispatched)` : ""}
          </Button>
        }
      >
        <div className="space-y-4">
          {pending ? (
            <form
              className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              <p className="text-sm">
                <span className="font-medium">{pending.number}</span>
                <span className="text-muted-foreground"> · {pending.courier} — which load sheet?</span>
              </p>
              <SheetPicker
                name={`scan-${pending.code}`}
                courier={pending.courier}
                sheets={pending.sheets}
                value={choice}
                onChange={setChoice}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    log({ code: pending.code, ok: false, text: "Skipped — not dispatched." });
                    setPending(null);
                  }}
                >
                  Skip
                </Button>
                <Button type="submit" size="sm" disabled={!choice || busy} autoFocus>
                  Dispatch onto sheet
                </Button>
              </div>
            </form>
          ) : (
            <ScanInput onScan={scan} disabled={busy} />
          )}
          <ScanLog lines={lines} />
        </div>
      </Dialog>
    </>
  );
}

/**
 * A load sheet's own scanner: every scanned parcel goes straight onto this
 * (Draft) sheet — dispatched, or added if it's already dispatched with no
 * sheet. Opening the sheet's page is the choice, so several sheets can be
 * loaded at once from different tabs or devices.
 */
export function ScanIntoSheetButton({
  sheetId,
  reference,
  onDone,
}: {
  sheetId: string;
  reference: string;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [lines, setLines] = React.useState<DispatchLine[]>([]);
  const [busy, setBusy] = React.useState(false);

  async function scan(code: string) {
    if (lines.some((l) => l.code === code && l.ok)) {
      setLines((prev) => [{ code, ok: false, text: `Already on ${reference}.` }, ...prev]);
      return;
    }
    setBusy(true);
    const { ok, status, reply } = await postScan(code, { target: sheetId });
    setBusy(false);
    setLines((prev) => [
      ok
        ? { code, ok: true, text: `${reply.number ?? code} loaded onto ${reference}.` }
        : { code, ok: false, text: reply.error ?? `Server responded ${status}.` },
      ...prev,
    ]);
  }

  function close() {
    setOpen(false);
    if (lines.some((l) => l.ok)) onDone();
    setLines([]);
  }

  const loaded = lines.filter((l) => l.ok).length;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <QrCode />
        Scan parcels on
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={`Load ${reference}`}
        description="Every label you scan is dispatched onto this sheet. Parcels need a printed label and must be booked with this sheet's courier."
        footer={
          <Button variant="outline" onClick={close}>
            Done{loaded ? ` (${loaded} loaded)` : ""}
          </Button>
        }
      >
        <div className="space-y-4">
          <ScanInput onScan={scan} disabled={busy} />
          <ScanLog lines={lines} />
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
  // "Other" takes a typed name, matching orders assigned to a custom courier.
  const [otherName, setOtherName] = React.useState("");
  const sheetCourier = courier === "Other" ? (normalizeCourier(otherName).courier ?? "") : courier;
  const [location, setLocation] = React.useState(LOCATION_OPTIONS[0].value);
  /** "new", or an open sheet of this courier to add the parcels to */
  const [target, setTarget] = React.useState("new");
  const [postNow, setPostNow] = React.useState(true);
  const { rows: sheetRows } = useResource("dispatch");
  const openSheets = openSheetsFor(sheetRows, sheetCourier);
  const targetSheet = openSheets.find((s) => s.id === target);
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
      } else if (!sheetCourier) {
        setScanError("Type the courier's name first.");
      } else if (p.courier && p.courier !== sheetCourier) {
        setScanError(`${p.number || code} is booked with ${p.courier}, not ${sheetCourier}.`);
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
        body: JSON.stringify({
          courier: sheetCourier,
          location,
          target,
          post: postNow,
          consignmentIds: parcels.map((p) => p.consignmentId),
        }),
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
      store.refresh("shipments");
      const errs = body.dispatchErrors ?? [];
      const verb = postNow ? "posted" : "updated";
      setParcels([]);
      setTarget("new");
      setResult({
        ok: errs.length === 0,
        text: errs.length
          ? `${body.row?.reference} ${verb}, but some orders weren't marked dispatched: ${errs.join(" · ")}`
          : `${body.row?.reference} ${verb} — ${parcels.length} parcels dispatched.`,
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
        description="Scan every parcel you're handing to the courier, onto a new sheet or one of the courier's open sheets. Each order is marked Dispatched."
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
              {targetSheet ? `Add to ${targetSheet.reference}` : "Create load sheet"} ({parcels.length})
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
                onChange={(e) => {
                  setCourier(e.target.value);
                  setTarget("new");
                }}
                disabled={parcels.length > 0}
              >
                {COURIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {courier === "Other" ? (
                <Input
                  aria-label="Courier name"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  placeholder="Courier name"
                  maxLength={40}
                  disabled={parcels.length > 0}
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ls-target">Load sheet</Label>
              <Select
                id="ls-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={parcels.length > 0}
              >
                <option value="new">A new sheet</option>
                {openSheets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.reference} · {o.totalShipments} parcels
                  </option>
                ))}
              </Select>
              {target === "new" ? (
                <Select aria-label="Dispatching from" value={location} onChange={(e) => setLocation(e.target.value)}>
                  {LOCATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      From {o.label}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={postNow}
              onChange={(e) => setPostNow(e.target.checked)}
            />
            Post the sheet when done — the rider is leaving with these parcels
          </label>

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
