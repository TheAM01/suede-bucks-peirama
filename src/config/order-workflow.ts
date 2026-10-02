/**
 * The Orders workflow state machine — which control-panel action is allowed
 * from which operational status (`opsStatus`, see src/lib/order-ops.ts).
 * Client-safe plain data: the control panel reads it to decide which buttons
 * to show, and src/lib/order-workflow.ts enforces the same table server-side.
 *
 *   Exception ─┐
 *   Pending CC ┼─> Active ─> Packaged ─> Finalized ─> In Pickup & Packing ─> Dispatched
 *              │   (Create    (consignment   (label printed)   (button or QR scan)
 *              │    Package)   booked)
 *   Booking Failed ──────────────^
 *
 *   Dispatched ─> Fulfilled   ("Mark fulfilled", any courier; for the manual
 *                              courier also a second label scan on delivery)
 *
 *   Every dispatch goes on a load sheet the user picks (never automatic).
 */

/** Tab order follows the workflow: triage first, then the packing/dispatch pipeline, then everything else. */
export const ORDER_STATUS_OPTIONS = [
  { value: "exception", label: "Exception", variant: "destructive" as const },
  { value: "pending_cc", label: "Pending CC", variant: "warning" as const },
  { value: "active", label: "Active", variant: "info" as const },
  { value: "packaged", label: "Packaged", variant: "primary" as const },
  { value: "booking_failed", label: "Booking Failed", variant: "destructive" as const },
  { value: "finalized", label: "Finalized", variant: "secondary" as const },
  { value: "in_pickup_packing", label: "In Pickup & Packing", variant: "warning" as const },
  { value: "dispatched", label: "Dispatched", variant: "success" as const },
  { value: "fulfilled", label: "Fulfilled", variant: "success" as const },
  { value: "delivered", label: "Delivered", variant: "solid" as const },
  { value: "returned", label: "Returned", variant: "warning" as const },
  { value: "canceled", label: "Canceled", variant: "destructive" as const },
  { value: "draft", label: "Draft", variant: "outline" as const },
  { value: "duplicate", label: "Duplicate", variant: "secondary" as const },
  { value: "on_hold", label: "On Hold", variant: "warning" as const },
];

export function statusLabel(status: unknown): string {
  return ORDER_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? String(status ?? "—");
}

export type OrderAction =
  | "modify"
  | "move_active"
  | "move_exception"
  | "discard"
  | "create_package"
  | "unpackage"
  | "assign_consignment"
  | "print_label"
  | "dispatch"
  | "add_to_load_sheet"
  | "mark_fulfilled"
  | "mark_delivered"
  | "mark_returned"
  | "remove_from_sheet"
  | "move_to_sheet"
  | "cancel";

/** Every stage an order can still be edited in — all but Canceled. */
const EDITABLE_STAGES = ORDER_STATUS_OPTIONS.map((o) => o.value).filter((v) => v !== "canceled");

/** Where the control panel offers Modify as a workflow button (triage). Elsewhere it's the ⋯ menu's Edit, or the order page. */
export const MODIFY_BUTTON_TABS = ["exception", "active", "pending_cc"];

/** Stages where the shipping label already exists — an address edit means reprinting it. */
export const LABEL_PRINTED_STAGES = ["in_pickup_packing"];
/** Stages where the parcel has left — an address edit no longer reaches the courier. */
export const SHIPPED_STAGES = ["dispatched", "fulfilled", "delivered", "returned"];

export const ACTION_FROM: Record<OrderAction, readonly string[]> = {
  /** editing the order's customer details (shipping address, phone, email, note) */
  modify: EDITABLE_STAGES,
  move_active: ["exception", "pending_cc"],
  move_exception: ["active"],
  discard: ["exception", "active", "pending_cc"],
  create_package: ["active"],
  unpackage: ["packaged"],
  assign_consignment: ["packaged", "booking_failed"],
  print_label: ["finalized", "in_pickup_packing"],
  dispatch: ["in_pickup_packing"],
  /** a dispatched order that isn't on any load sheet yet (dispatched before sheets were automatic) */
  add_to_load_sheet: ["dispatched"],
  /** any courier: creates the Shopify fulfillment (manual-courier riders can also do it with a second label scan) */
  mark_fulfilled: ["dispatched", "delivered"],
  /** shipment tracking: the courier confirmed delivery (API couriers; manual ones use Mark fulfilled) */
  mark_delivered: ["dispatched"],
  /** shipment tracking: the parcel came back undelivered (RTO) */
  mark_returned: ["dispatched", "fulfilled", "delivered"],
  /** take a parcel off its (still Draft) load sheet — it goes back to In Pickup & Packing */
  remove_from_sheet: ["dispatched"],
  /** move a parcel to another Draft sheet of the same courier */
  move_to_sheet: ["dispatched"],
  cancel: ["finalized", "in_pickup_packing"],
};

