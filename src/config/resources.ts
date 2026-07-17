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
} from "@/components/icons";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { ResourceConfig, Row, StatResult } from "./resource-types";

// --- stat helpers -----------------------------------------------------------
const num = (r: Row, k: string) => Number(r[k] ?? 0);
const sum = (rows: Row[], k: string) => rows.reduce((a, r) => a + num(r, k), 0);
const count = (rows: Row[], pred: (r: Row) => boolean) => rows.filter(pred).length;
const money = (n: number): StatResult => ({ value: formatCurrency(n) });
const int = (n: number): StatResult => ({ value: formatNumber(n) });

// --- shared option sets -----------------------------------------------------
const ACTIVE_STATUS = [
  { value: "active", label: "Active", variant: "success" as const },
  { value: "draft", label: "Draft", variant: "outline" as const },
  { value: "archived", label: "Archived", variant: "secondary" as const },
];

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
      { label: "Total customers", icon: Users, tone: "primary", compute: (r) => ({ ...int(r.length), delta: 6.4 }) },
      { label: "Active", icon: UserCheck, tone: "success", compute: (r) => int(count(r, (x) => x.status === "active")) },
      { label: "New (30d)", icon: UserPlus, tone: "highlight", compute: (r) => ({ ...int(Math.round(r.length * 0.18)), delta: 12.1 }) },
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
      { key: "members", label: "Members", type: "number", half: true },
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
      { label: "Total redemptions", icon: Repeat, tone: "primary", compute: (r) => ({ ...int(sum(r, "used")), delta: 9.2 }) },
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
      { label: "Total products", icon: Package, tone: "primary", compute: (r) => ({ ...int(r.length), delta: 3.1 }) },
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
    subtitle: "Stock levels across locations",
    guide: "inventory",
    searchKeys: ["name", "sku", "location"],
    columns: [
      { key: "name", header: "Item", type: "primary", sub: "sku" },
      { key: "location", header: "Location", type: "muted" },
      { key: "onHand", header: "On hand", type: "number", align: "right" },
      { key: "available", header: "Available", type: "number", align: "right" },
      { key: "status", header: "Status", type: "status" },
    ],
    fields: [
      { key: "name", label: "Item", type: "text", required: true },
      { key: "sku", label: "SKU", type: "text", half: true },
      {
        key: "location",
        label: "Location",
        type: "select",
        half: true,
        options: [
          { value: "Main Warehouse", label: "Main Warehouse" },
          { value: "Flagship Store", label: "Flagship Store" },
          { value: "Airport Popup", label: "Airport Popup" },
        ],
      },
      { key: "onHand", label: "On hand", type: "number", half: true },
      { key: "committed", label: "Committed", type: "number", half: true },
      { key: "available", label: "Available", type: "number", half: true },
      { key: "reorderPoint", label: "Reorder point", type: "number", half: true },
      {
        key: "status",
        label: "Status",
        type: "status",
        options: [
          { value: "in_stock", label: "In stock", variant: "success" },
          { value: "low", label: "Low stock", variant: "warning" },
          { value: "out", label: "Out of stock", variant: "destructive" },
        ],
      },
    ],
    stats: [
      { label: "SKUs tracked", icon: Boxes, tone: "primary", compute: (r) => int(r.length) },
      { label: "Units on hand", icon: Package, tone: "info", compute: (r) => int(sum(r, "onHand")) },
      { label: "Low stock", icon: AlertTriangle, tone: "warning", compute: (r) => int(count(r, (x) => x.status === "low")) },
      { label: "Out of stock", icon: PackageX, tone: "destructive", compute: (r) => int(count(r, (x) => x.status === "out")) },
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
    searchKeys: ["number", "customer"],
    columns: [
      { key: "number", header: "Order", type: "primary", sub: "customer" },
      { key: "total", header: "Total", type: "currency", align: "right" },
      { key: "payment", header: "Payment", type: "status" },
      { key: "fulfillment", header: "Fulfillment", type: "status" },
      { key: "channel", header: "Channel", type: "status" },
      { key: "createdAt", header: "Date", type: "date" },
    ],
    fields: [
      { key: "number", label: "Order #", type: "text", required: true, half: true },
      { key: "customer", label: "Customer", type: "text", required: true, half: true },
      { key: "total", label: "Total", type: "currency", half: true },
      { key: "items", label: "Items", type: "number", half: true },
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
      { label: "Orders", icon: ShoppingCart, tone: "primary", compute: (r) => ({ ...int(r.length), delta: 8.7 }) },
      { label: "Revenue", icon: DollarSign, tone: "success", compute: (r) => ({ ...money(sum(r, "total")), delta: 5.4 }) },
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
    subtitle: "Till sessions and drawers",
    guide: "registers",
    searchKeys: ["name", "location", "openedBy"],
    columns: [
      { key: "name", header: "Register", type: "primary", sub: "location" },
      { key: "status", header: "Status", type: "status" },
      { key: "cashFloat", header: "Cash float", type: "currency", align: "right" },
      { key: "sales", header: "Sales today", type: "currency", align: "right" },
      { key: "openedBy", header: "Opened by", type: "muted" },
    ],
    fields: [
      { key: "name", label: "Register name", type: "text", required: true, half: true },
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
        key: "status",
        label: "Status",
        type: "status",
        half: true,
        options: [
          { value: "open", label: "Open", variant: "success" },
          { value: "closed", label: "Closed", variant: "secondary" },
        ],
      },
      { key: "openedBy", label: "Opened by", type: "text", half: true },
      { key: "cashFloat", label: "Cash float", type: "currency", half: true },
      { key: "sales", label: "Sales today", type: "currency", half: true },
    ],
    stats: [
      { label: "Open registers", icon: MonitorSmartphone, tone: "success", compute: (r) => int(count(r, (x) => x.status === "open")) },
      { label: "Cash in drawers", icon: Wallet, tone: "info", compute: (r) => money(sum(r.filter((x) => x.status === "open"), "cashFloat")) },
      { label: "POS sales today", icon: DollarSign, tone: "primary", compute: (r) => ({ ...money(sum(r, "sales")), delta: 4.9 }) },
      { label: "Registers", icon: Store, tone: "highlight", compute: (r) => int(r.length) },
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
      { key: "pin", label: "PIN", type: "text", half: true, placeholder: "4-digit" },
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
