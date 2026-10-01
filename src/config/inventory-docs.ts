/**
 * Inventory documents — purchase orders, transfers, and stocktakes. Each is a
 * header plus item lines, stored in MongoDB (src/lib/inventory-docs.ts); the
 * stock effect of each step is posted to Shopify, which stays the source of
 * truth for quantities. Client-safe plain data: the detail page reads it to
 * decide which buttons to show; the server enforces the same table.
 *
 *   Purchase order: Draft ─> Ordered ─> In transit ─> Partially received ─> Received
 *                     │         └──────────┴──────> (receive) ─┘      └─> Closed (rest not coming)
 *                     └─> Cancelled (only before anything is received)
 *
 *   Transfer:       Draft ─> In transit ─> Partially received ─> Received
 *                  (send: stock leaves the source)        └─> Closed (rest lost in transit)
 *                     └─> Cancelled (before sending, or in transit with nothing
 *                                    received — the stock goes back to the source)
 *
 *   Stocktake:      Draft (counting) ─> Posted (variances posted to Shopify)
 *                     └─> Cancelled
 */

export type InventoryDocKind = "purchase-orders" | "transfers" | "stocktakes";

export const INVENTORY_DOC_KINDS: InventoryDocKind[] = ["purchase-orders", "transfers", "stocktakes"];

export function isInventoryDocKind(v: unknown): v is InventoryDocKind {
  return typeof v === "string" && (INVENTORY_DOC_KINDS as string[]).includes(v);
}

export const DOC_PREFIX: Record<InventoryDocKind, string> = {
  "purchase-orders": "PO",
  transfers: "TR",
  stocktakes: "SC",
};

export const DOC_NOUN: Record<InventoryDocKind, string> = {
  "purchase-orders": "Purchase order",
  transfers: "Transfer",
  stocktakes: "Stocktake",
};

type Variant = "primary" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline" | "solid";

export const DOC_STATUS_OPTIONS: Record<InventoryDocKind, { value: string; label: string; variant: Variant }[]> = {
  "purchase-orders": [
    { value: "draft", label: "Draft", variant: "outline" },
    { value: "ordered", label: "Ordered", variant: "info" },
    { value: "in_transit", label: "In transit", variant: "primary" },
    { value: "partial", label: "Partially received", variant: "warning" },
    { value: "received", label: "Received", variant: "success" },
    { value: "closed", label: "Closed", variant: "secondary" },
    { value: "cancelled", label: "Cancelled", variant: "destructive" },
  ],
  transfers: [
    { value: "draft", label: "Draft", variant: "outline" },
    { value: "in_transit", label: "In transit", variant: "primary" },
    { value: "partial", label: "Partially received", variant: "warning" },
    { value: "received", label: "Received", variant: "success" },
    { value: "closed", label: "Closed", variant: "secondary" },
    { value: "cancelled", label: "Cancelled", variant: "destructive" },
  ],
  stocktakes: [
    { value: "draft", label: "Counting", variant: "warning" },
    { value: "posted", label: "Posted", variant: "success" },
    { value: "cancelled", label: "Cancelled", variant: "destructive" },
  ],
};

export function docStatus(kind: InventoryDocKind, status: unknown) {
  return (
    DOC_STATUS_OPTIONS[kind].find((o) => o.value === status) ?? {
      value: String(status ?? ""),
      label: String(status ?? "—"),
      variant: "outline" as Variant,
    }
  );
}

export type DocAction =
  | "set_lines"
  | "load_location"
  | "place"
  | "ship"
  | "send"
  | "receive"
  | "post"
  | "close"
  | "cancel";

/** Which action runs from which status, per kind. */
export const DOC_ACTION_FROM: Record<InventoryDocKind, Partial<Record<DocAction, readonly string[]>>> = {
  "purchase-orders": {
    set_lines: ["draft"],
    place: ["draft"],
    ship: ["ordered", "in_transit"],
    receive: ["ordered", "in_transit", "partial"],
    close: ["partial"],
    cancel: ["draft", "ordered", "in_transit"],
  },
  transfers: {
    set_lines: ["draft"],
    send: ["draft"],
    ship: ["in_transit"],
    receive: ["in_transit", "partial"],
    close: ["partial"],
    cancel: ["draft", "in_transit"],
  },
  stocktakes: {
    set_lines: ["draft"],
    load_location: ["draft"],
    post: ["draft"],
    cancel: ["draft"],
  },
};

export function canRunDoc(kind: InventoryDocKind, action: DocAction, status: unknown): boolean {
  return DOC_ACTION_FROM[kind][action]?.includes(String(status)) ?? false;
}

/** Statuses where the document's goods are still on their way — feeds Inbound and the inventory On order / In transit columns. */
export const OPEN_INBOUND_STATUSES = ["ordered", "in_transit", "partial"] as const;

/** One item line. `qty` = ordered (PO) / sent (transfer); stocktakes use `counted` / `expected`. */
export interface DocLine {
  inventoryItemId: string;
  item: string;
  sku: string;
  qty: number;
  received?: number;
  unitCost?: number;
  /** stocktake: units counted (null = not counted yet, the line is skipped on post) */
  counted?: number | null;
  /** stocktake: Shopify `available` at the moment the count was posted */
  expected?: number;
}
