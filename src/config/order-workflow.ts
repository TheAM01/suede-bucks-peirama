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
  | "cancel";

export const ACTION_FROM: Record<OrderAction, readonly string[]> = {
  modify: ["exception", "active", "pending_cc"],
  move_active: ["exception", "pending_cc"],
  move_exception: ["active"],
  discard: ["exception", "active", "pending_cc"],
  create_package: ["active"],
  unpackage: ["packaged"],
  assign_consignment: ["packaged", "booking_failed"],
  print_label: ["finalized", "in_pickup_packing"],
  dispatch: ["in_pickup_packing"],
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
  cancel: "Cancel",
};

export function canRun(action: OrderAction, status: unknown): boolean {
  return ACTION_FROM[action].includes(String(status));
}

/** Couriers a consignment can be booked with. `api` couriers can be booked automatically. */
export const COURIERS = [
  { value: "Insta", label: "Insta (out of city)", api: true },
  { value: "Manual (Karachi)", label: "Manual courier (Karachi)", api: false },
] as const;

/** Karachi deliveries go with the in-house manual courier; everything else books with Insta. */
export function defaultCourierFor(city: unknown): string {
  return /karachi|\bkhi\b/i.test(String(city ?? "")) ? "Manual (Karachi)" : "Insta";
}
