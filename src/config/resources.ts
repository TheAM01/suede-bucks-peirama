import { ORDER_STATUS_OPTIONS } from "./order-workflow";
import { DOC_STATUS_OPTIONS, OPEN_INBOUND_STATUSES } from "./inventory-docs";
import { SHIPMENT_STUCK_DAYS, TRACKING_STAGES } from "./logistics";
import {
  Users,
  UserCheck,
  UserPlus,
  Wallet,
  UsersRound,
  Radius,
  Ruler,
  TicketPercent,
  BadgeCheck,
  Repeat,
  Package,
  PackageCheck,
  PackageX,
  Boxes,
  Layers,
  Bot,
  FolderTree,
  Folder,
  ShoppingCart,
  DollarSign,
  Truck,
  Receipt,
  FileText,
  Send,
  CreditCard,
  RotateCcw,
  ShoppingBag,
  MailCheck,
  MonitorSmartphone,
  Store,
  MapPin,
  Warehouse,
  IdCard,
  ShieldCheck,
  Building2,
  AlertTriangle,
  TrendingUp,
  SlidersHorizontal,
  Lock,
  Archive,
  PackageReturn,
  History,
  ClipboardList,
  ClipboardCheck,
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  Clock,
  Navigation,
  Inbox,
  Banknote,
} from "@/components/icons";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { periodDelta, windowTotals } from "@/lib/insights";
import type { BadgeVariant, ResourceConfig, Row, StatResult } from "./resource-types";

// --- stat helpers -----------------------------------------------------------
const num = (r: Row, k: string) => Number(r[k] ?? 0);
const sum = (rows: Row[], k: string) => rows.reduce((a, r) => a + num(r, k), 0);
const count = (rows: Row[], pred: (r: Row) => boolean) => rows.filter(pred).length;
const money = (n: number): StatResult => ({ value: formatCurrency(n) });
const int = (n: number): StatResult => ({ value: formatNumber(n) });
/** Attach a real trailing-30-day vs prior-30-day change — omitted when there's no baseline (see src/lib/insights.ts). */
const trended = (base: StatResult, delta: number | undefined): StatResult =>
  delta === undefined ? base : { ...base, delta, caption: "vs prior 30 days" };

// --- inventory / logistics helpers --------------------------------------------
const isOpenInbound = (r: Row) => (OPEN_INBOUND_STATUSES as readonly string[]).includes(String(r.status));
/** Value of what's still to arrive on a PO (line values pro-rated by units remaining). */
const openValue = (r: Row) => (num(r, "units") ? (num(r, "value") * num(r, "remainingUnits")) / num(r, "units") : 0);
const todayIso = () => new Date().toISOString().slice(0, 10);
const isPast = (d: unknown) => Boolean(d) && String(d) < todayIso();
const isWithinDays = (d: unknown, days: number) =>
  Boolean(d) && Date.now() - Date.parse(String(d)) <= days * 86_400_000;

/** Order shipping types (bucketed by shippingType() in src/lib/shopify-reads.ts) for the Orders "Ship" indicator. */
const SHIPPING_TYPE_OPTIONS: { value: string; label: string; short: string; variant: BadgeVariant }[] = [
  { value: "standard", label: "Standard shipping", short: "STD", variant: "secondary" },
  { value: "express", label: "Express shipping", short: "EXP", variant: "warning" },
  { value: "overnight", label: "Overnight / same-day", short: "ON", variant: "destructive" },
  { value: "economy", label: "Economy shipping", short: "ECO", variant: "outline" },
  { value: "free", label: "Free shipping", short: "FREE", variant: "success" },
  { value: "pickup", label: "Local pickup", short: "PICK", variant: "info" },
  { value: "pos", label: "Sold in store (POS)", short: "POS", variant: "primary" },
  { value: "none", label: "No shipping (POS or not shipped)", short: "—", variant: "outline" },
];

const MOVEMENT_TYPE_OPTIONS: { value: string; label: string; variant: BadgeVariant }[] = [
  { value: "sale", label: "Sale", variant: "secondary" },
  { value: "receipt", label: "PO receipt", variant: "success" },
  { value: "transfer_out", label: "Transfer out", variant: "warning" },
  { value: "transfer_in", label: "Transfer in", variant: "info" },
  { value: "adjustment", label: "Adjustment", variant: "primary" },
  { value: "stocktake", label: "Stocktake", variant: "outline" },
];

const INBOUND_TIMING: { value: string; label: string; variant: BadgeVariant }[] = [
  { value: "overdue", label: "Overdue", variant: "destructive" },
  { value: "today", label: "Due today", variant: "warning" },
  { value: "upcoming", label: "Upcoming", variant: "info" },
  { value: "no_date", label: "No date", variant: "outline" },
];

// --- shared option sets -----------------------------------------------------
const ACTIVE_STATUS = [
  { value: "active", label: "Active", variant: "success" as const },
  { value: "draft", label: "Draft", variant: "outline" as const },
  { value: "archived", label: "Archived", variant: "secondary" as const },
];

// Shared by dispatch and returns — both hand a parcel to the same courier
// roster, moving between the same physical locations.
export const COURIER_OPTIONS = [
  { value: "Leopards Courier", label: "Leopards Courier" },
  { value: "TCS", label: "TCS" },
  { value: "M&P", label: "M&P" },
  { value: "PostEx", label: "PostEx" },
  { value: "Trax", label: "Trax" },
  { value: "Call Courier", label: "Call Courier" },
  { value: "DHL", label: "DHL" },
  { value: "FedEx", label: "FedEx" },
  { value: "Insta", label: "Insta" },
  { value: "Manual (Karachi)", label: "Manual (Karachi)" },
  { value: "Other", label: "Other" },
];

export const LOCATION_OPTIONS = [
  { value: "Main Warehouse", label: "Main Warehouse" },
  { value: "Flagship Store", label: "Flagship Store" },
  { value: "Airport Popup", label: "Airport Popup" },
  { value: "Downtown Kiosk", label: "Downtown Kiosk" },
];

// The Orders operational-status lifecycle — independent of Shopify's own
// payment/fulfillment fields, see src/lib/order-ops.ts. Shared between the
// field's dropdown options and the tab bar so they can't drift apart; defined
// with the workflow rules in src/config/order-workflow.ts.
const ORDER_OPS_OPTIONS = ORDER_STATUS_OPTIONS;