export const ACTION_LABEL: Record<OrderAction, string> = {
  modify: "Modify",
  move_active: "Move to Active",
  move_exception: "Move to Exceptions",
  discard: "Discard",
  create_package: "Create Package",
  unpackage: "Back to Active",
  assign_consignment: "Assign consignment",
  print_label: "Print shipping label",
  dispatch: "Dispatch",
  add_to_load_sheet: "Add to load sheet",
  mark_fulfilled: "Mark fulfilled",
  mark_delivered: "Mark delivered",
  mark_returned: "Mark returned (RTO)",
  remove_from_sheet: "Remove from load sheet",
  move_to_sheet: "Move to another sheet",
  cancel: "Cancel",
};

/** The in-house Karachi courier — no API, so delivery is confirmed by hand (Mark fulfilled, or a second label scan). */
export const MANUAL_COURIER = "Manual (Karachi)";

/** Stages where a parcel has been handed over, so it belongs on a load sheet. */
export const ON_SHEET_STAGES = ["dispatched", "fulfilled", "delivered", "returned"];

export function canRun(action: OrderAction, status: unknown, _courier?: unknown): boolean {
  void _courier;
  return ACTION_FROM[action].includes(String(status));
}

/**
 * Couriers offered when assigning a consignment (a custom name can be typed
 * too). `code` is what `<courier-name>` becomes in a generated consignment ID
 * (src/config/consignment-schema.ts).
 */
export const COURIERS = [
  { value: "Insta", label: "Insta (out of city)", code: "INSTA" },
  { value: MANUAL_COURIER, label: "Manual courier (Karachi)", code: "MANKHI" },
] as const;

/** The courier's ID code: its listed code, else the custom name reduced to A–Z / 0–9. */
export function courierCode(courier: unknown): string {
  const known = COURIERS.find((c) => c.value === courier);
  return known ? known.code : String(courier ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Validate a typed courier name; a case-insensitive match to a listed courier is snapped to it. */
export function normalizeCourier(name: unknown): { courier?: string; error?: string } {
  const v = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!/[A-Za-z0-9]/.test(v)) return { error: "Enter the courier's name." };
  if (v.length > 40) return { error: "Courier name is too long (40 characters max)." };
  const known = COURIERS.find((c) => c.value.toLowerCase() === v.toLowerCase());
  return { courier: known ? known.value : v };
}

/** Karachi deliveries go with the in-house manual courier; everything else books with Insta. */
export function defaultCourierFor(city: unknown): string {
  return /karachi|\bkhi\b/i.test(String(city ?? "")) ? MANUAL_COURIER : "Insta";
}

/**
 * What scanning a shipping label's QR does, by the order's current tab: the
 * label only exists once printed, so a Finalized parcel moves to In Pickup &
 * Packing, a parcel already there is dispatched, and a dispatched
 * manual-courier parcel scanned again (by the rider, on delivery) is marked
 * fulfilled — other couriers' parcels are fulfilled from the app, never by a
 * stray rescan. Dispatching always asks which load sheet. Anything else is
 * left where it is and the scan page just reports its status.
 */
export const SCAN_ADVANCE: Partial<Record<string, OrderAction>> = {
  finalized: "print_label",
  in_pickup_packing: "dispatch",
  dispatched: "mark_fulfilled",
};

/** The site path a label's QR points to — opening it advances the order (see SCAN_ADVANCE). */
export function scanPath(consignmentId: string): string {
  return `/scan/${encodeURIComponent(consignmentId)}`;
}

/**
 * Normalize whatever a scanner produced into a consignment ID: label QRs hold
 * a full `/scan/<id>` URL, older labels and hand-typed codes are the bare ID.
 */
export function consignmentFromScan(code: string): string {
  const m = code.trim().match(/\/scan\/([^/?#\s]+)/);
  if (!m) return code.trim();
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
