"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Package,
  Pencil,
  Printer,
  QrCode,
  Send,
  Trash2,
  X,
  Loader2,
  PackageCheck,
  Truck,
} from "@/components/icons";
import type { Row } from "@/config/resource-types";
import {
  ACTION_LABEL,
  COURIERS,
  ORDER_STATUS_OPTIONS,
  canRun,
  defaultCourierFor,
  statusLabel,
  type OrderAction,
} from "@/config/order-workflow";
import { checkAddress } from "@/lib/address-check";
import type { ShippingAddressFields } from "@/lib/shopify-order-detail";
import type { SelectionContext } from "./resource-view";
import { useResource, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Drawer } from "@/components/ui/drawer";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/menu";
import { LoadingState } from "@/components/ui/spinner";
import type { IconType } from "@/components/icons";

export interface ActionResponse {
  ok?: boolean;
  error?: string;
  needsConfirmation?: string;
  status?: string;
  loadSheet?: string;
  loadSheetId?: string;
}

/** POST one control-panel action for one order. Never throws. */
export async function postOrderAction(
  orderId: string,
  action: OrderAction,
  payload: Record<string, unknown> = {},
): Promise<ActionResponse> {
  try {
    const res = await fetch(`/api/orders/${orderId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action }),
    });
    const body = (await res.json().catch(() => null)) as ActionResponse | null;
    if (!body) return { error: `Server responded ${res.status}.` };
    return body;
  } catch {
    return { error: "Couldn't reach the server." };
  }
}

/** Order the buttons appear in, left to right. */
const BUTTON_ORDER: OrderAction[] = [
  "modify",
  "move_active",
  "create_package",
  "assign_consignment",
  "print_label",
  "dispatch",
  "add_to_load_sheet",
  "mark_fulfilled",
  "unpackage",
  "move_exception",
  "cancel",
  "discard",
];

const ICON: Partial<Record<OrderAction, IconType>> = {
  modify: Pencil,
  move_active: ArrowRight,
  move_exception: AlertTriangle,
  create_package: Package,
  assign_consignment: QrCode,
  print_label: Printer,
  dispatch: Send,
  add_to_load_sheet: Truck,
  mark_fulfilled: PackageCheck,
  cancel: X,
  discard: Trash2,
};

const PRIMARY: OrderAction[] = [
  "move_active",
  "create_package",
  "assign_consignment",
  "print_label",
  "dispatch",
  "mark_fulfilled",
];
const DESTRUCTIVE: OrderAction[] = ["discard", "cancel"];
/** actions that open their own dialog instead of running straight away */
type DialogKind = "modify" | "discard" | "consignment" | "cancel" | "confirm_malformed" | "load_sheet" | "delete";

/** Actions that put a parcel on a load sheet — they ask which sheet first. */
const SHEET_ACTIONS: OrderAction[] = ["dispatch", "add_to_load_sheet"];

const num = (rows: Row[], noun = "order") => `${rows.length} ${rows.length === 1 ? noun : `${noun}s`}`;

/**
 * The Orders control panel — the bottom bar shown once orders are ticked.
 * Only actions valid for the selection's current tab appear (see
 * ACTION_FROM in src/config/order-workflow.ts); the server re-checks every
 * transition. Mixed selections (orders from different tabs) get no workflow
 * actions. The generic bulk actions — Move to (a manual status override that
 * skips the workflow's side effects) and Delete (permanent, in Shopify) — are
 * always offered, whatever the selection.
 */
export function OrderControlPanel({
  ctx,
  onDone,
}: {
  ctx: SelectionContext;
  /** called after any action run: refresh the list and show a message */
  onDone: (message: { tone: "success" | "error"; text: string } | null) => void;
}) {
  const { rows, clear } = ctx;
  const store = useStore();
  const statuses = Array.from(new Set(rows.map((r) => String(r.opsStatus ?? "active"))));
  const status = statuses.length === 1 ? statuses[0] : null;
  const [busy, setBusy] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogKind | null>(null);
  const [pendingConfirm, setPendingConfirm] = React.useState<{ rows: Row[]; message: string } | null>(null);

  const actions = status
    ? BUTTON_ORDER.filter((a) => rows.every((r) => canRun(a, status, r.courier)))
        .filter((a) => a !== "modify" || rows.length === 1)
        // Only offered for dispatched orders that aren't on a sheet yet.
        .filter((a) => a !== "add_to_load_sheet" || rows.every((r) => !r.loadSheet))
    : [];
  const [sheetAction, setSheetAction] = React.useState<OrderAction>("dispatch");

  /** Run one action across rows; collect confirmations the server asks for instead of failing them. */
  async function run(
    action: OrderAction,
    targets: Row[],
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    setBusy(true);
    // One at a time: a batch dispatched onto a "new" sheet must share the sheet
    // the first order opened (per courier), not open one sheet per order.
    const results: { row: Row; res: ActionResponse }[] = [];
    const newSheetFor = new Map<string, string>();
    for (const r of targets) {
      const courier = String(r.courier ?? "");
      const reuse = payload.target === "new" ? newSheetFor.get(courier) : undefined;
      const res = await postOrderAction(r.id, action, reuse ? { ...payload, target: reuse } : payload);
      if (payload.target === "new" && res.loadSheetId && !newSheetFor.has(courier)) {
        newSheetFor.set(courier, res.loadSheetId);
      }
      results.push({ row: r, res });
    }
    setBusy(false);
    if (SHEET_ACTIONS.includes(action)) store.refresh("dispatch");
    const sheets = Array.from(
      new Set(results.map((x) => x.res.loadSheet).filter((s): s is string => Boolean(s))),
    );

    const needConfirm = results.filter((x) => x.res.needsConfirmation);
    const failed = results.filter((x) => x.res.error);
    const done = results.length - needConfirm.length - failed.length;

    if (needConfirm.length) {
      setPendingConfirm({
        rows: needConfirm.map((x) => x.row),
        message: needConfirm[0].res.needsConfirmation!,
      });
      setDialog("confirm_malformed");
    }

    const errors = failed.map((x) => `${x.row.number}: ${x.res.error}`);
    if (errors.length) {
      onDone({ tone: "error", text: errors.join(" · ") });
    } else if (done > 0) {
      onDone({
        tone: "success",
        text: `${ACTION_LABEL[action]} — ${done} ${done === 1 ? "order" : "orders"} updated${
          sheets.length ? ` · on load sheet ${sheets.join(", ")}` : ""
        }.`,
      });
    } else {
      onDone(null);
    }
    if (!needConfirm.length) clear();
  }

  function onAction(action: OrderAction) {
    switch (action) {
      case "modify":
        return setDialog("modify");
      case "discard":
        return setDialog("discard");
      case "assign_consignment":
        return setDialog("consignment");
      case "cancel":
        return setDialog("cancel");
      case "print_label":
        return printLabels();
      case "dispatch":
      case "add_to_load_sheet":
        setSheetAction(action);
        return setDialog("load_sheet");
      default:
        return run(action, rows);
    }
  }

  async function printLabels() {
    // Open the tab synchronously so the popup blocker treats it as user-initiated.
    const win = window.open("about:blank", "_blank");
    const targets = rows;
    await run("print_label", targets);
    const url = `/print/labels?ids=${encodeURIComponent(targets.map((r) => r.id).join(","))}`;
    if (win) win.location.assign(url);
    else window.location.assign(url);
  }

  /** Bulk manual override — same path as the order drawer's status field. */
  async function moveTo(target: string) {
    setBusy(true);
    const results = await Promise.all(
      rows.map(async (r) => ({ row: r, res: await store.update("orders", r.id, { opsStatus: target }) })),
    );
    setBusy(false);
    report(results, `Moved to ${statusLabel(target)}`);
  }

  async function deleteOrders() {
    setBusy(true);
    const results = await Promise.all(
      rows.map(async (r) => ({ row: r, res: await store.remove("orders", r.id) })),
    );
    setBusy(false);
    report(results, "Deleted");
  }

  function report(results: { row: Row; res: { ok: boolean; error?: string } }[], verb: string) {
    const errors = results.filter((x) => !x.res.ok).map((x) => `${x.row.number}: ${x.res.error}`);
    const done = results.length - errors.length;
    if (errors.length) onDone({ tone: "error", text: errors.join(" · ") });
    else onDone({ tone: "success", text: `${verb} — ${done} ${done === 1 ? "order" : "orders"}.` });
    clear();
  }

  const close = () => setDialog(null);

  return (
    <>
      {/* Phones: count + Clear on one line, actions in a single sideways-scrolling row
          (a wrapped bar would cover most of the table). sm+: one wrapping row. */}
      <div className="sticky bottom-8 z-10 space-y-2 rounded-lg border border-border bg-card px-3 py-2.5 shadow-md sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:space-y-0 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-medium">{num(rows)} selected</span>
          {status ? <Badge variant="outline">{statusLabel(status)}</Badge> : null}
          {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          <Button variant="ghost" size="sm" className="ml-auto sm:hidden" onClick={clear} disabled={busy}>
            Clear
          </Button>
        </div>
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {!status ? (
            <span className="text-sm text-muted-foreground">
              These orders are in different tabs — select orders from one tab to act on them.
            </span>
          ) : actions.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              No workflow actions for orders in {statusLabel(status)}.
            </span>
          ) : (
            actions.map((a) => {
              const Icon = ICON[a];
              const label =
                a === "cancel" && status === "in_pickup_packing"
                  ? "Cancel pickup"
                  : a === "move_active" && status === "pending_cc"
                    ? "Deposit cleared → Active"
                    : ACTION_LABEL[a];
              return (
                <Button
                  key={a}
                  size="sm"
                  className="shrink-0"
                  variant={PRIMARY.includes(a) ? "default" : DESTRUCTIVE.includes(a) ? "destructive" : "outline"}
                  onClick={() => onAction(a)}
                  disabled={busy}
                >
                  {Icon ? <Icon /> : null}
                  {label}
                </Button>
              );
            })
          )}
          <Menu>
            <MenuTrigger>
              <Button variant="outline" size="sm" className="shrink-0" disabled={busy}>
                Move to
                <ChevronDown className="size-3.5" />
              </Button>
            </MenuTrigger>
            <MenuContent width="w-52">
              <MenuLabel>Manual override</MenuLabel>
              {ORDER_STATUS_OPTIONS.filter((o) => o.value !== status).map((o) => (
                <MenuItem key={o.value} onSelect={() => void moveTo(o.value)}>
                  {o.label}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => setDialog("delete")}
            disabled={busy}
          >
            <Trash2 />
            Delete
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={clear} disabled={busy}>
            Clear
          </Button>
        </div>
      </div>

      {dialog === "modify" && rows[0] ? (
        <ModifyDrawer
          row={rows[0]}
          onClose={close}
          onSaved={() => {
            close();
            onDone({ tone: "success", text: `${rows[0].number} updated in Shopify.` });
            clear();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={dialog === "discard"}
        onCancel={close}
        onConfirm={() => {
          close();
          void run("discard", rows);
        }}
        title={`Discard ${num(rows)}?`}
        description="They move to Canceled here. The Shopify order itself isn't cancelled or refunded."
        confirmLabel="Discard"
      />

      <ConfirmDialog
        open={dialog === "delete"}
        onCancel={close}
        onConfirm={() => {
          close();
          void deleteOrders();
        }}
        title={`Permanently delete ${num(rows)}?`}
        description="This deletes the orders in Shopify itself, along with their payment and fulfilment records, and can't be undone. Shopify refuses some orders (open, paid ones). To take an order off the workflow without deleting it, use Discard or Move to → Canceled instead."
        confirmLabel="Delete permanently"
      />

      <ConfirmDialog
        open={dialog === "confirm_malformed" && Boolean(pendingConfirm)}
        onCancel={() => {
          close();
          setPendingConfirm(null);
          clear();
        }}
        onConfirm={() => {
          const target = pendingConfirm?.rows ?? [];
          close();
          setPendingConfirm(null);
          void run("move_active", target, { confirmed: true });
        }}
        title="Move a flagged order?"
        description={
          pendingConfirm
            ? pendingConfirm.rows.length > 1
              ? `${pendingConfirm.message} (${pendingConfirm.rows.length} orders weren't modified.)`
              : pendingConfirm.message
            : undefined
        }
        confirmLabel="Move to Active"
      />

      {dialog === "consignment" ? (
        <ConsignmentDialog
          rows={rows}
          onClose={close}
          onSubmit={(payload) => {
            close();
            void run("assign_consignment", rows, payload);
          }}
        />
      ) : null}

      {dialog === "load_sheet" ? (
        <LoadSheetDialog
          rows={rows}
          action={sheetAction}
          onClose={close}
          onSubmit={(target) => {
            close();
            void run(sheetAction, rows, { target });
          }}
        />
      ) : null}

      {dialog === "cancel" && status === "in_pickup_packing" ? (
        <ConfirmDialog
          open
          onCancel={close}
          onConfirm={() => {
            close();
            void run("cancel", rows);
          }}
          title={`Cancel pickup for ${num(rows)}?`}
          description="They go back to Finalized — the consignment stays assigned, and the label can be printed again."
          confirmLabel="Cancel pickup"
        />
      ) : null}

      {dialog === "cancel" && status === "finalized" ? (
        <ReasonDialog
          title={`Cancel ${num(rows)}?`}
          description="Finalized orders need a reason. They move to Canceled and their consignment is released."
          confirmLabel="Cancel order"
          onClose={close}
          onSubmit={(reason) => {
            close();
            void run("cancel", rows, { reason });
          }}
        />
      ) : null}
    </>
  );
}

// --- dialogs -------------------------------------------------------------------------

/**
 * Which load sheet dispatched parcels go on: the courier's open Draft sheet
 * (the default — opened automatically if there's none), a specific Draft
 * sheet, or a new one. Specific sheets are only offered when every selected
 * order uses the same courier, since a sheet belongs to one courier.
 */
function LoadSheetDialog({
  rows,
  action,
  onClose,
  onSubmit,
}: {
  rows: Row[];
  action: OrderAction;
  onClose: () => void;
  onSubmit: (target: string) => void;
}) {
  const { rows: sheets, loading } = useResource("dispatch");
  const couriers = Array.from(new Set(rows.map((r) => String(r.courier ?? ""))));
  const courier = couriers.length === 1 ? couriers[0] : null;
  const drafts = courier
    ? sheets.filter((s) => s.status === "draft" && s.courier === courier)
    : [];
  const [target, setTarget] = React.useState("auto");

  const options = [
    {
      value: "auto",
      label: courier
        ? drafts.length
          ? `${courier}'s open draft sheet (${String(drafts[0].reference)})`
          : `${courier}'s open draft sheet — none yet, one will be started`
        : "Each courier's open draft sheet (started if needed)",
    },
    ...drafts.slice(1).map((s) => ({
      value: s.id,
      label: `${String(s.reference)} · ${String(s.location)} · ${Number(s.totalShipments ?? 0)} parcels`,
    })),
    { value: "new", label: courier ? `A new ${courier} load sheet` : "A new load sheet per courier" },
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${ACTION_LABEL[action]} — ${num(rows)}`}
      description="Dispatched parcels go on a load sheet so the courier's handover and COD are accounted for. Post the sheet from the Dispatch page when the rider leaves."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(target)}>
            <Truck />
            {ACTION_LABEL[action]}
          </Button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Put them on</legend>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name="load-sheet-target"
              className="mt-0.5 size-4 accent-primary"
              checked={target === o.value}
              onChange={() => setTarget(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
        {loading ? <p className="text-xs text-muted-foreground">Loading open sheets…</p> : null}
      </fieldset>
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
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="cancel-reason">Reason</Label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer cancelled on the phone"
          autoFocus
        />
      </div>
    </Dialog>
  );
}

function ConsignmentDialog({
  rows,
  onClose,
  onSubmit,
}: {
  rows: Row[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [courier, setCourier] = React.useState<string>(defaultCourierFor(rows[0]?.city));
  const meta = COURIERS.find((c) => c.value === courier);
  const [useApi, setUseApi] = React.useState<boolean>(Boolean(meta?.api));
  const [consignmentId, setConsignmentId] = React.useState("");
  const single = rows.length === 1;
  const manual = !useApi || !meta?.api;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Assign consignment — ${single ? String(rows[0].number) : num(rows)}`}
      description="Out-of-city parcels book with Insta; Karachi deliveries use the manual courier with a hand-entered consignment ID."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={manual && (!single || !consignmentId.trim())}
            onClick={() =>
              onSubmit(manual ? { courier, consignmentId: consignmentId.trim() } : { courier, useApi: true })
            }
          >
            {manual ? "Assign" : "Book with courier"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="courier">Courier</Label>
          <Select
            id="courier"
            value={courier}
            onChange={(e) => {
              setCourier(e.target.value);
              setUseApi(Boolean(COURIERS.find((c) => c.value === e.target.value)?.api));
            }}
          >
            {COURIERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        {meta?.api ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={useApi}
              onChange={(e) => setUseApi(e.target.checked)}
            />
            Book through {courier}&apos;s API (uncheck to enter an ID you booked yourself)
          </label>
        ) : null}
        {manual ? (
          single ? (
            <div className="space-y-2">
              <Label htmlFor="consignment-id">Consignment ID</Label>
              <Input
                id="consignment-id"
                value={consignmentId}
                onChange={(e) => setConsignmentId(e.target.value)}
                placeholder="e.g. KHI-000123"
                autoFocus
              />
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
              Manual consignment IDs are entered one order at a time — select a single order.
            </p>
          )
        ) : null}
      </div>
    </Dialog>
  );
}

type AddressForm = Pick<
  ShippingAddressFields,
  "firstName" | "lastName" | "phone" | "address1" | "address2" | "city" | "zip"
>;

const ADDRESS_FIELDS: { key: keyof AddressForm; label: string; half?: boolean }[] = [
  { key: "firstName", label: "First name", half: true },
  { key: "lastName", label: "Last name", half: true },
  { key: "address1", label: "Address" },
  { key: "address2", label: "Apartment, area, landmark" },
  { key: "city", label: "City", half: true },
  { key: "zip", label: "Postal code", half: true },
  { key: "phone", label: "Phone" },
];

/** Edit the shipping address + note; nothing is written until the confirmation modal is accepted. */
function ModifyDrawer({
  row,
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AddressForm | null>(null);
  const [codes, setCodes] = React.useState({ provinceCode: "", countryCode: "" });
  const [note, setNote] = React.useState("");
  const [flags, setFlags] = React.useState<string[]>([]);
  const [confirming, setConfirming] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${row.id}`, { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(body?.error ?? "Couldn't load the order.");
        const a: ShippingAddressFields | null = body.order.shippingAddressFields;
        setForm({
          firstName: a?.firstName ?? "",
          lastName: a?.lastName ?? "",
          phone: a?.phone || body.order.customer?.phone || "",
          address1: a?.address1 ?? "",
          address2: a?.address2 ?? "",
          city: a?.city ?? "",
          zip: a?.zip ?? "",
        });
        setCodes({ provinceCode: a?.provinceCode ?? "", countryCode: a?.countryCode ?? "" });
        setNote(body.order.note ?? "");
        setFlags(body.ops?.flags ?? []);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Couldn't load the order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.id]);

  const liveIssues = form
    ? checkAddress({ ...form, name: `${form.firstName} ${form.lastName}`, country: codes.countryCode })
    : [];

  async function save() {
    if (!form) return;
    setConfirming(false);
    setSaving(true);
    setSaveError(null);
    const res = await postOrderAction(row.id, "modify", { address: { ...form, ...codes }, note });
    setSaving(false);
    if (res.error) setSaveError(res.error);
    else onSaved();
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={`Modify ${String(row.number)}`}
        description="Edits the order's shipping address and note in Shopify."
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => setConfirming(true)} disabled={!form || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        {loading ? (
          <LoadingState />
        ) : loadError || !form ? (
          <p className="text-sm text-destructive">{loadError ?? "No shipping address on this order."}</p>
        ) : (
          <div className="space-y-5">
            {flags.length ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm">
                <p className="font-medium text-destructive">Flagged on intake</p>
                <ul className="mt-1 list-disc pl-5 text-foreground">
                  {flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              {ADDRESS_FIELDS.map((f) => (
                <div key={f.key} className={f.half ? "space-y-2" : "col-span-2 space-y-2"}>
                  <Label htmlFor={`addr-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`addr-${f.key}`}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="order-note">Order note</Label>
                <Textarea id="order-note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <div
              className={
                liveIssues.length
                  ? "rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm"
                  : "rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success"
              }
            >
              {liveIssues.length ? (
                <>
                  <p className="font-medium">Still looks off:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {liveIssues.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              ) : (
                "Address passes the checks."
              )}
            </div>
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={save}
        title={`Save changes to ${String(row.number)}?`}
        description="The shipping address and note are updated on the Shopify order."
        confirmLabel="Save"
        destructive={false}
      />
    </>
  );
}
