import {
  LayoutDashboard,
  BarChart3,
  Users,
  UsersRound,
  TicketPercent,
  Package,
  Layers,
  Boxes,
  FolderTree,
  ShoppingCart,
  FileText,
  CreditCard,
  ShoppingBag,
  Store,
  MonitorSmartphone,
  MapPin,
  IdCard,
  Settings,
  Plug,
  BookOpen,
  SlidersHorizontal,
  RotateCcw,
  Truck,
  PackageReturn,
  UserPlus,
  History,
  ClipboardList,
  ClipboardCheck,
  ArrowLeftRight,
  Building2,
  Navigation,
  Inbox,
  Banknote,
  Gauge,
  Till,
  type IconType,
} from "@/components/icons";

export interface NavItem {
  title: string;
  href: string;
  icon: IconType;
  /** page subheading shown in the topbar */
  subtitle: string;
  /** slug of the Guide section this page maps to (for "How to use this page") */
  guide: string;
}

export interface NavCategory {
  /** uppercase micro-label above the group */
  label: string;
  items: NavItem[];
}

export const NAV: NavCategory[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        subtitle: "Your store at a glance",
        guide: "overview",
      },
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        subtitle: "Traffic, revenue, and trends",
        guide: "analytics",
      },
    ],
  },
  {
    label: "Relations",
    items: [
      {
        title: "Customers",
        href: "/dashboard/customers",
        icon: Users,
        subtitle: "People who buy from you",
        guide: "customers",
      },
      {
        title: "Segments",
        href: "/dashboard/segments",
        icon: UsersRound,
        subtitle: "Grouped customer audiences",
        guide: "segments",
      },
      {
        title: "Discounts",
        href: "/dashboard/discounts",
        icon: TicketPercent,
        subtitle: "Codes and automatic offers",
        guide: "discounts",
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        title: "Products",
        href: "/dashboard/products",
        icon: Package,
        subtitle: "Everything you sell",
        guide: "products",
      },
      {
        title: "Collections",
        href: "/dashboard/collections",
        icon: Layers,
        subtitle: "Grouped product sets",
        guide: "collections",
      },
      {
        title: "Categories",
        href: "/dashboard/categories",
        icon: FolderTree,
        subtitle: "Catalog taxonomy",
        guide: "categories",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        title: "Inventory",
        href: "/dashboard/inventory",
        icon: Boxes,
        subtitle: "Stock levels per location",
        guide: "inventory",
      },
      {
        title: "Stock Movements",
        href: "/dashboard/stock-movements",
        icon: History,
        subtitle: "Every stock change, per item and location",
        guide: "stock-movements",
      },
      {
        title: "Stock Adjustments",
        href: "/dashboard/stock-adjustments",
        icon: SlidersHorizontal,
        subtitle: "Audited stock corrections",
        guide: "stock-adjustments",
      },
      {
        title: "Purchase Orders",
        href: "/dashboard/purchase-orders",
        icon: ClipboardList,
        subtitle: "Stock ordered from suppliers",
        guide: "purchase-orders",
      },
      {
        title: "Suppliers",
        href: "/dashboard/suppliers",
        icon: Building2,
        subtitle: "Who you buy stock from",
        guide: "suppliers",
      },
      {
        title: "Transfers",
        href: "/dashboard/transfers",
        icon: ArrowLeftRight,
        subtitle: "Stock moving between locations",
        guide: "transfers",
      },
      {
        title: "Stocktakes",
        href: "/dashboard/stocktakes",
        icon: ClipboardCheck,
        subtitle: "Count stock and post the differences",
        guide: "stocktakes",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        title: "Orders",
        href: "/dashboard/orders",
        icon: ShoppingCart,
        subtitle: "Incoming and fulfilled orders",
        guide: "orders",
      },
      {
        title: "Draft Orders",
        href: "/dashboard/draft-orders",
        icon: FileText,
        subtitle: "Manually created orders",
        guide: "draft-orders",
      },
      {
        title: "Returns",
        href: "/dashboard/returns",
        icon: RotateCcw,
        subtitle: "Return merchandise and refund handling",
        guide: "returns",
      },
      {
        title: "Leads",
        href: "/dashboard/leads",
        icon: UserPlus,
        subtitle: "Prospective wholesale and B2B buyers",
        guide: "leads",
      },
      {
        title: "Transactions",
        href: "/dashboard/transactions",
        icon: CreditCard,
        subtitle: "Payments and refunds",
        guide: "transactions",
      },
      {
        title: "Abandoned Checkouts",
        href: "/dashboard/abandoned",
        icon: ShoppingBag,
        subtitle: "Carts that didn't convert",
        guide: "abandoned",
      },
    ],
  },
  {
    label: "Logistics",
    items: [
      {
        title: "Shipments",
        href: "/dashboard/shipments",
        icon: Navigation,
        subtitle: "Every consignment, from pickup to delivery",
        guide: "shipments",
      },
      {
        title: "Dispatch",
        href: "/dashboard/dispatch",
        icon: Truck,
        subtitle: "Courier load sheets for outgoing shipments",
        guide: "dispatch",
      },
      {
        title: "Return Load Sheets",
        href: "/dashboard/return-load-sheets",
        icon: PackageReturn,
        subtitle: "Courier handover sheets for incoming returns",
        guide: "return-load-sheets",
      },
      {
        title: "Inbound",
        href: "/dashboard/inbound",
        icon: Inbox,
        subtitle: "Supplier orders and transfers on their way",
        guide: "inbound",
      },
      {
        title: "COD Reconciliation",
        href: "/dashboard/cod-remittances",
        icon: Banknote,
        subtitle: "Cash on delivery owed and paid by couriers",
        guide: "cod-remittances",
      },
      {
        title: "Courier Performance",
        href: "/dashboard/courier-performance",
        icon: Gauge,
        subtitle: "Delivery and return rates by courier and city",
        guide: "courier-performance",
      },
    ],
  },
  {
    label: "Point of Sale",
    items: [
      {
        title: "POS Overview",
        href: "/dashboard/pos",
        icon: Store,
        subtitle: "In-person selling",
        guide: "pos",
      },
      {
        title: "Till",
        href: "/dashboard/pos/till",
        icon: Till,
        subtitle: "Sell in person — scan, take payment, print the receipt",
        guide: "pos-till",
      },
      {
        title: "Registers",
        href: "/dashboard/registers",
        icon: MonitorSmartphone,
        subtitle: "Till sessions and drawers",
        guide: "registers",
      },
      {
        title: "Locations",
        href: "/dashboard/locations",
        icon: MapPin,
        subtitle: "Stores and warehouses",
        guide: "locations",
      },
      {
        title: "POS Staff",
        href: "/dashboard/pos-staff",
        icon: IdCard,
        subtitle: "Who can sell in person",
        guide: "pos-staff",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        subtitle: "Store configuration",
        guide: "settings",
      },
      {
        title: "Users",
        href: "/dashboard/users",
        icon: UsersRound,
        subtitle: "Who can sign in, and what each person can see and do",
        guide: "users",
      },
      {
        title: "Integrations",
        href: "/dashboard/integrations",
        icon: Plug,
        subtitle: "Connect external services",
        guide: "integrations",
      },
      {
        title: "Guide",
        href: "/dashboard/guide",
        icon: BookOpen,
        subtitle: "How everything works",
        guide: "overview",
      },
    ],
  },
];

/** Flat lookup of every nav item by href. */
export const NAV_BY_HREF: Record<string, NavItem & { category: string }> =
  Object.fromEntries(
    NAV.flatMap((cat) =>
      cat.items.map((item) => [item.href, { ...item, category: cat.label }]),
    ),
  );

/** Resolve the nav item for a given pathname (longest matching href). */
export function navItemForPath(
  pathname: string,
): (NavItem & { category: string }) | undefined {
  if (NAV_BY_HREF[pathname]) return NAV_BY_HREF[pathname];
  // Fall back to the closest ancestor (e.g. detail routes).
  const matches = Object.keys(NAV_BY_HREF)
    .filter((href) => href !== "/dashboard" && pathname.startsWith(href))
    .sort((a, b) => b.length - a.length);
  return matches[0] ? NAV_BY_HREF[matches[0]] : undefined;
}