export const RESOURCES: Record<string, ResourceConfig> = {
  // ==========================================================================
  customers: {
    key: "customers",
    singular: "Customer",
    plural: "Customers",
    icon: Users,
    subtitle: "People who buy from you",
    guide: "customers",
    searchKeys: ["name", "email", "location"],
    columns: [
      { key: "name", header: "Customer", type: "primary", sub: "email" },
      { key: "status", header: "Status", type: "status" },
      { key: "orders", header: "Orders", type: "number", align: "right" },
      { key: "spent", header: "Spent", type: "currency", align: "right" },
      { key: "location", header: "Location", type: "muted" },
      { key: "createdAt", header: "Joined", type: "date" },
    ],
    fields: [
      { key: "name", label: "Full name", type: "text", required: true, half: true },
      { key: "email", label: "Email", type: "email", required: true, half: true },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "Active", variant: "success" },
          { value: "invited", label: "Invited", variant: "info" },
          { value: "disabled", label: "Disabled", variant: "secondary" },
        ],
      },
      { key: "location", label: "Location", type: "text", half: true },
      { key: "orders", label: "Orders", type: "number", half: true },
      { key: "spent", label: "Total spent", type: "currency", half: true },
      { key: "createdAt", label: "Joined", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Total customers", icon: Users, tone: "primary", compute: (r) => trended(int(r.length), periodDelta(r, 30)) },
      { label: "Active", icon: UserCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "active")) },
      { label: "New (30d)", icon: UserPlus, tone: "highlight", compute: (r) => int(windowTotals(r, 30).cur) },
      { label: "Avg. lifetime value", icon: Wallet, tone: "info", compute: (r) => money(r.length ? sum(r, "spent") / r.length : 0) },
    ],
  },

  // ==========================================================================
  segments: {
    key: "segments",
    singular: "Segment",
    plural: "Segments",
    icon: UsersRound,
    subtitle: "Grouped customer audiences",
    guide: "segments",
    searchKeys: ["name", "description"],
    columns: [
      { key: "name", header: "Segment", type: "primary", sub: "description" },
      { key: "status", header: "Status", type: "status" },
      { key: "members", header: "Members", type: "number", align: "right" },
      { key: "growth", header: "Growth", type: "number", align: "right" },
      { key: "updatedAt", header: "Updated", type: "date" },
    ],
    fields: [
      { key: "name", label: "Segment name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      {
        key: "customerIds",
        label: "Members",
        type: "multiselect",
        itemNoun: "customer",
        optionsFrom: {
          resource: "customers",
          valueKey: "id",
          labelKey: "name",
          subKey: "email",
        },
        help: "Pick the customers in this segment. The member count is derived from this list.",
      },
      { key: "growth", label: "Growth %", type: "number", half: true },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "Active", variant: "success" },
          { value: "draft", label: "Draft", variant: "outline" },
        ],
      },
      { key: "updatedAt", label: "Updated", type: "date", half: true },
    ],
    stats: [
      { label: "Segments", icon: UsersRound, tone: "primary", compute: (r) => int(r.length) },
      { label: "Total reach", icon: Radius, tone: "info", compute: (r) => int(sum(r, "members")) },
      { label: "Largest segment", icon: TrendingUp, tone: "highlight", compute: (r) => int(Math.max(0, ...r.map((x) => num(x, "members")))) },
      { label: "Avg. size", icon: Ruler, tone: "success", compute: (r) => int(r.length ? Math.round(sum(r, "members") / r.length) : 0) },
    ],
  },

  // ==========================================================================
  discounts: {
    key: "discounts",
    singular: "Discount",
    plural: "Discounts",
    icon: TicketPercent,
    subtitle: "Codes and automatic offers",
    guide: "discounts",
    searchKeys: ["code", "value"],
    columns: [
      { key: "code", header: "Code", type: "mono" },
      { key: "type", header: "Type", type: "status" },
      { key: "value", header: "Value", type: "text" },
      { key: "status", header: "Status", type: "status" },
      { key: "used", header: "Redemptions", type: "number", align: "right" },
      { key: "endsAt", header: "Ends", type: "date" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true, half: true },
      {
        key: "type",
        label: "Type",
        type: "status",
        half: true,
        options: [
          { value: "percentage", label: "Percentage", variant: "primary" },
          { value: "fixed", label: "Fixed amount", variant: "info" },
          { value: "bogo", label: "Buy X get Y", variant: "warning" },
          { value: "shipping", label: "Free shipping", variant: "secondary" },
        ],
      },
      { key: "value", label: "Value", type: "text", half: true, placeholder: "20% or $10" },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "Active", variant: "success" },
          { value: "scheduled", label: "Scheduled", variant: "info" },
          { value: "expired", label: "Expired", variant: "secondary" },
        ],
      },
      { key: "used", label: "Redemptions", type: "number", half: true },
      { key: "startsAt", label: "Starts", type: "date", half: true },
      { key: "endsAt", label: "Ends", type: "date", half: true },
    ],
    stats: [
      { label: "Active discounts", icon: BadgeCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "active")) },
      { label: "Total redemptions", icon: Repeat, tone: "primary", compute: (r) => int(sum(r, "used")) },
      { label: "Scheduled", icon: TicketPercent, tone: "info", compute: (r) => int(count(r, (x) => x.status === "scheduled")) },
      { label: "Expired", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "expired")) },
    ],
  },

  // ==========================================================================
  products: {
    key: "products",
    singular: "Product",
    plural: "Products",
    icon: Package,
    subtitle: "Everything you sell",
    guide: "products",
    searchKeys: ["name", "sku", "category", "vendor"],
    columns: [
      { key: "name", header: "Product", type: "primary", sub: "sku" },
      { key: "category", header: "Category", type: "muted" },
      { key: "price", header: "Price", type: "currency", align: "right" },
      { key: "stock", header: "Stock", type: "number", align: "right" },
      { key: "status", header: "Status", type: "status" },
    ],
    fields: [
      { key: "name", label: "Title", type: "text", required: true },
      { key: "sku", label: "SKU", type: "text", half: true },
      {
        key: "category",
        label: "Category",
        type: "select",
        half: true,
        options: [
          { value: "Eau de Parfum", label: "Eau de Parfum" },
          { value: "Eau de Toilette", label: "Eau de Toilette" },
          { value: "Extrait", label: "Extrait" },
          { value: "Discovery Sets", label: "Discovery Sets" },
          { value: "Body & Bath", label: "Body & Bath" },
          { value: "Home & Candles", label: "Home & Candles" },
        ],
      },
      { key: "vendor", label: "Vendor", type: "text", half: true },
      { key: "price", label: "Price", type: "currency", half: true, required: true },
      { key: "cost", label: "Cost per item", type: "currency", half: true },
      { key: "stock", label: "Stock", type: "number", half: true },
      { key: "status", label: "Status", type: "status", half: true, options: ACTIVE_STATUS },
      { key: "description", label: "Description", type: "textarea" },
    ],
    stats: [
      { label: "Total products", icon: Package, tone: "primary", compute: (r) => int(r.length) },
      { label: "Active", icon: PackageCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "active")) },
      { label: "Out of stock", icon: PackageX, tone: "destructive", compute: (r) => int(count(r, (x) => num(x, "stock") <= 0)) },
      { label: "Inventory value", icon: Wallet, tone: "info", compute: (r) => money(r.reduce((a, x) => a + num(x, "price") * num(x, "stock"), 0)) },
    ],
  },

  // ==========================================================================
  collections: {
    key: "collections",
    singular: "Collection",
    plural: "Collections",
    icon: Layers,
    subtitle: "Grouped product sets",
    guide: "collections",
    searchKeys: ["name", "description"],
    columns: [
      { key: "name", header: "Collection", type: "primary", sub: "description" },
      { key: "type", header: "Type", type: "status" },
      { key: "products", header: "Products", type: "number", align: "right" },
      { key: "status", header: "Status", type: "status" },
      { key: "updatedAt", header: "Updated", type: "date" },
    ],
    fields: [
      { key: "name", label: "Title", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "status",
        half: true,
        options: [
          { value: "manual", label: "Manual", variant: "info" },
          { value: "automated", label: "Automated", variant: "primary" },
        ],
      },
      { key: "products", label: "Products", type: "number", half: true },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "Active", variant: "success" },
          { value: "draft", label: "Draft", variant: "outline" },
        ],
      },
      { key: "updatedAt", label: "Updated", type: "date", half: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
    stats: [
      { label: "Collections", icon: Layers, tone: "primary", compute: (r) => int(r.length) },
      { label: "Products grouped", icon: Package, tone: "info", compute: (r) => int(sum(r, "products")) },
      { label: "Automated", icon: Bot, tone: "highlight", compute: (r) => int(count(r, (x) => x.type === "automated")) },
      { label: "Active", icon: BadgeCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "active")) },
    ],
  },

  // ==========================================================================
  inventory: {
    key: "inventory",
    singular: "Stock item",
    plural: "Inventory",
    icon: Boxes,
    subtitle: "Stock levels per location",
    guide: "inventory",
    searchKeys: ["name", "sku", "location"],
    // Quantities come from Shopify and move through documents; a row only
    // takes its app-side reorder settings.
    capabilities: { create: false, delete: false, bulkMove: false },
    tabs: {
      field: "status",
      options: [
        { value: "in_stock", label: "In stock" },
        { value: "low", label: "Low stock" },
        { value: "out", label: "Out of stock" },
      ],
    },
    columns: [
      { key: "name", header: "Item", type: "primary", sub: "sku" },
      { key: "location", header: "Location", type: "muted" },
      { key: "onHand", header: "On hand", type: "number", align: "right" },
      { key: "committed", header: "Committed", type: "number", align: "right" },
      { key: "available", header: "Available", type: "number", align: "right" },
      { key: "onOrder", header: "On order", type: "number", align: "right" },
      { key: "inTransit", header: "In transit", type: "number", align: "right" },
      { key: "reorderPoint", header: "Reorder at", type: "number", align: "right" },
      { key: "suggested", header: "Suggested order", type: "number", align: "right" },
      { key: "stockValue", header: "Stock value", type: "currency", align: "right" },
      { key: "status", header: "Status", type: "status" },
    ],
    fields: [
      {
        key: "reorderPoint",
        label: "Reorder point",
        type: "number",
        half: true,
        help: "Low stock when Available falls to this (5 if left at 0).",
      },
      {
        key: "reorderQty",
        label: "Reorder quantity",
        type: "number",
        half: true,
        help: "How much a top-up should bring in — drives Suggested order.",
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        hidden: true,
        options: [
          { value: "in_stock", label: "In stock", variant: "success" },
          { value: "low", label: "Low stock", variant: "warning" },
          { value: "out", label: "Out of stock", variant: "destructive" },
        ],
      },
    ],
    stats: [
      { label: "Units on hand", icon: Package, tone: "primary", compute: (r) => int(sum(r, "onHand")) },
      { label: "Stock value", icon: DollarSign, tone: "info", compute: (r) => money(sum(r, "stockValue")) },
      { label: "Low stock", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "low")) },
      { label: "Out of stock", icon: PackageX, tone: "destructive", compute: (r) => int(count(r, (x) => x.status === "out")) },
    ],
  },

  // ==========================================================================
  "stock-movements": {
    key: "stock-movements",
    singular: "Stock movement",
    plural: "Stock Movements",
    icon: History,
    subtitle: "Every stock change, per item and location",
    guide: "stock-movements",
    searchKeys: ["reference", "item", "sku", "location", "note"],
    rowHref: (r) => (r.href ? String(r.href) : "/dashboard/stock-movements"),
    tabs: {
      field: "type",
      options: MOVEMENT_TYPE_OPTIONS.map(({ value, label }) => ({ value, label })),
    },
    columns: [
      { key: "at", header: "When", type: "datetime" },
      { key: "reference", header: "Document", type: "mono" },
      { key: "type", header: "Type", type: "status" },
      { key: "item", header: "Item", type: "primary", sub: "sku" },
      { key: "location", header: "Location", type: "muted" },
      { key: "delta", header: "Change", type: "number", align: "right" },
      { key: "note", header: "Note", type: "muted" },
    ],
    fields: [{ key: "type", label: "Type", type: "status", options: MOVEMENT_TYPE_OPTIONS }],
    stats: [
      { label: "Movements", icon: History, tone: "primary", compute: (r) => int(r.length) },
      { label: "Units in", icon: ArrowDown, tone: "success", compute: (r) => int(sum(r.filter((x) => num(x, "delta") > 0), "delta")) },
      { label: "Units out", icon: ArrowUp, tone: "warning", compute: (r) => int(-sum(r.filter((x) => num(x, "delta") < 0), "delta")) },
      { label: "Net change", icon: Boxes, tone: "info", compute: (r) => int(sum(r, "delta")) },
    ],
  },

  // ==========================================================================
  "purchase-orders": {
    key: "purchase-orders",
    singular: "Purchase order",
    plural: "Purchase Orders",
    icon: ClipboardList,
    subtitle: "Stock ordered from suppliers",
    guide: "purchase-orders",
    searchKeys: ["number", "supplier", "location", "trackingNumber"],
    rowHref: (r) => `/dashboard/purchase-orders/${r.id}`,
    rowLocked: (r) => r.status !== "draft",
    lockedHint: "Open it to receive stock or update shipping — only drafts are edited or deleted from the list.",
    capabilities: { bulkMove: false },
    tabs: { field: "status", options: DOC_STATUS_OPTIONS["purchase-orders"].map(({ value, label }) => ({ value, label })) },
    columns: [
      { key: "number", header: "PO", type: "primary", sub: "supplier" },
      { key: "location", header: "Deliver to", type: "muted" },
      { key: "status", header: "Status", type: "status" },
      { key: "units", header: "Units", type: "number", align: "right" },
      { key: "receivedUnits", header: "Received", type: "number", align: "right" },
      { key: "value", header: "Value", type: "currency", align: "right" },
      { key: "expectedAt", header: "Expected", type: "date" },
      { key: "createdAt", header: "Created", type: "date" },
    ],
    fields: [
      {
        key: "supplierId",
        label: "Supplier",
        type: "select",
        required: true,
        optionsFrom: { resource: "suppliers", valueKey: "id", labelKey: "name" },
        help: "Add suppliers on the Suppliers page.",
      },
      {
        key: "locationId",
        label: "Deliver to",
        type: "select",
        required: true,
        half: true,
        optionsFrom: { resource: "locations", valueKey: "id", labelKey: "name" },
      },
      { key: "expectedAt", label: "Expected by", type: "date", half: true },
      { key: "carrier", label: "Carrier", type: "text", half: true, placeholder: "Optional — set when shipped" },
      { key: "trackingNumber", label: "Tracking number", type: "text", half: true },
      { key: "eta", label: "ETA", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "status", label: "Status", type: "status", hidden: true, options: DOC_STATUS_OPTIONS["purchase-orders"] },
    ],
    stats: [
      { label: "Open orders", icon: ClipboardList, tone: "primary", compute: (r) => int(count(r, isOpenInbound)) },
      { label: "Units on order", icon: Boxes, tone: "info", compute: (r) => int(sum(r.filter(isOpenInbound), "remainingUnits")) },
      { label: "Value on order", icon: DollarSign, tone: "highlight", compute: (r) => money(r.filter(isOpenInbound).reduce((a, x) => a + openValue(x), 0)) },
      { label: "Overdue", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => isOpenInbound(x) && isPast(x.eta || x.expectedAt))) },
    ],
  },

  // ==========================================================================
  suppliers: {
    key: "suppliers",
    singular: "Supplier",
    plural: "Suppliers",
    icon: Building2,
    subtitle: "Who you buy stock from",
    guide: "suppliers",
    searchKeys: ["name", "contact", "email", "phone", "city"],
    columns: [
      { key: "name", header: "Supplier", type: "primary", sub: "contact" },
      { key: "phone", header: "Phone", type: "text" },
      { key: "email", header: "Email", type: "muted" },
      { key: "city", header: "City", type: "muted" },
      { key: "leadTimeDays", header: "Lead time (days)", type: "number", align: "right" },
      { key: "paymentTerms", header: "Terms", type: "text" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "contact", label: "Contact person", type: "text", half: true },
      { key: "phone", label: "Phone", type: "text", half: true },
      { key: "email", label: "Email", type: "email", half: true },
      { key: "city", label: "City", type: "text", half: true },
      { key: "leadTimeDays", label: "Lead time (days)", type: "number", half: true, help: "Usual days from order to delivery." },
      { key: "paymentTerms", label: "Payment terms", type: "text", half: true, placeholder: "e.g. 50% advance, rest on delivery" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Suppliers", icon: Building2, tone: "primary", compute: (r) => int(r.length) },
      { label: "Cities", icon: MapPin, tone: "info", compute: (r) => int(new Set(r.map((x) => String(x.city ?? "")).filter(Boolean)).size) },
      {
        label: "Avg. lead time",
        icon: Clock,
        tone: "highlight",
        compute: (r) => {
          const withLead = r.filter((x) => num(x, "leadTimeDays") > 0);
          return { value: withLead.length ? `${(sum(withLead, "leadTimeDays") / withLead.length).toFixed(1)} days` : "—" };
        },
      },
      { label: "No contact details", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => !x.phone && !x.email)) },
    ],
  },

  // ==========================================================================
  transfers: {
    key: "transfers",
    singular: "Transfer",
    plural: "Transfers",
    icon: ArrowLeftRight,
    subtitle: "Stock moving between locations",
    guide: "transfers",
    searchKeys: ["number", "from", "to", "trackingNumber"],
    rowHref: (r) => `/dashboard/transfers/${r.id}`,
    rowLocked: (r) => r.status !== "draft",
    lockedHint: "Open it to receive stock or update shipping — only drafts are edited or deleted from the list.",
    capabilities: { bulkMove: false },
    tabs: { field: "status", options: DOC_STATUS_OPTIONS.transfers.map(({ value, label }) => ({ value, label })) },
    columns: [
      { key: "number", header: "Transfer", type: "primary", sub: "from" },
      { key: "to", header: "To", type: "text" },
      { key: "status", header: "Status", type: "status" },
      { key: "units", header: "Units", type: "number", align: "right" },
      { key: "receivedUnits", header: "Received", type: "number", align: "right" },
      { key: "carrier", header: "Carrier", type: "muted" },
      { key: "eta", header: "ETA", type: "date" },
      { key: "createdAt", header: "Created", type: "date" },
    ],
    fields: [
      {
        key: "fromLocationId",
        label: "From",
        type: "select",
        required: true,
        half: true,
        optionsFrom: { resource: "locations", valueKey: "id", labelKey: "name" },
      },
      {
        key: "toLocationId",
        label: "To",
        type: "select",
        required: true,
        half: true,
        optionsFrom: { resource: "locations", valueKey: "id", labelKey: "name" },
      },
      { key: "carrier", label: "Carrier", type: "text", half: true, placeholder: "Optional" },
      { key: "trackingNumber", label: "Tracking number", type: "text", half: true },
      { key: "eta", label: "ETA", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "status", label: "Status", type: "status", hidden: true, options: DOC_STATUS_OPTIONS.transfers },
    ],
    stats: [
      { label: "In transit", icon: Truck, tone: "primary", compute: (r) => int(count(r, isOpenInbound)) },
      { label: "Units in transit", icon: Boxes, tone: "info", compute: (r) => int(sum(r.filter(isOpenInbound), "remainingUnits")) },
      { label: "Drafts", icon: FileText, tone: "highlight", compute: (r) => int(count(r, (x) => x.status === "draft")) },
      { label: "Overdue", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => isOpenInbound(x) && isPast(x.eta))) },
    ],
  },

  // ==========================================================================
  stocktakes: {
    key: "stocktakes",
    singular: "Stocktake",
    plural: "Stocktakes",
    icon: ClipboardCheck,
    subtitle: "Count stock and post the differences",
    guide: "stocktakes",
    searchKeys: ["number", "location", "notes"],
    rowHref: (r) => `/dashboard/stocktakes/${r.id}`,
    rowLocked: (r) => r.status !== "draft",
    lockedHint: "Posted and cancelled stocktakes are part of the audit trail.",
    capabilities: { bulkMove: false },
    tabs: { field: "status", options: DOC_STATUS_OPTIONS.stocktakes.map(({ value, label }) => ({ value, label })) },
    columns: [
      { key: "number", header: "Stocktake", type: "primary", sub: "location" },
      { key: "status", header: "Status", type: "status" },
      { key: "lineCount", header: "Items", type: "number", align: "right" },
      { key: "countedLines", header: "Counted", type: "number", align: "right" },
      { key: "varianceUnits", header: "Net variance", type: "number", align: "right" },
      { key: "createdAt", header: "Started", type: "date" },
      { key: "postedAt", header: "Posted", type: "datetime" },
    ],
    fields: [
      {
        key: "locationId",
        label: "Location",
        type: "select",
        required: true,
        optionsFrom: { resource: "locations", valueKey: "id", labelKey: "name" },
      },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "e.g. Monthly count — shelf A only" },
      { key: "status", label: "Status", type: "status", hidden: true, options: DOC_STATUS_OPTIONS.stocktakes },
    ],
    stats: [
      { label: "Counting", icon: ClipboardCheck, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "draft")) },
      { label: "Posted", icon: Lock, tone: "success", compute: (r) => int(count(r, (x) => x.status === "posted")) },
      { label: "Items counted", icon: Boxes, tone: "info", compute: (r) => int(sum(r.filter((x) => x.status === "posted"), "countedLines")) },
      { label: "Net variance", icon: SlidersHorizontal, tone: "highlight", compute: (r) => int(sum(r.filter((x) => x.status === "posted"), "varianceUnits")) },
    ],
  },

  // ==========================================================================
  "stock-adjustments": {
    key: "stock-adjustments",
    singular: "Stock adjustment",
    plural: "Stock Adjustments",
    icon: SlidersHorizontal,
    subtitle: "Audited stock corrections",
    guide: "stock-adjustments",
    searchKeys: ["number", "item", "sku", "facility", "reason"],
    rowLocked: (r) => r.status === "completed",
    lockedHint: "Completed adjustments are immutable — they're part of the audit trail.",
    columns: [
      { key: "number", header: "Adjustment", type: "primary", sub: "item" },
      { key: "status", header: "Status", type: "status" },
      { key: "reason", header: "Reason", type: "status" },
      { key: "facility", header: "Facility", type: "muted" },
      { key: "quantity", header: "Quantity", type: "number", align: "right" },
      { key: "createdAt", header: "Created", type: "date" },
      { key: "updatedAt", header: "Updated", type: "date" },
    ],
    fields: [
      {
        key: "itemId",
        label: "Item",
        type: "select",
        required: true,
        optionsFrom: {
          resource: "inventory",
          valueKey: "inventoryItemId",
          labelKey: "name",
          subKey: "sku",
        },
        help: "Pulled live from Shopify inventory.",
      },
      {
        key: "facilityId",
        label: "Facility",
        type: "select",
        required: true,
        half: true,
        optionsFrom: { resource: "locations", valueKey: "id", labelKey: "name" },
      },
      {
        key: "quantity",
        label: "Quantity",
        type: "number",
        required: true,
        half: true,
        help: "Positive adds stock, negative removes it.",
      },
      {
        key: "reason",
        label: "Reason",
        type: "status",
        half: true,
        options: [
          { value: "stocktake", label: "Stocktake variance", variant: "info" },
          { value: "damaged", label: "Damaged", variant: "destructive" },
          { value: "expired", label: "Expired", variant: "warning" },
          { value: "promotion", label: "Promotion / samples", variant: "primary" },
          { value: "shrinkage", label: "Shrinkage / theft", variant: "destructive" },
          { value: "received", label: "Stock received", variant: "success" },
          { value: "other", label: "Other", variant: "secondary" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "parked", label: "Parked", variant: "warning" },
          { value: "completed", label: "Completed", variant: "success" },
        ],
        help: "Completing posts the quantity change to Shopify and locks the document.",
      },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Adjustments", icon: SlidersHorizontal, tone: "primary", compute: (r) => int(r.length) },
      { label: "Parked", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "parked")) },
      { label: "Completed", icon: Lock, tone: "success", compute: (r) => int(count(r, (x) => x.status === "completed")) },
      { label: "Net units posted", icon: Boxes, tone: "info", compute: (r) => int(sum(r.filter((x) => x.status === "completed"), "quantity")) },
    ],
  },

  // ==========================================================================
  categories: {
    key: "categories",
    singular: "Category",
    plural: "Categories",
    icon: FolderTree,
    subtitle: "Catalog taxonomy",
    guide: "categories",
    searchKeys: ["name", "parent"],
    columns: [
      { key: "name", header: "Category", type: "primary", sub: "parent" },
      { key: "products", header: "Products", type: "number", align: "right" },
      { key: "status", header: "Status", type: "status" },
      { key: "updatedAt", header: "Updated", type: "date" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, half: true },
      { key: "parent", label: "Parent", type: "text", half: true },
      { key: "products", label: "Products", type: "number", half: true },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "Active", variant: "success" },
          { value: "hidden", label: "Hidden", variant: "secondary" },
        ],
      },
      { key: "updatedAt", label: "Updated", type: "date", half: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
    stats: [
      { label: "Categories", icon: FolderTree, tone: "primary", compute: (r) => int(r.length) },
      { label: "Top level", icon: Folder, tone: "info", compute: (r) => int(count(r, (x) => !x.parent)) },
      { label: "Products classified", icon: Package, tone: "success", compute: (r) => int(sum(r, "products")) },
      { label: "Hidden", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "hidden")) },
    ],
  },

  // ==========================================================================
  orders: {
    key: "orders",
    singular: "Order",
    plural: "Orders",
    icon: ShoppingCart,
    subtitle: "Incoming and fulfilled orders",
    guide: "orders",
    searchKeys: ["number", "customer", "customerAccount", "consignmentId", "shippingMethod"],
    rowHref: (r) => `/dashboard/orders/${r.id}`,
    tabs: { field: "opsStatus", options: ORDER_OPS_OPTIONS },
    columns: [
      // Shipping type at a glance, first thing after the checkbox (full method name on hover).
      { key: "shippingType", header: "Ship", type: "indicator" },
      { key: "number", header: "Order", type: "primary", sub: "customer" },
      { key: "opsStatus", header: "Status", type: "status" },
      { key: "city", header: "City", type: "muted" },
      { key: "courier", header: "Courier", type: "text" },
      { key: "consignmentId", header: "Consignment", type: "mono" },
      { key: "loadSheet", header: "Load sheet", type: "mono" },
      { key: "payment", header: "Payment", type: "status" },
      { key: "fulfillment", header: "Fulfillment", type: "status" },
      { key: "channel", header: "Channel", type: "status" },
      { key: "amount", header: "Amount", type: "currency", align: "right" },
      { key: "discount", header: "Disc.", type: "currency", align: "right" },
      { key: "shipping", header: "Shipping", type: "currency", align: "right" },
      { key: "total", header: "Net Total", type: "currency", align: "right" },
      { key: "gateway", header: "Gateway", type: "text" },
      { key: "tags", header: "Tags", type: "tags" },
      { key: "items", header: "Qty", type: "number", align: "right" },
      { key: "createdAt", header: "Date", type: "date" },
    ],
    fields: [
      {
        key: "shippingType",
        label: "Shipping",
        type: "status",
        hidden: true,
        options: SHIPPING_TYPE_OPTIONS,
      },
      { key: "number", label: "Order #", type: "text", required: true, half: true },
      { key: "customer", label: "Customer", type: "text", required: true, half: true },
      { key: "total", label: "Total", type: "currency", half: true },
      { key: "items", label: "Items", type: "number", half: true },
      {
        key: "opsStatus",
        label: "Order status",
        type: "status",
        half: true,
        options: ORDER_OPS_OPTIONS,
        help: "Independent of Payment/Fulfillment below — this is the operational stage staff track the order through (packaging, exceptions, etc), not Shopify's own status.",
      },
      {
        key: "payment",
        label: "Payment",
        type: "status",
        half: true,
        options: [
          { value: "paid", label: "Paid", variant: "success" },
          { value: "pending", label: "Pending", variant: "warning" },
          { value: "refunded", label: "Refunded", variant: "secondary" },
        ],
      },
      {
        key: "fulfillment",
        label: "Fulfillment",
        type: "status",
        half: true,
        options: [
          { value: "fulfilled", label: "Fulfilled", variant: "success" },
          { value: "partial", label: "Partial", variant: "warning" },
          { value: "unfulfilled", label: "Unfulfilled", variant: "destructive" },
        ],
      },
      {
        key: "channel",
        label: "Channel",
        type: "status",
        half: true,
        options: [
          { value: "online", label: "Online", variant: "info" },
          { value: "pos", label: "POS", variant: "primary" },
        ],
      },
      { key: "createdAt", label: "Date", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Orders", icon: ShoppingCart, tone: "primary", compute: (r) => trended(int(r.length), periodDelta(r, 30)) },
      { label: "Revenue", icon: DollarSign, tone: "success", compute: (r) => trended(money(sum(r, "total")), periodDelta(r, 30, "total")) },
      { label: "Unfulfilled", icon: Truck, tone: "warning", compute: (r) => int(count(r, (x) => x.fulfillment === "unfulfilled")) },
      { label: "Avg. order value", icon: Receipt, tone: "info", compute: (r) => money(r.length ? sum(r, "total") / r.length : 0) },
    ],
  },

  // ==========================================================================
  "draft-orders": {
    key: "draft-orders",
    singular: "Draft order",
    plural: "Draft Orders",
    icon: FileText,
    subtitle: "Manually created orders",
    guide: "draft-orders",
    searchKeys: ["number", "customer"],
    columns: [
      { key: "number", header: "Draft", type: "primary", sub: "customer" },
      { key: "total", header: "Total", type: "currency", align: "right" },
      { key: "status", header: "Status", type: "status" },
      { key: "createdAt", header: "Created", type: "date" },
    ],
    fields: [
      { key: "number", label: "Draft #", type: "text", required: true, half: true },
      { key: "customer", label: "Customer", type: "text", half: true },
      { key: "total", label: "Total", type: "currency", half: true },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "open", label: "Open", variant: "info" },
          { value: "invoice_sent", label: "Invoice sent", variant: "warning" },
          { value: "completed", label: "Completed", variant: "success" },
        ],
      },
      { key: "createdAt", label: "Created", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Open drafts", icon: FileText, tone: "primary", compute: (r) => int(count(r, (x) => x.status === "open")) },
      { label: "Pipeline value", icon: DollarSign, tone: "info", compute: (r) => money(sum(r, "total")) },
      { label: "Invoices sent", icon: Send, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "invoice_sent")) },
      { label: "Completed", icon: BadgeCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "completed")) },
    ],
  },

  // ==========================================================================
  dispatch: {
    key: "dispatch",
    singular: "Load sheet",
    plural: "Dispatch",
    icon: Truck,
    subtitle: "Courier load sheets for outgoing shipments",
    guide: "dispatch",
    searchKeys: ["reference", "courier", "location"],
    // Clicking a sheet opens its parcels + printable manifest; Edit/Delete stay in the row menu.
    rowHref: (r) => `/dashboard/dispatch/${r.id}`,
    tabs: {
      field: "status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "posted", label: "Posted" },
        { value: "archived", label: "Archived" },
      ],
    },
    columns: [
      { key: "_row", header: "#", type: "index" },
      { key: "reference", header: "Reference/ID", type: "mono" },
      { key: "courier", header: "Courier", type: "text" },
      { key: "consignmentIds", header: "Consignments", type: "tags" },
      { key: "location", header: "Location", type: "muted" },
      { key: "status", header: "Status", type: "status" },
      { key: "reconciliation", header: "Reconciliation", type: "status" },
      { key: "totalShipments", header: "Total Shipments", type: "number", align: "right" },
      { key: "totalAmount", header: "Total Amount", type: "currency", align: "right" },
      { key: "codAmount", header: "COD Amount", type: "currency", align: "right" },
      { key: "weight", header: "Weight", type: "number", align: "right" },
      { key: "createdAt", header: "Date Created", type: "datetime" },
      { key: "datePosted", header: "Date Posted", type: "datetime" },
    ],
    fields: [
      {
        key: "courier",
        label: "Courier",
        type: "select",
        required: true,
        half: true,
        options: COURIER_OPTIONS,
        help: "Locked once parcels are on the sheet — every parcel must be with this courier.",
      },
      {
        key: "location",
        label: "Location",
        type: "select",
        required: true,
        half: true,
        options: LOCATION_OPTIONS,
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "draft", label: "Draft", variant: "warning" },
          { value: "posted", label: "Posted", variant: "success" },
          { value: "archived", label: "Archived", variant: "secondary" },
        ],
        help: "Posting stamps today's date/time as Date Posted — it isn't reset if the sheet is later archived.",
      },
      {
        key: "reconciliation",
        label: "Reconciliation",
        type: "status",
        half: true,
        options: [
          { value: "pending", label: "Pending", variant: "warning" },
          { value: "reconciled", label: "Reconciled", variant: "success" },
        ],
        help: "Whether the COD this sheet's courier collected has been settled back to the store.",
      },
      // Counted from the parcels on the sheet — never typed in, so they can't drift.
      { key: "totalShipments", label: "Total shipments", type: "number", half: true, hidden: true },
      { key: "totalAmount", label: "Total amount", type: "currency", half: true, hidden: true },
      { key: "codAmount", label: "COD amount", type: "currency", half: true, hidden: true },
      { key: "weight", label: "Weight (kg)", type: "number", half: true, placeholder: "kg" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Load sheets", icon: Truck, tone: "primary", compute: (r) => int(r.length) },
      { label: "Draft", icon: FileText, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "draft")) },
      { label: "Posted", icon: Send, tone: "success", compute: (r) => int(count(r, (x) => x.status === "posted")) },
      { label: "Archived", icon: Archive, tone: "highlight", compute: (r) => int(count(r, (x) => x.status === "archived")) },
    ],
  },

  // ==========================================================================
  returns: {
    key: "returns",
    singular: "Return",
    plural: "Returns",
    icon: RotateCcw,
    subtitle: "Return authorizations, refunds, and restock handling",
    guide: "returns",
    searchKeys: ["reference", "orderNumber", "customer"],
    tabs: {
      field: "status",
      options: [
        { value: "requested", label: "Requested" },
        { value: "approved", label: "Approved" },
        { value: "in_transit", label: "In Transit" },
        { value: "received", label: "Received" },
        { value: "refunded", label: "Refunded" },
        { value: "rejected", label: "Rejected" },
      ],
    },
    columns: [
      { key: "_row", header: "#", type: "index" },
      { key: "reference", header: "RMA #", type: "mono" },
      { key: "orderNumber", header: "Order", type: "text", sub: "customer" },
      { key: "reason", header: "Reason", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "refundAmount", header: "Refund Amount", type: "currency", align: "right" },
      { key: "restockLocation", header: "Restock Location", type: "muted" },
      { key: "createdAt", header: "Date", type: "date" },
    ],
    fields: [
      { key: "reference", label: "RMA #", type: "text", required: true, half: true, placeholder: "RMA001" },
      { key: "orderNumber", label: "Order #", type: "text", required: true, half: true },
      { key: "customer", label: "Customer", type: "text", half: true },
      {
        key: "reason",
        label: "Reason",
        type: "status",
        half: true,
        options: [
          { value: "damaged", label: "Damaged", variant: "destructive" },
          { value: "wrong_item", label: "Wrong item", variant: "warning" },
          { value: "changed_mind", label: "Changed mind", variant: "secondary" },
          { value: "defective", label: "Defective", variant: "destructive" },
          { value: "late_delivery", label: "Late delivery", variant: "warning" },
          { value: "other", label: "Other", variant: "outline" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "requested", label: "Requested", variant: "warning" },
          { value: "approved", label: "Approved", variant: "info" },
          { value: "in_transit", label: "In Transit", variant: "info" },
          { value: "received", label: "Received", variant: "primary" },
          { value: "refunded", label: "Refunded", variant: "success" },
          { value: "rejected", label: "Rejected", variant: "destructive" },
        ],
        help: "Moves left to right as the return is picked up, arrives back, and is settled — Rejected ends the flow without a refund.",
      },
      { key: "refundAmount", label: "Refund amount", type: "currency", half: true },
      { key: "restockLocation", label: "Restock location", type: "select", half: true, options: LOCATION_OPTIONS },
      { key: "courier", label: "Pickup courier", type: "select", half: true, options: COURIER_OPTIONS },
      { key: "createdAt", label: "Date", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Returns", icon: RotateCcw, tone: "primary", compute: (r) => int(r.length) },
      { label: "Pending", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "requested" || x.status === "approved" || x.status === "in_transit")) },
      { label: "Refunded", icon: DollarSign, tone: "success", compute: (r) => money(sum(r.filter((x) => x.status === "refunded"), "refundAmount")) },
      { label: "Rejected", icon: PackageX, tone: "destructive", compute: (r) => int(count(r, (x) => x.status === "rejected")) },
    ],
  },

  // ==========================================================================
  "return-load-sheets": {
    key: "return-load-sheets",
    singular: "Return load sheet",
    plural: "Return Load Sheets",
    icon: PackageReturn,
    subtitle: "Courier handover sheets for incoming returns",
    guide: "return-load-sheets",
    searchKeys: ["reference", "courier", "location"],
    tabs: {
      field: "status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "posted", label: "Posted" },
        { value: "archived", label: "Archived" },
      ],
    },
    columns: [
      { key: "_row", header: "#", type: "index" },
      { key: "reference", header: "Reference/ID", type: "mono" },
      { key: "courier", header: "Courier", type: "text" },
      { key: "location", header: "Location", type: "muted" },
      { key: "status", header: "Status", type: "status" },
      { key: "reconciliation", header: "Reconciliation", type: "status" },
      { key: "totalShipments", header: "Total Shipments", type: "number", align: "right" },
      { key: "totalAmount", header: "Total Amount", type: "currency", align: "right" },
      { key: "codAmount", header: "COD Amount", type: "currency", align: "right" },
      { key: "weight", header: "Weight", type: "number", align: "right" },
      { key: "createdAt", header: "Date Created", type: "datetime" },
      { key: "datePosted", header: "Date Posted", type: "datetime" },
    ],
    fields: [
      { key: "courier", label: "Courier", type: "select", required: true, half: true, options: COURIER_OPTIONS },
      { key: "location", label: "Location", type: "select", required: true, half: true, options: LOCATION_OPTIONS },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "draft", label: "Draft", variant: "warning" },
          { value: "posted", label: "Posted", variant: "success" },
          { value: "archived", label: "Archived", variant: "secondary" },
        ],
        help: "Posting stamps today's date/time as Date Posted — it isn't reset if the sheet is later archived.",
      },
      {
        key: "reconciliation",
        label: "Reconciliation",
        type: "status",
        half: true,
        options: [
          { value: "pending", label: "Pending", variant: "warning" },
          { value: "reconciled", label: "Reconciled", variant: "success" },
        ],
        help: "Whether the COD this sheet's courier is returning (undelivered orders) has been settled/reconciled against Dispatch.",
      },
      { key: "totalShipments", label: "Total shipments", type: "number", half: true },
      { key: "totalAmount", label: "Total amount", type: "currency", half: true },
      { key: "codAmount", label: "COD amount", type: "currency", half: true },
      { key: "weight", label: "Weight (kg)", type: "number", half: true, placeholder: "kg" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Return sheets", icon: PackageReturn, tone: "primary", compute: (r) => int(r.length) },
      { label: "Draft", icon: FileText, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "draft")) },
      { label: "Posted", icon: Send, tone: "success", compute: (r) => int(count(r, (x) => x.status === "posted")) },
      { label: "Archived", icon: Archive, tone: "highlight", compute: (r) => int(count(r, (x) => x.status === "archived")) },
    ],
  },

  // ==========================================================================
  shipments: {
    key: "shipments",
    singular: "Shipment",
    plural: "Shipments",
    icon: Navigation,
    subtitle: "Every consignment, from pickup to delivery",
    guide: "shipments",
    searchKeys: ["number", "consignmentId", "courier", "city", "loadSheet"],
    rowHref: (r) => `/dashboard/orders/${r.id}`,
    // Ticked rows get the Shipments control panel (delivered / returned); nothing is edited directly.
    capabilities: { create: false, edit: false, delete: false, bulkMove: false },
    tabs: { field: "stage", options: TRACKING_STAGES.map(({ value, label }) => ({ value, label })) },
    columns: [
      { key: "number", header: "Order", type: "primary", sub: "consignmentId" },
      { key: "courier", header: "Courier", type: "text" },
      { key: "city", header: "City", type: "muted" },
      { key: "stage", header: "Tracking", type: "status" },
      { key: "daysInTransit", header: "Days out", type: "number", align: "right" },
      { key: "codAmount", header: "COD", type: "currency", align: "right" },
      { key: "loadSheet", header: "Load sheet", type: "mono" },
      { key: "dispatchedAt", header: "Dispatched", type: "datetime" },
      { key: "deliveredAt", header: "Delivered", type: "datetime" },
    ],
    fields: [{ key: "stage", label: "Tracking", type: "status", hidden: true, options: TRACKING_STAGES }],
    stats: [
      { label: "In transit", icon: Truck, tone: "primary", compute: (r) => int(count(r, (x) => x.stage === "in_transit")) },
      {
        label: `Stuck (over ${SHIPMENT_STUCK_DAYS} days)`,
        icon: AlertTriangle,
        tone: "warning",
        compute: (r) => int(count(r, (x) => x.stuck === true)),
      },
      { label: "COD in the field", icon: Wallet, tone: "info", compute: (r) => money(sum(r.filter((x) => x.stage === "in_transit"), "codAmount")) },
      {
        label: "Return rate",
        icon: RotateCcw,
        tone: "destructive",
        compute: (r) => {
          const done = count(r, (x) => x.stage === "delivered" || x.stage === "returned");
          return {
            value: done ? `${((count(r, (x) => x.stage === "returned") / done) * 100).toFixed(1)}%` : "—",
            caption: done ? `of ${formatNumber(done)} finished` : undefined,
          };
        },
      },
    ],
  },

  // ==========================================================================
  inbound: {
    key: "inbound",
    singular: "Inbound shipment",
    plural: "Inbound",
    icon: Inbox,
    subtitle: "Supplier orders and transfers on their way",
    guide: "inbound",
    searchKeys: ["number", "origin", "destination", "carrier", "trackingNumber"],
    rowHref: (r) => `/dashboard/${r.kind}/${r.docId}`,
    tabs: {
      field: "timing",
      options: INBOUND_TIMING.map(({ value, label }) => ({ value, label })),
    },
    columns: [
      { key: "number", header: "Document", type: "primary", sub: "origin" },
      { key: "type", header: "Type", type: "status" },
      { key: "destination", header: "To", type: "text" },
      { key: "status", header: "Status", type: "status" },
      { key: "carrier", header: "Carrier", type: "muted" },
      { key: "trackingNumber", header: "Tracking", type: "mono" },
      { key: "due", header: "Due", type: "date" },
      { key: "timing", header: "Timing", type: "status" },
      { key: "remainingUnits", header: "Units to come", type: "number", align: "right" },
    ],
    fields: [
      {
        key: "type",
        label: "Type",
        type: "status",
        options: [
          { value: "purchase", label: "Purchase order", variant: "primary" },
          { value: "transfer", label: "Transfer", variant: "info" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        // PO and transfer statuses share values; the PO list covers both.
        options: DOC_STATUS_OPTIONS["purchase-orders"],
      },
      { key: "timing", label: "Timing", type: "status", options: INBOUND_TIMING },
    ],
    stats: [
      { label: "On the way", icon: Inbox, tone: "primary", compute: (r) => int(r.length) },
      { label: "Units to come", icon: Boxes, tone: "info", compute: (r) => int(sum(r, "remainingUnits")) },
      { label: "Due today", icon: Clock, tone: "highlight", compute: (r) => int(count(r, (x) => x.timing === "today")) },
      { label: "Overdue", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => x.timing === "overdue")) },
    ],
  },

  // ==========================================================================
  "cod-remittances": {
    key: "cod-remittances",
    singular: "Remittance",
    plural: "COD Reconciliation",
    icon: Banknote,
    subtitle: "Cash on delivery owed and paid by couriers",
    guide: "cod-remittances",
    searchKeys: ["courier", "reference", "notes"],
    columns: [
      { key: "receivedAt", header: "Received", type: "date" },
      { key: "courier", header: "Courier", type: "primary", sub: "reference" },
      { key: "amount", header: "Amount", type: "currency", align: "right" },
      { key: "notes", header: "Notes", type: "muted" },
    ],
    fields: [
      {
        key: "courier",
        label: "Courier",
        type: "select",
        required: true,
        half: true,
        optionsFrom: { resource: "shipments", valueKey: "courier", labelKey: "courier" },
        help: "Couriers that have carried at least one consignment.",
      },
      { key: "amount", label: "Amount received", type: "currency", required: true, half: true },
      { key: "receivedAt", label: "Date received", type: "date", half: true },
      { key: "reference", label: "Payment reference", type: "text", half: true, placeholder: "Bank / cheque ref" },
      {
        key: "loadSheetIds",
        label: "Settles load sheets",
        type: "multiselect",
        itemNoun: "load sheet",
        optionsFrom: { resource: "dispatch", valueKey: "id", labelKey: "reference", subKey: "courier" },
        help: "Ticked sheets are marked COD reconciled when you save.",
      },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Remitted", icon: Banknote, tone: "success", compute: (r) => money(sum(r, "amount")) },
      {
        label: "Last 30 days",
        icon: Clock,
        tone: "info",
        compute: (r) => money(sum(r.filter((x) => isWithinDays(x.receivedAt, 30)), "amount")),
      },
      { label: "Remittances", icon: Receipt, tone: "primary", compute: (r) => int(r.length) },
      { label: "Couriers paid", icon: Truck, tone: "highlight", compute: (r) => int(new Set(r.map((x) => String(x.courier ?? ""))).size) },
    ],
  },

  // ==========================================================================
  leads: {
    key: "leads",
    singular: "Lead",
    plural: "Leads",
    icon: UserPlus,
    subtitle: "Prospective wholesale and B2B buyers",
    guide: "leads",
    searchKeys: ["name", "company", "email"],
    tabs: {
      field: "status",
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "converted", label: "Converted" },
        { value: "lost", label: "Lost" },
      ],
    },
    columns: [
      { key: "name", header: "Lead", type: "primary", sub: "company" },
      { key: "email", header: "Email", type: "text" },
      { key: "phone", header: "Phone", type: "text" },
      { key: "source", header: "Source", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "assignedTo", header: "Assigned To", type: "muted" },
      { key: "createdAt", header: "Date", type: "date" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, half: true },
      { key: "company", label: "Company", type: "text", half: true },
      { key: "email", label: "Email", type: "text", half: true },
      { key: "phone", label: "Phone", type: "text", half: true },
      {
        key: "source",
        label: "Source",
        type: "status",
        half: true,
        options: [
          { value: "website", label: "Website", variant: "info" },
          { value: "whatsapp", label: "WhatsApp", variant: "success" },
          { value: "referral", label: "Referral", variant: "primary" },
          { value: "social", label: "Social", variant: "secondary" },
          { value: "walk_in", label: "Walk-in", variant: "outline" },
          { value: "other", label: "Other", variant: "outline" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "new", label: "New", variant: "info" },
          { value: "contacted", label: "Contacted", variant: "warning" },
          { value: "qualified", label: "Qualified", variant: "primary" },
          { value: "converted", label: "Converted", variant: "success" },
          { value: "lost", label: "Lost", variant: "destructive" },
        ],
      },
      { key: "assignedTo", label: "Assigned to", type: "text", half: true },
      { key: "createdAt", label: "Date", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Leads", icon: UserPlus, tone: "primary", compute: (r) => int(r.length) },
      { label: "New", icon: AlertTriangle, tone: "info", compute: (r) => int(count(r, (x) => x.status === "new")) },
      { label: "Qualified", icon: BadgeCheck, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "qualified")) },
      { label: "Converted", icon: TrendingUp, tone: "success", compute: (r) => int(count(r, (x) => x.status === "converted")) },
    ],
  },

  // ==========================================================================
  transactions: {
    key: "transactions",
    singular: "Transaction",
    plural: "Transactions",
    icon: CreditCard,
    subtitle: "Payments and refunds",
    guide: "transactions",
    searchKeys: ["ref", "order", "gateway"],
    columns: [
      { key: "ref", header: "Reference", type: "primary", sub: "order" },
      { key: "amount", header: "Amount", type: "currency", align: "right" },
      { key: "kind", header: "Kind", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "gateway", header: "Gateway", type: "muted" },
      { key: "createdAt", header: "Date", type: "date" },
    ],
    fields: [
      { key: "ref", label: "Reference", type: "text", required: true, half: true },
      { key: "order", label: "Order", type: "text", half: true },
      { key: "amount", label: "Amount", type: "currency", half: true },
      {
        key: "kind",
        label: "Kind",
        type: "status",
        half: true,
        options: [
          { value: "sale", label: "Sale", variant: "success" },
          { value: "refund", label: "Refund", variant: "destructive" },
          { value: "authorization", label: "Authorization", variant: "info" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "success", label: "Success", variant: "success" },
          { value: "pending", label: "Pending", variant: "warning" },
          { value: "failed", label: "Failed", variant: "destructive" },
        ],
      },
      {
        key: "gateway",
        label: "Gateway",
        type: "select",
        half: true,
        options: [
          { value: "Shopify Payments", label: "Shopify Payments" },
          { value: "PayPal", label: "PayPal" },
          { value: "Cash", label: "Cash" },
        ],
      },
      { key: "createdAt", label: "Date", type: "date", half: true },
    ],
    stats: [
      { label: "Gross volume", icon: DollarSign, tone: "primary", compute: (r) => money(sum(r.filter((x) => x.kind === "sale"), "amount")) },
      { label: "Refunds", icon: RotateCcw, tone: "destructive", compute: (r) => money(sum(r.filter((x) => x.kind === "refund"), "amount")) },
      { label: "Net", icon: Wallet, tone: "success", compute: (r) => money(sum(r.filter((x) => x.kind === "sale"), "amount") - sum(r.filter((x) => x.kind === "refund"), "amount")) },
      { label: "Success rate", icon: BadgeCheck, tone: "info", compute: (r) => ({ value: `${r.length ? Math.round((count(r, (x) => x.status === "success") / r.length) * 100) : 0}%` }) },
    ],
  },

  // ==========================================================================
  abandoned: {
    key: "abandoned",
    singular: "Abandoned checkout",
    plural: "Abandoned Checkouts",
    icon: ShoppingBag,
    subtitle: "Carts that didn't convert",
    guide: "abandoned",
    searchKeys: ["email"],
    columns: [
      { key: "email", header: "Customer", type: "primary" },
      { key: "total", header: "Cart value", type: "currency", align: "right" },
      { key: "items", header: "Items", type: "number", align: "right" },
      { key: "stage", header: "Recovery", type: "status" },
      { key: "createdAt", header: "Abandoned", type: "date" },
    ],
    fields: [
      { key: "email", label: "Email", type: "email", required: true, half: true },
      { key: "total", label: "Cart value", type: "currency", half: true },
      { key: "items", label: "Items", type: "number", half: true },
      {
        key: "stage",
        label: "Recovery stage",
        type: "status",
        half: true,
        options: [
          { value: "none", label: "Not contacted", variant: "secondary" },
          { value: "email_sent", label: "Email sent", variant: "info" },
          { value: "recovered", label: "Recovered", variant: "success" },
        ],
      },
      { key: "createdAt", label: "Abandoned", type: "date", half: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Abandoned carts", icon: ShoppingBag, tone: "warning", compute: (r) => int(r.length) },
      { label: "Potential revenue", icon: DollarSign, tone: "info", compute: (r) => money(sum(r, "total")) },
      { label: "Recovered", icon: MailCheck, tone: "success", compute: (r) => int(count(r, (x) => x.stage === "recovered")) },
      { label: "Recovery rate", icon: TrendingUp, tone: "primary", compute: (r) => ({ value: `${r.length ? Math.round((count(r, (x) => x.stage === "recovered") / r.length) * 100) : 0}%` }) },
    ],
  },

  // ==========================================================================
  registers: {
    key: "registers",
    singular: "Register",
    plural: "Registers",
    icon: MonitorSmartphone,
    subtitle: "Tills and the store each one sells from",
    guide: "registers",
    searchKeys: ["name", "location", "notes"],
    columns: [
      { key: "name", header: "Register", type: "primary", sub: "location" },
      { key: "status", header: "Status", type: "status" },
      { key: "notes", header: "Notes", type: "muted" },
    ],
    fields: [
      { key: "name", label: "Register name", type: "text", required: true, half: true, placeholder: "e.g. Front counter" },
      {
        key: "locationId",
        label: "Sells from",
        type: "select",
        required: true,
        half: true,
        optionsFrom: { resource: "locations", valueKey: "id", labelKey: "name" },
        help: "The Shopify location whose stock this till sells — items come off its inventory.",
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "In use", variant: "success" },
          { value: "inactive", label: "Switched off", variant: "secondary" },
        ],
      },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    stats: [
      { label: "Registers", icon: MonitorSmartphone, tone: "primary", compute: (r) => int(r.length) },
      { label: "In use", icon: BadgeCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status !== "inactive")) },
      { label: "Stores covered", icon: Store, tone: "info", compute: (r) => int(new Set(r.map((x) => String(x.locationId ?? "")).filter(Boolean)).size) },
      { label: "Need a store", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => !x.locationId)) },
    ],
  },

  // ==========================================================================
  locations: {
    key: "locations",
    singular: "Location",
    plural: "Locations",
    icon: MapPin,
    subtitle: "Stores and warehouses",
    guide: "locations",
    searchKeys: ["name", "address", "city"],
    columns: [
      { key: "name", header: "Location", type: "primary", sub: "address" },
      { key: "type", header: "Type", type: "status" },
      { key: "status", header: "Status", type: "status" },
      { key: "inventoryValue", header: "Inventory value", type: "currency", align: "right" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "status",
        half: true,
        options: [
          { value: "retail", label: "Retail", variant: "primary" },
          { value: "warehouse", label: "Warehouse", variant: "info" },
          { value: "popup", label: "Popup", variant: "warning" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "Active", variant: "success" },
          { value: "inactive", label: "Inactive", variant: "secondary" },
        ],
      },
      { key: "address", label: "Address", type: "text" },
      { key: "city", label: "City", type: "text", half: true },
      { key: "country", label: "Country", type: "text", half: true },
      { key: "inventoryValue", label: "Inventory value", type: "currency", half: true },
    ],
    stats: [
      { label: "Locations", icon: MapPin, tone: "primary", compute: (r) => int(r.length) },
      { label: "Active", icon: BadgeCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "active")) },
      { label: "Retail", icon: Store, tone: "highlight", compute: (r) => int(count(r, (x) => x.type === "retail")) },
      { label: "Warehouses", icon: Warehouse, tone: "info", compute: (r) => int(count(r, (x) => x.type === "warehouse")) },
    ],
  },

  // ==========================================================================
  "pos-staff": {
    key: "pos-staff",
    singular: "POS staff",
    plural: "POS Staff",
    icon: IdCard,
    subtitle: "Who can sell in person",
    guide: "pos-staff",
    searchKeys: ["name", "email", "location"],
    columns: [
      { key: "name", header: "Staff", type: "primary", sub: "email" },
      { key: "role", header: "Role", type: "status" },
      { key: "location", header: "Location", type: "muted" },
      { key: "status", header: "Status", type: "status" },
    ],
    fields: [
      { key: "name", label: "Full name", type: "text", required: true, half: true },
      { key: "email", label: "Email", type: "email", half: true },
      {
        key: "role",
        label: "Role",
        type: "status",
        half: true,
        options: [
          { value: "manager", label: "Manager", variant: "primary" },
          { value: "associate", label: "Associate", variant: "info" },
          { value: "cashier", label: "Cashier", variant: "secondary" },
        ],
      },
      {
        key: "location",
        label: "Location",
        type: "select",
        half: true,
        options: [
          { value: "Flagship Store", label: "Flagship Store" },
          { value: "Airport Popup", label: "Airport Popup" },
          { value: "Downtown Kiosk", label: "Downtown Kiosk" },
        ],
      },
      {
        key: "pin",
        label: "PIN",
        type: "text",
        half: true,
        placeholder: "4–8 digits",
        help: "Signs this person in at the till. Must be unique among active staff.",
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "active", label: "Active", variant: "success" },
          { value: "suspended", label: "Suspended", variant: "destructive" },
        ],
      },
    ],
    stats: [
      { label: "Staff", icon: IdCard, tone: "primary", compute: (r) => int(r.length) },
      { label: "Active", icon: ShieldCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "active")) },
      { label: "Managers", icon: UserCheck, tone: "highlight", compute: (r) => int(count(r, (x) => x.role === "manager")) },
      { label: "Locations covered", icon: Building2, tone: "info", compute: (r) => int(new Set(r.map((x) => x.location)).size) },
    ],
  },
};

export const RESOURCE_KEYS = Object.keys(RESOURCES);

export function getResource(key: string): ResourceConfig | undefined {
  return RESOURCES[key];
}
