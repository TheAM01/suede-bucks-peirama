"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Check,
  ClipboardCheck,
  DollarSign,
  Download,
  Loader2,
  Package,
  Plus,
  Send,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from "@/components/icons";
import type { Row } from "@/config/resource-types";
import {
  DOC_NOUN,
  canRunDoc,
  docStatus,
  type DocAction,
  type DocLine,
  type InventoryDocKind,
} from "@/config/inventory-docs";
import { useResource, useStore } from "@/lib/store";
import { formatCurrency, formatDate, formatDateTime, formatNumber, cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** POST one step to `/api/inventory-docs/[kind]/[id]`. Never throws. */
async function postDocAction(
  kind: InventoryDocKind,
  id: string,
  action: DocAction,
  payload: Record<string, unknown> = {},
): Promise<{ row?: Row; error?: string }> {
  try {
    const res = await fetch(`/api/inventory-docs/${kind}/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action }),
    });
    const body = (await res.json().catch(() => null)) as { row?: Row; error?: string } | null;
    if (!body) return { error: `Server responded ${res.status}.` };
    return body;
  } catch {
    return { error: "Couldn't reach the server." };
  }
}

/** Editable copy of a line — quantities as strings so inputs can be blank mid-edit. */
interface EditLine {
  inventoryItemId: string;
  item: string;
  sku: string;
  qty: string;
  unitCost: string;
  counted: string;
}

const toEdit = (l: DocLine): EditLine => ({
  inventoryItemId: l.inventoryItemId,
  item: l.item,
  sku: l.sku,
  qty: String(l.qty ?? ""),
  unitCost: l.unitCost != null ? String(l.unitCost) : "",
  counted: l.counted != null ? String(l.counted) : "",
});

type DialogKind = "ship" | "receive" | "close" | "cancel" | "send" | "post" | "place" | null;

/**
 * One purchase order, transfer, or stocktake: header facts, stage buttons
 * (only those valid for the current status — DOC_ACTION_FROM), the line
 * editor while Draft, the receive / shipping dialogs, and the history.
 */
export function InventoryDocDetail({
  kind,
  id,
  initial,
  error,
}: {
  kind: InventoryDocKind;
  id: string;
  initial: Row | null;
  error: string | null;
}) {
  const store = useStore();
  const [doc, setDoc] = React.useState<Row | null>(initial);
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<DialogKind>(null);
  const [edit, setEdit] = React.useState<EditLine[]>(() => ((initial?.lines as DocLine[]) ?? []).map(toEdit));
  const [dirty, setDirty] = React.useState(false);

  const listHref = `/dashboard/${kind}`;
  const noun = DOC_NOUN[kind];
  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href={listHref}>
        <ArrowLeft />
        {noun}s
      </Link>
    </Button>
  );

  if (!doc) {
    return (
      <div className="space-y-6">
        <div>{back}</div>
        <Card>
          <div className="p-5">
            <EmptyState icon={AlertCircle} title={`Couldn't load this ${noun.toLowerCase()}`} description={error ?? "Unknown error."} />
          </div>
        </Card>
      </div>
    );
  }

  const status = String(doc.status);
  const badge = docStatus(kind, status);
  const lines = (doc.lines as DocLine[]) ?? [];
  const isDraft = status === "draft";
  const can = (a: DocAction) => canRunDoc(kind, a, status);
  const history = (Array.isArray(doc.history) ? doc.history : []) as { at: string; action: string; note?: string }[];

  async function act(action: DocAction, payload: Record<string, unknown> = {}): Promise<boolean> {
    setBusy(true);
    setActionError(null);
    const res = await postDocAction(kind, id, action, payload);
    setBusy(false);
    if (res.error || !res.row) {
      setActionError(res.error ?? "Something went wrong.");
      return false;
    }
    setDoc(res.row);
    setEdit(((res.row.lines as DocLine[]) ?? []).map(toEdit));
    setDirty(false);
    store.refresh(kind);
    // Stock moved (or on-order / in-transit figures changed) — refresh the views that show it.
    if (action !== "set_lines") {
      store.refresh("inventory");
      store.refresh("stock-movements");
      store.refresh("inbound");
    }
    return true;
  }

  /** Save the draft lines; returns false (and shows why) when a value is invalid. */
  async function saveLines(): Promise<boolean> {
    for (const l of edit) {
      if (kind === "stocktakes") {
        if (l.counted !== "" && !(Number.isInteger(Number(l.counted)) && Number(l.counted) >= 0)) {
          setActionError(`${l.item}: the count must be a whole number.`);
          return false;
        }
      } else if (!(Number.isInteger(Number(l.qty)) && Number(l.qty) > 0)) {
        setActionError(`${l.item}: quantity must be a whole number above zero.`);
        return false;
      }
    }
    return act("set_lines", {
      lines: edit.map((l) =>
        kind === "stocktakes"
          ? { inventoryItemId: l.inventoryItemId, counted: l.counted === "" ? null : Number(l.counted) }
          : {
              inventoryItemId: l.inventoryItemId,
              qty: Number(l.qty),
              ...(kind === "purchase-orders" && l.unitCost !== "" ? { unitCost: Number(l.unitCost) } : {}),
            },
      ),
    });
  }

  /** Steps that need the latest lines saved first. */
  async function saveThen(action: DocAction) {
    if (dirty && !(await saveLines())) return;
    await act(action);
  }

  const units = Number(doc.units ?? 0);
  const received = Number(doc.receivedUnits ?? 0);
  const remaining = Number(doc.remainingUnits ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          {back}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {noun} {String(doc.number)}
            </h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {kind === "purchase-orders"
              ? `${doc.supplier} → ${doc.location}`
              : kind === "transfers"
                ? `${doc.from} → ${doc.to}`
                : `At ${doc.location}`}
            {" · created "}
            {formatDateTime(String(doc.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can("place") ? (
            <Button onClick={() => setDialog("place")} disabled={busy || (lines.length === 0 && edit.length === 0)}>
              <Send />
              Place order
            </Button>
          ) : null}
          {can("send") ? (
            <Button onClick={() => setDialog("send")} disabled={busy || (lines.length === 0 && edit.length === 0)}>
              <Truck />
              Send stock
            </Button>
          ) : null}
          {can("receive") ? (
            <Button onClick={() => setDialog("receive")} disabled={busy}>
              <Download />
              Receive
            </Button>
          ) : null}
          {can("post") ? (
            <Button onClick={() => setDialog("post")} disabled={busy}>
              <ClipboardCheck />
              Post counts
            </Button>
          ) : null}
          {can("ship") ? (
            <Button variant="outline" onClick={() => setDialog("ship")} disabled={busy}>
              <Truck />
              Shipping details
            </Button>
          ) : null}
          {can("close") ? (
            <Button variant="outline" onClick={() => setDialog("close")} disabled={busy}>
              <Check />
              Close
            </Button>
          ) : null}
          {can("cancel") ? (
            <Button variant="outline" onClick={() => setDialog("cancel")} disabled={busy}>
              <X />
              Cancel
            </Button>
          ) : null}
          {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>

      {actionError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kind === "stocktakes" ? (
          <>
            <StatCard label="Items" value={formatNumber(Number(doc.lineCount ?? 0))} icon={Boxes} tone="primary" />
            <StatCard label="Counted" value={formatNumber(Number(doc.countedLines ?? 0))} icon={ClipboardCheck} tone="info" />
            <StatCard label="Units counted" value={formatNumber(units)} icon={Package} tone="highlight" />
            <StatCard
              label="Net variance"
              value={doc.varianceUnits == null ? "After posting" : formatNumber(Number(doc.varianceUnits))}
              icon={SlidersHorizontal}
              tone="warning"
            />
          </>
        ) : (
          <>
            <StatCard label={kind === "transfers" ? "Units sent" : "Units ordered"} value={formatNumber(units)} icon={Boxes} tone="primary" />
            <StatCard label="Received" value={formatNumber(received)} icon={Check} tone="success" />
            <StatCard label="Still to come" value={formatNumber(remaining)} icon={Truck} tone="warning" />
            {kind === "purchase-orders" ? (
              <StatCard label="Order value" value={formatCurrency(Number(doc.value ?? 0))} icon={DollarSign} tone="info" />
            ) : (
              <StatCard label="Lines" value={formatNumber(Number(doc.lineCount ?? 0))} icon={Package} tone="info" />
            )}
          </>
        )}
      </div>

      {/* Lines */}
      {isDraft ? (
        <LineEditor
          kind={kind}
          doc={doc}
          lines={edit}
          onChange={(next) => {
            setEdit(next);
            setDirty(true);
          }}
          dirty={dirty}
          busy={busy}
          onSave={() => void saveLines()}
          onLoadLocation={can("load_location") ? () => void saveThen("load_location") : undefined}
        />
      ) : (
        <LinesTable kind={kind} lines={lines} posted={status === "posted"} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {kind !== "stocktakes" ? (
          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Fact term="Carrier" value={doc.carrier} />
                <Fact term="Tracking number" value={doc.trackingNumber} mono />
                <Fact term="ETA" value={doc.eta ? formatDate(String(doc.eta)) : ""} />
                {kind === "purchase-orders" ? (
                  <Fact term="Expected by" value={doc.expectedAt ? formatDate(String(doc.expectedAt)) : ""} />
                ) : (
                  <Fact term="Sent" value={doc.sentAt ? formatDateTime(String(doc.sentAt)) : ""} />
                )}
              </dl>
              {doc.notes ? <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{String(doc.notes)}</p> : null}
            </CardContent>
          </Card>
        ) : doc.notes ? (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{String(doc.notes)}</p>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[...history].reverse().map((h, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium">{h.note || h.action}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(h.at)}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={dialog === "place"}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          void saveThen("place");
        }}
        title={`Place ${doc.number} with ${doc.supplier}?`}
        description="The lines lock and the order counts as On order in Inventory until it's received."
        confirmLabel="Place order"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "send"}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          void saveThen("send");
        }}
        title={`Send ${doc.number}?`}
        description={`Every line's quantity is taken out of ${doc.from}'s stock in Shopify now, and shows as In transit at ${doc.to} until it's received.`}
        confirmLabel="Send stock"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "post"}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          void saveThen("post");
        }}
        title={`Post ${doc.number}?`}
        description={`Each counted item's Available at ${doc.location} is set to your count — the difference from Shopify's figure at this moment is posted as a stocktake adjustment. Lines left blank are skipped. This can't be undone.`}
        confirmLabel="Post counts"
        destructive={false}
      />
      {dialog === "ship" ? (
        <ShipDialog
          doc={doc}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (await act("ship", payload)) setDialog(null);
          }}
        />
      ) : null}
      {dialog === "receive" ? (
        <ReceiveDialog
          kind={kind}
          doc={doc}
          lines={lines}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={async (payload) => {
            if (await act("receive", payload)) setDialog(null);
          }}
        />
      ) : null}
      {dialog === "close" || dialog === "cancel" ? (
        <ReasonDialog
          title={dialog === "close" ? `Close ${doc.number}?` : `Cancel ${doc.number}?`}
          description={
            dialog === "close"
              ? kind === "transfers"
                ? "Use this when the rest of the stock won't arrive. It has already left the source, so nothing is added back anywhere."
                : "Use this when the supplier won't deliver the rest. Nothing more can be received on this order."
              : kind === "transfers" && status === "in_transit"
                ? `Nothing has been received yet, so the stock is put back into ${doc.from}'s inventory.`
                : "Nothing has been received, so no stock changes."
          }
          confirmLabel={dialog === "close" ? "Close it" : "Cancel it"}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            if (await act(dialog, { reason })) setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Fact({ term, value, mono }: { term: string; value: unknown; mono?: boolean }) {
  const v = value == null ? "" : String(value);
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className={cn("mt-0.5", mono && "font-mono text-[13px]")}>{v || "—"}</dd>
    </div>
  );
}

// --- lines ------------------------------------------------------------------------

function LinesTable({ kind, lines, posted }: { kind: InventoryDocKind; lines: DocLine[]; posted: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
      </CardHeader>
      {lines.length === 0 ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">No items.</p>
        </CardContent>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              {kind === "stocktakes" ? (
                <>
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-right">{kind === "transfers" ? "Sent" : "Ordered"}</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  {kind === "purchase-orders" ? (
                    <>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="text-right">Line value</TableHead>
                    </>
                  ) : null}
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => {
              const rem = Math.max(0, l.qty - (l.received ?? 0));
              const variance = l.counted != null && l.expected != null ? l.counted - l.expected : null;
              return (
                <TableRow key={l.inventoryItemId} className="hover:bg-transparent">
                  <TableCell>
                    <p className="font-medium">{l.item}</p>
                    {l.sku ? <p className="text-xs text-muted-foreground">{l.sku}</p> : null}
                  </TableCell>
                  {kind === "stocktakes" ? (
                    <>
                      <TableCell className="text-right tabular-nums">{l.counted ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{posted ? (l.expected ?? "—") : "—"}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          variance != null && variance < 0 && "text-destructive",
                          variance != null && variance > 0 && "text-success",
                        )}
                      >
                        {variance == null ? "—" : `${variance > 0 ? "+" : ""}${variance}`}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right tabular-nums">{formatNumber(l.qty)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(l.received ?? 0)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", rem > 0 && "font-medium text-warning")}>
                        {formatNumber(rem)}
                      </TableCell>
                      {kind === "purchase-orders" ? (
                        <>
                          <TableCell className="text-right tabular-nums">{formatCurrency(l.unitCost ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency((l.unitCost ?? 0) * l.qty)}</TableCell>
                        </>
                      ) : null}
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function LineEditor({
  kind,
  doc,
  lines,
  onChange,
  dirty,
  busy,
  onSave,
  onLoadLocation,
}: {
  kind: InventoryDocKind;
  doc: Row;
  lines: EditLine[];
  onChange: (lines: EditLine[]) => void;
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  onLoadLocation?: () => void;
}) {
  const set = (i: number, patch: Partial<EditLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(lines.filter((_, j) => j !== i));
  /** Stock figures shown in the picker come from this location. */
  const atLocationId = String(kind === "transfers" ? doc.fromLocationId : doc.locationId);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            {kind === "stocktakes"
              ? "Enter what you count. Leave a count blank to skip that item when posting."
              : kind === "transfers"
                ? `How many of each item to send from ${doc.from}.`
                : "What you're ordering and what each unit costs (pre-filled from Shopify's cost)."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onLoadLocation ? (
            <Button variant="outline" size="sm" onClick={onLoadLocation} disabled={busy}>
              <Boxes />
              Load all items at {String(doc.location)}
            </Button>
          ) : null}
          <Button size="sm" onClick={onSave} disabled={busy || !dirty}>
            <Check />
            {dirty ? "Save items" : "Saved"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ItemPicker
          locationId={atLocationId}
          exclude={new Set(lines.map((l) => l.inventoryItemId))}
          onPick={(it) =>
            onChange([
              ...lines,
              {
                inventoryItemId: it.inventoryItemId,
                item: it.name,
                sku: it.sku,
                qty: kind === "stocktakes" ? "" : "1",
                unitCost: kind === "purchase-orders" ? String(it.unitCost || "") : "",
                counted: "",
              },
            ])
          }
        />
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet — search above to add some.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Item</TableHead>
                  <TableHead className="w-32 text-right">{kind === "stocktakes" ? "Counted" : "Quantity"}</TableHead>
                  {kind === "purchase-orders" ? <TableHead className="w-36 text-right">Unit cost</TableHead> : null}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, i) => (
                  <TableRow key={l.inventoryItemId} className="hover:bg-transparent">
                    <TableCell>
                      <p className="font-medium">{l.item}</p>
                      {l.sku ? <p className="text-xs text-muted-foreground">{l.sku}</p> : null}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="ml-auto h-8 w-24 text-right"
                        value={kind === "stocktakes" ? l.counted : l.qty}
                        onChange={(e) => set(i, kind === "stocktakes" ? { counted: e.target.value } : { qty: e.target.value })}
                        aria-label={`${kind === "stocktakes" ? "Count" : "Quantity"} for ${l.item}`}
                      />
                    </TableCell>
                    {kind === "purchase-orders" ? (
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="ml-auto h-8 w-28 text-right"
                          value={l.unitCost}
                          onChange={(e) => set(i, { unitCost: e.target.value })}
                          aria-label={`Unit cost for ${l.item}`}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label={`Remove ${l.item}`}>
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PickItem {
  inventoryItemId: string;
  name: string;
  sku: string;
  unitCost: number;
  /** available at the document's location, when the item is stocked there */
  availableHere: number | null;
}

/** Search the inventory list (one entry per item) and add it as a line. */
function ItemPicker({
  locationId,
  exclude,
  onPick,
}: {
  locationId: string;
  exclude: Set<string>;
  onPick: (item: PickItem) => void;
}) {
  const { rows, loading, error } = useResource("inventory");
  const [query, setQuery] = React.useState("");

  const items = React.useMemo(() => {
    const map = new Map<string, PickItem>();
    for (const r of rows) {
      const id = String(r.inventoryItemId ?? "");
      if (!id) continue;
      const cur =
        map.get(id) ??
        ({ inventoryItemId: id, name: String(r.name ?? ""), sku: String(r.sku ?? ""), unitCost: Number(r.unitCost ?? 0), availableHere: null } as PickItem);
      if (String(r.locationId) === locationId) cur.availableHere = Number(r.available ?? 0);
      map.set(id, cur);
    }
    return [...map.values()];
  }, [rows, locationId]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? items
        .filter((it) => !exclude.has(it.inventoryItemId))
        .filter((it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  return (
    <div className="relative">
      <Label htmlFor="item-search" className="sr-only">
        Add an item
      </Label>
      <div className="relative">
        <Plus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="item-search"
          type="search"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Loading items…" : "Add an item — search by name or SKU"}
          disabled={loading}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">Couldn&apos;t load items: {error}</p> : null}
      {q ? (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-popover">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matching items.</li>
          ) : (
            matches.map((it) => (
              <li key={it.inventoryItemId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onPick(it);
                    setQuery("");
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{it.name}</span>
                    {it.sku ? <span className="block truncate text-xs text-muted-foreground">{it.sku}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {it.availableHere == null ? "Not stocked here" : `${formatNumber(it.availableHere)} available here`}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

// --- dialogs ------------------------------------------------------------------------

function ShipDialog({
  doc,
  onClose,
  onSubmit,
}: {
  doc: Row;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [carrier, setCarrier] = React.useState(String(doc.carrier ?? ""));
  const [trackingNumber, setTracking] = React.useState(String(doc.trackingNumber ?? ""));
  const [eta, setEta] = React.useState(String(doc.eta ?? ""));
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Shipping details — ${doc.number}`}
      description="Who's carrying it and when it should arrive. Shown on the Inbound board."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit({ carrier, trackingNumber, eta })}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ship-carrier">Carrier</Label>
          <Input id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. TCS, Daewoo Cargo" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ship-tracking">Tracking number</Label>
            <Input id="ship-tracking" value={trackingNumber} onChange={(e) => setTracking(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ship-eta">ETA</Label>
            <Input id="ship-eta" type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function ReceiveDialog({
  kind,
  doc,
  lines,
  busy,
  onClose,
  onSubmit,
}: {
  kind: InventoryDocKind;
  doc: Row;
  lines: DocLine[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const open = lines.filter((l) => l.qty - (l.received ?? 0) > 0);
  const [qty, setQty] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(open.map((l) => [l.inventoryItemId, String(l.qty - (l.received ?? 0))])),
  );
  const total = Object.values(qty).reduce((a, v) => a + (Number(v) || 0), 0);
  const invalid = open.some((l) => {
    const v = qty[l.inventoryItemId];
    const n = Number(v);
    return v !== "" && (!Number.isInteger(n) || n < 0 || n > l.qty - (l.received ?? 0));
  });
  const destination = String(kind === "transfers" ? doc.to : doc.location);

  return (
    <Dialog
      open
      onClose={onClose}
      className="max-w-2xl"
      title={`Receive ${doc.number}`}
      description={`Count what actually arrived. Those units are added to ${destination}'s stock in Shopify. Anything short stays open to receive later.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || invalid || total === 0}
            onClick={() =>
              onSubmit({
                lines: open.map((l) => ({ inventoryItemId: l.inventoryItemId, qty: Number(qty[l.inventoryItemId]) || 0 })),
              })
            }
          >
            <Download />
            Receive {formatNumber(total)} units
          </Button>
        </>
      }
    >
      <div className="-mx-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="w-32 text-right">Arrived now</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {open.map((l) => {
              const rem = l.qty - (l.received ?? 0);
              return (
                <TableRow key={l.inventoryItemId} className="hover:bg-transparent">
                  <TableCell>
                    <p className="font-medium">{l.item}</p>
                    {l.sku ? <p className="text-xs text-muted-foreground">{l.sku}</p> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(rem)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={rem}
                      step={1}
                      inputMode="numeric"
                      className="ml-auto h-8 w-24 text-right"
                      value={qty[l.inventoryItemId] ?? ""}
                      onChange={(e) => setQty((q) => ({ ...q, [l.inventoryItemId]: e.target.value }))}
                      aria-label={`Units of ${l.item} that arrived`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {invalid ? (
        <p className="mt-3 text-xs text-destructive">Each figure must be a whole number no larger than what&apos;s outstanding.</p>
      ) : null}
    </Dialog>
  );
}

function ReasonDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button variant="destructive" onClick={() => onSubmit(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="doc-reason">Reason (optional)</Label>
        <Textarea id="doc-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </div>
    </Dialog>
  );
}
