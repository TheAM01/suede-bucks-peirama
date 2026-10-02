import type { GuideSection } from "./guide-types";

/**
 * In-app knowledge base. SuedeBucks is the store-management system; Peirama is
 * the store this installation is white-labelled for.
 * Every topic is authored twice — an "everyday" (shop-operator) altitude and a
 * "technical" (implementation) altitude — plus optional deep dives. Pure data:
 * inline strings support only **bold** and `code` markdown.
 */
export const GUIDE_SECTIONS: GuideSection[] = [
  // ==========================================================================
  {
    id: "overview",
    title: "Platform overview",
    category: "Getting started",
    everyday: [
      { t: "p", text: "**SuedeBucks** is a store-management system for running a shop online and in person. This installation is **white-labelled** for **Peirama**, a perfume house — so throughout the app, SuedeBucks is the software and Peirama is the store you are managing. It is where you handle the people who buy from you, the things you sell, the orders that come in and go out with couriers, and your physical stores." },
      { t: "p", text: "The left sidebar groups everything into eight areas:" },
      {
        t: "dl",
        items: [
          { term: "Overview", def: "The **Dashboard** (your store at a glance) and **Analytics** (revenue trend, channels, top customers)." },
          { term: "Relations", def: "The people side: **Customers**, **Segments** (groups of customers), and **Discounts**." },
          { term: "Catalog", def: "What you sell: **Products**, **Collections**, and **Categories**." },
          { term: "Inventory", def: "Your stock: **Inventory** (levels per location), **Stock Movements** (the history of every change), **Stock Adjustments**, **Purchase Orders**, **Suppliers**, **Transfers**, and **Stocktakes**." },
          { term: "Sales", def: "Orders and everything after the sale: **Orders**, **Draft Orders**, **Returns**, **Leads**, **Transactions**, and **Abandoned Checkouts**." },
          { term: "Logistics", def: "Getting parcels out and stock in: **Shipments** (tracking), **Dispatch** (courier load sheets), **Return Load Sheets**, **Inbound** (deliveries on their way), **COD Reconciliation**, and **Courier Performance**." },
          { term: "Point of Sale", def: "Selling in person: **POS Overview**, **Registers**, **Locations**, and **POS Staff**." },
          { term: "System", def: "**Settings**, **Integrations** (the Shopify connection), and this **Guide**." },
        ],
      },
      { t: "h", text: "Where the data comes from" },
      { t: "p", text: "Most pages show your **Shopify** store live — products, customers, orders, discounts, collections, inventory, transactions, abandoned checkouts, and locations are read straight from Shopify every time you open them, and many of them can be edited here too. A few things Shopify has no place for are kept in this app's own database instead: order workflow stages, load sheets, stock adjustments, purchase orders, suppliers, transfers, stocktakes, the stock movement history, reorder points, COD remittances, returns, leads, segments, registers, and POS staff." },
      { t: "callout", tone: "info", title: "Nothing is made up", text: "If Shopify isn't connected, or the database isn't reachable, the affected pages are simply **empty** with a message explaining why — the app never fills in sample or placeholder data." },
      { t: "h", text: "How every page works" },
      { t: "p", text: "Almost every page is built the same way, so once you know one you know them all:" },
      {
        t: "ol",
        items: [
          "Four **stat cards** at the top show the headline numbers. A small percentage badge, where shown, compares the last 30 days with the 30 days before.",
          "Some pages have **tabs** above the table (All, plus one per stage) to show one stage at a time.",
          "Use the **search box** in the top bar to find rows, and click a column heading to sort. Long tables scroll inside their own box, with the column headings staying in view.",
          "Changes show **instantly** — a saved edit, a deleted row, an order moving to its next tab — and are confirmed with the server in the background. If the server refuses, the change is undone and you're told why (an edit form reopens with what you typed).",
          "Results appear as **notifications** in the top-right corner. Each has a close button and a thin bar along the bottom that empties until it disappears; hover over it to keep it open. Errors stay longer than confirmations.",
          "Click **New** to add a record, or click a row to edit it in the drawer that slides in from the right. Pages that are view-only say so under their title.",
          "Tick the boxes on the left of rows to act on several at once — a bar appears pinned to the bottom of the screen. Its **⋯** button holds **Open in new tab**, **Edit** (one record at a time), **Advanced › Move to** (put them straight into another stage), and **Delete**, always last.",
          "Long lists are split into pages; flip through them, and pick how many rows to show, in the bottom bar.",
        ],
      },
      { t: "callout", tone: "info", title: "Lost on any page? Look at the bottom bar", text: "Every page has a **How to use this page** link in the bottom bar that jumps straight to its section of this guide. The same link is in the top bar's page menu as **How this page works**." },
      { t: "p", text: "The top bar shows the page name and description, the search box, a **page menu** (Refresh data, and the link to this guide), and your account menu (Store settings, Log out). The bottom bar shows three **connection dots** (App, Database, Shopify), the help link, the page-flip controls, and the SuedeBucks / Peirama wordmark." },
      { t: "callout", tone: "info", title: "On a phone or tablet", text: "The sidebar tucks away — tap the **menu button** at the top left to open it. Tap the **magnifying glass** to search the page. Stage tabs and wide tables scroll sideways, and when you tick orders the action buttons sit in one row you can swipe. In this guide, the **section picker** at the top replaces the side table of contents." },
      { t: "callout", tone: "warning", title: "Two page-menu items aren't working yet", text: "**Export CSV** and **Column settings** in the page menu are placeholders — they don't do anything yet." },
    ],
    technical: [
      { t: "p", text: "SuedeBucks is a **Next.js 16** App Router application — a reusable store-management console **white-labelled** per client; this deployment is branded for **Peirama**. It runs against a live Shopify store through the **Admin GraphQL API** plus an optional **MongoDB** for app-owned data." },
      { t: "h", text: "Authentication and session" },
      { t: "p", text: "There is a single admin account. The login form's server action (`src/lib/auth-actions.ts`) compares the username and password against the `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars and, on success, sets a signed **HMAC** cookie `sb_session` (7-day expiry, `SESSION_SECRET` key, `src/lib/session.ts` — Web Crypto only so it runs in the proxy). `src/proxy.ts` gates `/dashboard/*`, `/print/*`, and `/scan/*`, redirecting to `/login?next=<path>`; after signing in the user is sent back to `next` (same-site paths only)." },
      { t: "h", text: "Data layer — three sources, one client seam" },
      { t: "p", text: "Components only talk to `src/lib/store.tsx` (`StoreProvider` / `useResource`), which fetches `/api/resources/[resource]`, caches per resource, and exposes `create` / `update` / `remove`. The API route dispatches each resource to one of:" },
      {
        t: "ul",
        items: [
          "**Shopify-backed** (products, customers, orders, collections, inventory, categories, draft orders, discounts, abandoned, transactions, locations) — live reads via `SHOPIFY_READERS` in `src/lib/shopify-reads.ts`, each fetching the newest **100** records (categories scan 250 products). Writes, where they exist, go through `SHOPIFY_WRITERS` in `src/lib/shopify-writes.ts`; a resource with no writer is read-only (`readOnly: true`, no New button, no checkboxes).",
          "**App-owned generic** (segments, registers, pos-staff, returns, leads) — MongoDB, one collection per resource, via `src/lib/app-data.ts` (`APP_OWNED_COLLECTIONS`). Full CRUD.",
          "**App-owned specialised** — `stock-adjustments` (`src/lib/stock-adjustments.ts`), the load-sheet pair `dispatch` / `return-load-sheets` (`src/lib/dispatch.ts`), and the orders workflow overlay (`src/lib/order-ops.ts`, merged onto the Shopify order rows).",
        ],
      },
      { t: "p", text: "Every Shopify call goes through `shopifyQuery()` in `src/lib/shopify-client.ts`, which resolves or refreshes the OAuth token (`src/lib/integrations.ts`) and normalises 401/402/403/429 errors. There is no seed or mock data: no Shopify connection means Shopify pages return `source: \"empty\"`, and no `MONGODB_URI` means app-owned pages read empty with an explanatory error." },
      { t: "p", text: "**Optimistic writes**: `StoreProvider` (`src/lib/store.tsx`) applies `create` (a `_pending` placeholder row, faded and not clickable until the server row replaces it), `update`, and `remove` to the cached rows first and rolls each back on a failed response. `patchRows(resource, ids, patch)` does the same for custom writes and returns a rollback (optionally for some ids): the Orders control panel moves rows to `predictedStatus(action, from)` (`src/config/order-workflow.ts`) and restores only the refused or confirmation-needing ones; Shipments predicts `delivered` / `returned`. Detail pages keep a local overlay (inventory documents for `place` / `ship` / `close` / `cancel`; load sheets for post / reconcile / archive and parcels taken off), discarded when the server render arrives. `ResourceView` closes the drawer on save and reopens it with the typed values if the save fails." },
      { t: "p", text: "**Toasts**: `ToastProvider` / `useToast()` (`src/components/ui/toast.tsx`), mounted in `DashboardShell`, offers `success` / `error` / `info`. Each toast's countdown bar is a CSS animation (`animate-toast-progress` with an inline `animation-duration`) whose `animationend` dismisses it, so hovering pauses bar and timer together; defaults are 4s / 5s / 8s for success / info / error, with at most five on screen. Outside the provider (the standalone `/scan` page) `useToast()` is a no-op." },
      { t: "h", text: "The resource engine" },
      { t: "p", text: "Almost every page is `src/app/dashboard/[resource]/page.tsx` + `src/components/dashboard/resource-view.tsx`, rendered purely from its entry in `RESOURCES` (`src/config/resources.ts`): columns, drawer fields, KPI `stats`, `searchKeys`, optional `tabs`, `rowLocked`, `rowHref`, and a `guide` slug. `ResourceView` also takes two optional props — `toolbar` (extra buttons by the tabs) and `selectionBar` (replaces the generic bulk bar) — used by Orders and Dispatch. Both the generic bulk bar and the orders control panel put their bulk actions in `BulkActionsMenu` (`src/components/dashboard/bulk-actions-menu.tsx`): Open in new tab (rows with `rowHref`), Edit (single selection), Advanced › Move to (an in-menu drill-down, using `MenuItem keepOpen`), then Delete after a divider. Each item only appears when the config's `capabilities` allow it. Both bars render inside `SelectionDock` (`src/components/dashboard/selection-dock.tsx`): `fixed` at `bottom-10`, offset past the sidebar via the shell's `--content-left` CSS variable, with an in-flow spacer so it never covers the last rows. Literal routes override the dynamic one where a page needs more: `/dashboard/orders`, `/dashboard/dispatch`, `/dashboard/returns`." },
      { t: "p", text: "Responsive behaviour: below `lg` the sidebar is an off-canvas drawer (hamburger in the top bar); below `sm` the top-bar search becomes a toggle that opens a search row under the header. `ResourceView` renders `tabs` on their own `overflow-x-auto` row (the `Segmented` buttons are `shrink-0 whitespace-nowrap`), tables scroll inside their card (`Table` wraps in an `overflow-auto` box capped at `100dvh − 7rem`, which is also what lets `TableHeader` be `sticky top-0` — a header can't stick to the page from inside an overflow container), the orders control panel puts its actions in one scrolling row below `sm`, the bottom bar drops the wordmark below `sm`, and the guide swaps its side TOC for a `<select>` below `lg`." },
      { t: "p", text: "KPI deltas come from `src/lib/insights.ts` (`periodDelta()` — trailing 30 days vs the 30 before, by `createdAt`) and are omitted when there is no baseline; resources without dated rows show no delta at all." },
      { t: "p", text: "The Guide is data-driven from `src/content/guide.ts` (`GuideSection`): two audience tabs, a scroll-spy table of contents, `#slug` deep links, and `?tab=technical`. Each resource's `guide` key must be a section `id` here — the bottom bar's help link deep-links to it." },
    ],
    deep: [
      {
        title: "How the bottom bar connection dots work",
        everyday: [
          { t: "p", text: "The three dots in the bottom bar tell you at a glance whether the app is healthy. Green means good; red means that piece is having trouble. Click them to see a one-line explanation of each." },
          { t: "ul", items: ["**Application** — the dashboard itself.", "**Database** — where this app keeps its own records (order stages, load sheets, returns, and so on). Red means those pages will be empty and changes won't save.", "**Shopify** — the result of the most recent connection test on the Integrations page."] },
        ],
        technical: [
          { t: "p", text: "`BottomBar` polls the auth-gated `GET /api/status` every 60 seconds. `db` is a real `ping` against MongoDB when `MONGODB_URI` is set (and reports OK-but-unconfigured otherwise); `shopify` reflects the stored `lastCheck` from the most recent Test connection — it is not a live probe on every poll. A failed poll marks `app` degraded." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "analytics",
    title: "Dashboard & Analytics",
    category: "Overview",
    everyday: [
      { t: "p", text: "Two pages sum up the business: the **Dashboard** (first page after login) and **Analytics**. Both are built from your live Shopify orders, customers, and products — nothing is typed in by hand." },
      {
        t: "dl",
        items: [
          { term: "Dashboard", def: "Total revenue, orders, customers, and average order value; a 14-day revenue chart and this month's revenue against last month; sales split between online and point of sale; your products with the most stock value; and the most recent orders." },
          { term: "Analytics", def: "Revenue, orders, refunds, and fulfilment rate; an 18-day revenue trend; sales by channel; catalog value by category; and your top customers by spend." },
          { term: "The % badges", def: "Compare the last 30 days with the 30 days before. If there's nothing to compare against yet, the badge simply isn't shown." },
        ],
      },
      { t: "ol", items: ["Open the Dashboard first thing to see how the shop is doing.", "Note any badge pointing down — that's where to look.", "Open Analytics for the longer trend and the channel and customer breakdowns.", "Jump to the page behind a number (Orders, Products, Customers) to act on it."] },
      { t: "callout", tone: "warning", title: "Based on your most recent records", text: "Shopify is read 100 records at a time, so these pages summarise your **latest 100 orders, customers, and products**. For a busy store, all-time totals will be higher than what's shown here." },
    ],
    technical: [
      { t: "p", text: "`DashboardOverview` (`src/components/dashboard/overview.tsx`) and `AnalyticsView` (`src/components/dashboard/analytics-view.tsx`) are pure selectors over `useResource(\"orders\" | \"customers\" | \"products\")` — they own no data. Aggregation helpers live in `src/lib/insights.ts`." },
      { t: "ul", items: [
        "Revenue = `sum(total)` over order rows; average order value = revenue / count.",
        "`revenueTrend(orders, days)` buckets order `total` by `createdAt` day; `monthOverMonth()` compares calendar months.",
        "`periodDelta(rows, 30, key?)` — trailing 30 days vs the 30 before; returns `undefined` (badge hidden) when the earlier window is empty.",
        "Channel split uses `channel` (`online` / `pos`, from Shopify `sourceName`). Refunds = orders with `payment === \"refunded\"`; fulfilment rate = share with `fulfillment === \"fulfilled\"`.",
        "\"Top products by stock value\" and \"Catalog value by category\" use `price × stock` — a retail valuation of what's on hand, not sales.",
      ] },
      { t: "callout", tone: "warning", title: "Window is the first page of each Shopify read", text: "The readers fetch `first: 100` (newest first). Totals and trends are computed over that window only; a store with more history needs pagination in `src/lib/shopify-reads.ts` before these become all-time figures." },
    ],
  },

  // ==========================================================================
  {
    id: "customers",
    title: "Customers",
    category: "Relations",
    everyday: [
      { t: "p", text: "The **Customers** page is everyone who has an account or has ordered from your Shopify store: their name and email, status, how many orders they've placed, how much they've spent, where they are, and when they joined." },
      {
        t: "dl",
        items: [
          { term: "Customer", def: "Their name, with their email underneath." },
          { term: "Status", def: "**Active** (a working account), **Invited** (asked to create an account, not accepted yet), or **Disabled** (switched off or declined)." },
          { term: "Orders / Spent", def: "Their lifetime order count and total spend, straight from Shopify." },
          { term: "Location", def: "The city and country of their default address." },
          { term: "Joined", def: "When the customer was created in Shopify." },
          { term: "Notes", def: "The customer note in Shopify." },
        ],
      },
      { t: "ol", items: ["Open Relations then Customers.", "Search by name, email, or location.", "Click a customer to edit their name, email, or note, then Save — the change is written to Shopify.", "Use New to add a customer (name, email, and note are saved to Shopify)."] },
      { t: "callout", tone: "warning", title: "Only name, email, and note are saved", text: "The form also shows Status, Location, Orders, Total spent, and Joined, but those come from Shopify and **changes to them are not saved** — Shopify works them out itself. Deleting a customer deletes them in Shopify, which it refuses if they have orders." },
      { t: "callout", tone: "info", title: "Stat cards", text: "**Total customers** and **New (30d)** count by join date (the badge compares with the 30 days before); **Active** counts active accounts; **Avg. lifetime value** is total spend divided by customers." },
    ],
    technical: [
      { t: "p", text: "Keyed `customers`; Shopify-backed. `readCustomers()` maps `displayName`, `email`, `state` (`enabled`→`active`, `invited`, `disabled`/`declined`→`disabled`), `numberOfOrders`, `amountSpent`, `defaultAddress.city/country` → `location`, `createdAt`, and `note`. Search covers `name`, `email`, `location`." },
      { t: "ul", items: [
        "Writes (`SHOPIFY_WRITERS.customers`): `customerCreate` / `customerUpdate` send only `firstName`/`lastName` (the name split at its last space), `email`, and `note`. `status`, `location`, `orders`, `spent`, `createdAt` are in the form for display but ignored on save.",
        "Delete is `customerDelete`; Shopify rejects it for customers with orders and the error is shown verbatim.",
        "KPIs: Total customers (count, `periodDelta` on `createdAt`), Active, New (30d) (`windowTotals(rows, 30).cur`), Avg. lifetime value (`sum(spent) / count`).",
        "Needs `read_customers` / `write_customers` and Shopify's **Protected Customer Data** approval for names and emails.",
      ] },
      { t: "callout", tone: "info", title: "Customer ids are the only customer data stored app-side", text: "Segments store customer ids in `customerIds`; the `customers/redact` compliance webhook removes an id from every segment. No names, emails, or addresses are persisted by this app." },
    ],
  },

  // ==========================================================================
  {
    id: "segments",
    title: "Segments",
    category: "Relations",
    everyday: [
      { t: "p", text: "A **Segment** is a named group of customers who share something — people who bought a particular scent, big spenders, or shoppers in one city. You pick the members yourself." },
      {
        t: "dl",
        items: [
          { term: "Segment name / Description", def: "A clear label and a note on who belongs in it." },
          { term: "Members", def: "The customers in the group, picked from a searchable list of your Shopify customers. The count on the row is simply how many you picked." },
          { term: "Growth %", def: "A figure you enter yourself to note whether the group is growing." },
          { term: "Status", def: "**Active** (in use) or **Draft** (still being set up)." },
        ],
      },
      { t: "ol", items: ["Open Relations then Segments.", "Click New, or click a segment to edit it.", "Give it a name and description.", "Under Members, search your customers and tick everyone who belongs.", "Save as Draft while you refine it, then set it Active."] },
      { t: "callout", tone: "info", title: "Membership is manual", text: "A segment doesn't follow a rule — new customers who fit it later have to be added by hand. Segments are kept in this app's database and aren't sent to Shopify." },
      { t: "callout", tone: "info", title: "Segments group people, collections group products", text: "A **segment** is a set of customers. A **collection** is a set of products." },
    ],
    technical: [
      { t: "p", text: "Keyed `segments`; app-owned in MongoDB (`app_segments`) via `src/lib/app-data.ts`. Search covers `name`, `description`. Fields: `name`, `description`, `customerIds` (a `multiselect` with `optionsFrom: customers`), `growth`, `status` (`active` / `draft`), `updatedAt`." },
      { t: "ul", items: [
        "`members` is derived, never stored — `app-data.ts` sets it to `customerIds.length` on every read and strips any client-sent value on write.",
        "`growth` is hand-entered. There is no targeting integration: segments aren't pushed to Shopify or used by discounts yet.",
        "KPIs: Segments, Total reach (`sum(members)`), Largest segment, Avg. size — all over every row regardless of status.",
        "Deleted Shopify customers linger as ids; the picker reports them as no longer listed, and the `customers/redact` webhook removes them.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "discounts",
    title: "Discounts",
    category: "Relations",
    everyday: [
      { t: "p", text: "The **Discounts** page lists your Shopify discount codes — what shoppers type at checkout to save money: the code, what kind of deal it is, its value, whether it's running, how many times it's been used, and when it ends." },
      {
        t: "dl",
        items: [
          { term: "Code", def: "What the shopper types, like SUEDE20." },
          { term: "Type", def: "**Percentage**, **Fixed amount**, **Buy X get Y**, or **Free shipping**." },
          { term: "Value", def: "Shopify's own summary of the deal, e.g. 20% off entire order." },
          { term: "Status", def: "**Active**, **Scheduled** (starts later), or **Expired** — worked out by Shopify from the dates." },
          { term: "Redemptions", def: "How many times the code has been used." },
          { term: "Ends", def: "When the offer stops, if it has an end date." },
        ],
      },
      { t: "ol", items: ["Open Relations then Discounts.", "Click New, enter the code, pick Percentage or Fixed amount, and type the value (like 20% or 10).", "Set a start date (today if left blank) and optionally an end date, then Save — the code is created in Shopify for all customers and all products.", "Click a code to change its code, value, or dates."] },
      { t: "callout", tone: "warning", title: "What can and can't be done here", text: "Only **percentage** and **fixed-amount** codes can be created or edited here. **Buy X get Y** and **Free shipping** codes show in the list but must be set up in Shopify admin. **Status** and **Redemptions** can't be changed — Shopify controls them." },
    ],
    technical: [
      { t: "p", text: "Keyed `discounts`; Shopify-backed. `readDiscounts()` reads `codeDiscountNodes` (basic, free-shipping, BXGY). `type` comes from `__typename` (`DiscountCodeFreeShipping`→`shipping`, `DiscountCodeBxgy`→`bogo`, basic → `percentage` if the `summary` contains `%`, else `fixed`); `value` is Shopify's `summary`; `status` is Shopify's own; `used` is `asyncUsageCount`." },
      { t: "ul", items: [
        "Create: `discountCodeBasicCreate` with `customerSelection: { all: true }` and `customerGets.items: { all: true }`; `value` is parsed to a number — percentage → `percentage: n/100`, fixed → `discountAmount`. `bogo` / `shipping` are rejected with an explanation.",
        "Update: `discountCodeBasicUpdate` for `code`, `startsAt`, `endsAt`, and `value`/`type`. `status` and `used` are display-only.",
        "Delete: `discountCodeDelete`.",
        "KPIs: Active, Total redemptions (`sum(used)`), Scheduled, Expired.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "products",
    title: "Products",
    category: "Catalog",
    everyday: [
      { t: "p", text: "The **Products** page is your Shopify catalog — every item you sell. Each row shows the product, its SKU, category, price, stock, and status." },
      {
        t: "dl",
        items: [
          { term: "Title", def: "The product name shoppers see." },
          { term: "SKU", def: "Your code for the product (from its first variant)." },
          { term: "Category", def: "The product's type in Shopify, e.g. Eau de Parfum." },
          { term: "Vendor", def: "Who makes or supplies it." },
          { term: "Price / Cost per item", def: "What you sell it for and what it costs you — the gap is your margin." },
          { term: "Stock", def: "Total units across all locations." },
          { term: "Status", def: "**Active** (on sale), **Draft** (hidden), or **Archived** (retired)." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Products.", "Click New to create a product in Shopify, or click one to edit it.", "Fill in the title, category, vendor, price, cost, SKU, status, and description, then Save.", "Search by name, SKU, category, or vendor."] },
      { t: "callout", tone: "warning", title: "Stock can't be changed from this form", text: "The **Stock** field is shown but not saved. To change stock, raise a **Stock Adjustment** — that updates Shopify and keeps a record of why." },
      { t: "callout", tone: "info", title: "One variant per row", text: "Price, SKU, and cost are read from and written to the product's **first variant**. Products with several sizes need their other variants edited in Shopify admin." },
    ],
    technical: [
      { t: "p", text: "Keyed `products`; Shopify-backed. `readProducts()` maps `title`, `vendor`, `productType` → `category` (`Uncategorized` if blank), `status`, `totalInventory` → `stock`, `description`, and the first variant's `sku`, `price`, and `inventoryItem.unitCost` → `cost`. Search covers `name`, `sku`, `category`, `vendor`." },
      { t: "ul", items: [
        "Create/update: `productCreate` / `productUpdate` (`title`, `vendor`, `productType`, `status`, `descriptionHtml`), then `productVariantsBulkUpdate` on the first variant for `price`, `inventoryItem.sku`, `inventoryItem.cost`.",
        "`stock` is display-only; quantities move through `stock-adjustments` (`inventoryAdjustQuantities`).",
        "The Category select offers a fixed list of perfume types; any product type already in Shopify still displays.",
        "Delete: `productDelete`.",
        "KPIs: Total products, Active, Out of stock (`stock <= 0`), Inventory value (`sum(price × stock)`, a retail valuation).",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "collections",
    title: "Collections",
    category: "Catalog",
    everyday: [
      { t: "p", text: "A **Collection** is a themed set of products — a Summer edit, Best sellers, Gift sets. This page lists your Shopify collections, what type each is, and how many products it holds." },
      {
        t: "dl",
        items: [
          { term: "Collection", def: "Its title, with the description underneath." },
          { term: "Type", def: "**Manual** (products hand-picked) or **Automated** (products join by matching rules)." },
          { term: "Products", def: "How many products are in it, from Shopify." },
          { term: "Updated", def: "When it last changed." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Collections.", "Click New to create a **manual** collection with a title and description.", "Click a collection to rename it or change its description.", "Add or remove products, and build automated collections, in Shopify admin."] },
      { t: "callout", tone: "warning", title: "Only title and description are saved", text: "Type, product count, and status are shown for reference. **Automated** collections need rules, so they can only be created in Shopify admin." },
      { t: "callout", tone: "info", title: "Collection is not the same as Category", text: "A **collection** is a marketing group you curate. A **category** is the product's type. One product has one category but can be in many collections." },
    ],
    technical: [
      { t: "p", text: "Keyed `collections`; Shopify-backed. `readCollections()` maps `title`, `description`, `updatedAt`, `productsCount.count` → `products`, and `type` = `automated` when the collection has a `ruleSet`, else `manual`. `status` is always `active` (Shopify publication state isn't read)." },
      { t: "ul", items: [
        "Create: `collectionCreate` (title + `descriptionHtml`) for manual only; `type: automated` is rejected with an explanation.",
        "Update: `collectionUpdate` for `title` / `descriptionHtml`. Membership isn't editable here.",
        "Delete: `collectionDelete`.",
        "KPIs: Collections, Products grouped (`sum(products)`), Automated, Active.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "inventory",
    title: "Inventory",
    category: "Inventory",
    everyday: [
      { t: "p", text: "The **Inventory** page shows your stock **per location**: one row for every product variant (every size or version) at every location that stocks it, read live from Shopify. It tells you what's on the shelf, what's already promised to orders, what's on its way, and what needs reordering." },
      {
        t: "dl",
        items: [
          { term: "Item / SKU", def: "The product, plus the variant name if it has one, and its SKU." },
          { term: "Location", def: "The store or warehouse these figures are for. An item stocked in two places has two rows." },
          { term: "On hand", def: "Units physically there." },
          { term: "Committed", def: "Units already reserved for orders that haven't shipped." },
          { term: "Available", def: "What's free to sell: on hand minus committed (Shopify's own figure)." },
          { term: "On order", def: "Units still to arrive on open **purchase orders** delivering here." },
          { term: "In transit", def: "Units on **transfers** sent to this location but not received yet." },
          { term: "Reorder at", def: "Your reorder point: when Available falls to this, the row turns **Low stock**." },
          { term: "Suggested order", def: "For low and out-of-stock rows: how many to order to get back to your reorder quantity, minus what's already on order or in transit." },
          { term: "Stock value", def: "On hand × the item's cost in Shopify." },
          { term: "Status", def: "**Out of stock** at 0 or below, **Low stock** at the reorder point (5 if you haven't set one), otherwise **In stock** — also the tabs." },
        ],
      },
      { t: "ol", items: ["Open Inventory then Inventory.", "Use the **Low stock** and **Out of stock** tabs to see what needs attention; search by item, SKU, or location.", "Click a row to set its **Reorder point** and **Reorder quantity** for that location.", "Raise a **purchase order** for the suggested amounts, or a **transfer** if another location has spare stock."] },
      { t: "callout", tone: "info", title: "Quantities only move through documents", text: "You can't type a new stock figure here. Stock changes through **Purchase Orders** (receiving), **Transfers**, **Stocktakes**, and **Stock Adjustments**, so every change has a reason and shows up in **Stock Movements**. Sales are taken off by Shopify automatically." },
    ],
    technical: [
      { t: "p", text: "Keyed `inventory`; Shopify-backed. `readInventoryLevels()` (`src/lib/inventory-levels.ts`) pages `productVariants` 100 at a time (up to 30 pages — 3,000 variants — retrying `Throttled` replies with backoff), skipping untracked items, and emits one row per `inventoryItem.inventoryLevels` node. Each row has `quantities(names: [available, on_hand, committed, incoming])` and `unitCost`. The row id is `inventoryItemId:locationId`." },
      { t: "ul", items: [
        "Merged on read: `reorderPoint` / `reorderQty` from MongoDB `app_reorder_points` (`_id` = the row id), and `onOrder` / `inTransit` from `openInboundByItem()` in `src/lib/inventory-docs.ts` (remaining units on POs and transfers in `ordered` / `in_transit` / `partial`, keyed by destination).",
        "`status`: `out` if `available <= 0`, `low` if `available <= reorderPoint` (or `DEFAULT_LOW_STOCK` = 5 when unset), else `in_stock`. `suggested` = `max(0, (reorderQty || threshold × 2) − available − onOrder − inTransit)` for non-in-stock rows. `stockValue` = `max(0, onHand) × unitCost`.",
        "`SHOPIFY_WRITERS.inventory.update` calls `saveReorderPoint(id, patch)`, the only edit. The config sets `capabilities: { create: false, delete: false, bulkMove: false }`, and `status` is a `hidden` field that exists only to give the badge its colours.",
        "The `optionsFrom: inventory` pickers (stock adjustments) de-duplicate by value, since one item now has a row per location.",
        "Requires `read_inventory`, `read_locations`, `read_products`.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "stock-adjustments",
    title: "Stock Adjustments",
    category: "Inventory",
    everyday: [
      { t: "p", text: "A **stock adjustment** is the paper trail for stock that changed for a reason other than buying or selling — a stocktake found three more units than recorded, a bottle broke, a case expired, or samples went out. Instead of silently editing a number, you record a document that says what changed, where, and why." },
      {
        t: "dl",
        items: [
          { term: "Adjustment", def: "The document number (e.g. **SA-0001**), assigned automatically, with the item underneath." },
          { term: "Status", def: "**Parked** — saved as a draft, stock hasn't moved, still editable. **Completed** — applied to your Shopify stock and locked." },
          { term: "Reason", def: "Stocktake variance, damaged, expired, promotion / samples, shrinkage / theft, stock received, or other." },
          { term: "Facility", def: "The Shopify location where the change applies." },
          { term: "Quantity", def: "Signed units: **+3** adds stock, **−12** removes it." },
        ],
      },
      { t: "ol", items: ["Open Inventory then Stock Adjustments and click New stock adjustment.", "Pick the item and the facility — both lists come live from Shopify.", "Enter the signed quantity and the reason.", "Leave it Parked to save a draft, or set it Completed to apply the change now.", "To apply a parked draft later, open it and set it to Completed."] },
      { t: "callout", tone: "warning", title: "Completed means locked", text: "Completing an adjustment changes your live Shopify stock and freezes the document — it can't be edited or deleted afterwards. Made a mistake? Raise a new adjustment in the opposite direction." },
    ],
    technical: [
      { t: "p", text: "Keyed `stock-adjustments`; app-owned in MongoDB (`app_stock_adjustments`) via `src/lib/stock-adjustments.ts`, since Shopify has only quantity deltas, not adjustment documents. Search covers `number`, `item`, `sku`, `facility`, `reason`." },
      { t: "ul", items: [
        "`SA-XXXX` numbers come from an atomic counter in `app_counters`; `number`, `createdAt`, `updatedAt`, `completedAt` are server-generated.",
        "Item and facility names are resolved from Shopify at save time from `itemId` (the variant's `inventoryItemId`, via `optionsFrom: inventory`) and `facilityId` (`optionsFrom: locations`).",
        "Completing posts `inventoryAdjustQuantities` (`name: available`), mapping the reason onto Shopify's reason codes and passing `suedebucks://stock-adjustments/SA-XXXX` as `referenceDocumentUri`.",
        "Completion claims the document atomically (a `status: parked` filtered update) so double-submits can't post twice; if Shopify rejects it, the document stays parked.",
        "`rowLocked` makes completed documents immutable in the UI; the API rejects update and delete too. Needs `write_inventory`.",
        "Posting goes through `adjustShopifyInventory()` in `src/lib/inventory-ledger.ts`, and a completed adjustment is recorded in the stock movement ledger (`adjustment:SA-XXXX`).",
      ] },
      { t: "callout", tone: "info", title: "Modelled on Unleashed", text: "Mirrors the Unleashed Software adjustments screen: number, status, reason, facility, quantity, dates — with the same parked-to-completed lifecycle." },
    ],
  },

  // ==========================================================================
  {
    id: "stock-movements",
    title: "Stock Movements",
    category: "Inventory",
    everyday: [
      { t: "p", text: "**Stock Movements** is the history of every stock change, one line per item per location: what changed, by how much, where, when, and which document did it. If a number looks wrong on the Inventory page, this is where you find out why." },
      {
        t: "dl",
        items: [
          { term: "When / Document", def: "The time, and the document that moved the stock — SA-0001, PO-0003, TR-0002, SC-0001, or an order number. Click a row to open that document." },
          { term: "Type", def: "**Sale**, **PO receipt**, **Transfer out**, **Transfer in**, **Adjustment**, or **Stocktake** — also the tabs." },
          { term: "Item / Location", def: "What moved and where. Online sales show **Online orders**, because the shipping location isn't known when the order comes in." },
          { term: "Change", def: "Units added (positive) or removed (negative)." },
        ],
      },
      { t: "callout", tone: "warning", title: "What it doesn't include", text: "Changes made directly in Shopify admin, and refunds or cancellations, don't appear — only what goes through this app, plus orders as they come in. The **Inventory** page always shows Shopify's real figures." },
    ],
    technical: [
      { t: "p", text: "Keyed `stock-movements`; read-only, from MongoDB `app_stock_movements` via `src/lib/inventory-ledger.ts` (newest 2,000). Shopify has no queryable adjustment history, so this ledger is the app's own audit trail." },
      { t: "ul", items: [
        "Every stock-moving step calls `adjustShopifyInventory(changes, reason, referenceDocumentUri)` (one `inventoryAdjustQuantities` on `available`, after `inventoryActivate` for positive deltas at not-yet-stocked locations), then `recordMovements()`.",
        "Each line has a unique `key` (e.g. `receipt:PO-0003:2:<itemId>`, `sale:<orderId>:<lineItemId>`), written with `$setOnInsert` upserts, so retries never double-count. Ledger writes are best-effort: the Shopify change already happened, so a failure is logged, not thrown.",
        "Sales come from the `orders/create` webhook via `recordSale()`: line items with a `variant_id`. POS orders carry `location_id`; online orders are filed under `Online orders` with no location.",
        "`type`: `sale`, `receipt`, `transfer_out`, `transfer_in`, `adjustment`, `stocktake`. `href` points back to the source document (`rowHref`).",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    category: "Inventory",
    everyday: [
      { t: "p", text: "A **purchase order (PO)** records stock you've ordered from a supplier, from the moment you order it until every unit is on the shelf. Receiving a PO is how bought stock gets into your Shopify inventory." },
      {
        t: "dl",
        items: [
          { term: "Draft", def: "Being put together — add items, quantities, and unit costs. Nothing is counted yet." },
          { term: "Ordered", def: "Placed with the supplier. Its units show as **On order** on the Inventory page." },
          { term: "In transit", def: "The supplier has shipped it — you've added the carrier, tracking number, or ETA." },
          { term: "Partially received", def: "Some units have arrived and were added to stock; the rest are still expected." },
          { term: "Received", def: "Everything arrived. **Closed** means you stopped waiting for the rest; **Cancelled** means it was called off before anything arrived." },
        ],
      },
      { t: "ol", items: [
        "Add the supplier on **Suppliers** if it's new.",
        "On Purchase Orders, click **New purchase order**, pick the supplier and the location it's delivered to, and save.",
        "Open it, search for each item to add it, set the quantity and unit cost, and press **Save items**.",
        "Press **Place order** when you've sent it to the supplier.",
        "When the supplier ships it, press **Shipping details** to add the carrier, tracking number, and ETA — it shows on **Inbound**.",
        "When the goods arrive, press **Receive**, enter what actually came for each item, and confirm. Those units are added to that location's stock right away.",
        "If the rest will never come, press **Close**.",
      ] },
      { t: "callout", tone: "info", title: "Receive what you counted", text: "Enter the units that really arrived, not what the invoice says. Anything short stays open, so you can receive it when the next delivery comes." },
    ],
    technical: [
      { t: "p", text: "Keyed `purchase-orders`; MongoDB `app_purchase_orders` via `src/lib/inventory-docs.ts`; the state machine is `DOC_ACTION_FROM` in `src/config/inventory-docs.ts`. `PO-XXXX` numbers come from `app_counters`." },
      { t: "ul", items: [
        "Header (`supplierId`, `locationId`, `expectedAt`, `carrier`, `trackingNumber`, `eta`, `notes`) goes through the generic resource API (`createDoc` / `updateDocHeader` / `deleteDoc`). Supplier and location names are resolved server-side. Supplier and location lock once the PO leaves Draft, and only drafts can be deleted (`rowLocked` mirrors this in the list).",
        "Lines and stages go through `POST /api/inventory-docs/purchase-orders/[id]` `{ action, ... }`: `set_lines` (`[{ inventoryItemId, qty, unitCost? }]`, names and SKUs from Shopify, `unitCost` defaulting to `inventoryItem.unitCost`), `place`, `ship`, `receive` (`[{ inventoryItemId, qty }]`, each ≤ remaining), `close`, `cancel`.",
        "`receive` posts `+qty` at `locationId` with reason `received` and `referenceDocumentUri` `suedebucks://purchase-orders/PO-XXXX`, then records `receipt` movements and appends to `receipts`. Status becomes `partial` or `received`.",
        "Each step runs under a `busy` claim (`findOneAndUpdate` on status + `busy`, stale after 2 minutes). If Shopify rejects the change, the document is left untouched. The detail page is `/dashboard/purchase-orders/[id]` (`InventoryDocDetail`).",
        "Receiving doesn't update the item's cost in Shopify; a line's `unitCost` only values the PO.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "suppliers",
    title: "Suppliers",
    category: "Inventory",
    everyday: [
      { t: "p", text: "**Suppliers** is your list of the companies you buy stock from — who to call, their usual lead time, and their payment terms. Every purchase order is raised against one." },
      { t: "ol", items: ["Click **New supplier** and fill in the name and contact details.", "Set the **Lead time** — the usual days from ordering to delivery — so you know when to reorder.", "Click a supplier to edit it."] },
      { t: "callout", tone: "info", title: "Renaming keeps old POs as they were", text: "A purchase order keeps the supplier name it was created with, so renaming a supplier doesn't rewrite old POs." },
    ],
    technical: [
      { t: "p", text: "Keyed `suppliers`; app-owned in MongoDB (`app_suppliers`, `APP_OWNED_COLLECTIONS`), full CRUD with no special validation. `purchase-orders` reads it through `optionsFrom: { resource: \"suppliers\", valueKey: \"id\", labelKey: \"name\" }`, and `resolveSupplier()` snapshots the name onto the PO." },
    ],
  },

  // ==========================================================================
  {
    id: "transfers",
    title: "Transfers",
    category: "Inventory",
    everyday: [
      { t: "p", text: "A **transfer** moves stock from one of your locations to another — say, from the warehouse to a store. Stock leaves the first location when you send it and is added to the second when it's received, so nothing is ever counted in both places at once." },
      {
        t: "dl",
        items: [
          { term: "Draft", def: "Being put together — no stock has moved." },
          { term: "In transit", def: "Sent. The units are gone from the source and show as **In transit** at the destination." },
          { term: "Partially received / Received", def: "Some or all units have been counted in at the destination." },
          { term: "Closed", def: "The rest is never arriving (lost or damaged on the way). It already left the source, so nothing is added back." },
          { term: "Cancelled", def: "Called off. Cancelling a sent transfer that nothing has been received from puts the stock back at the source." },
        ],
      },
      { t: "ol", items: [
        "Click **New transfer**, pick **From** and **To**, and save.",
        "Open it and add the items and quantities — the search shows how many are available at the source.",
        "Press **Send stock**. The units leave the source right away.",
        "Optionally add **Shipping details** (carrier, tracking, ETA) so it shows on **Inbound**.",
        "At the destination, press **Receive** and enter what arrived.",
      ] },
    ],
    technical: [
      { t: "p", text: "Keyed `transfers`; MongoDB `app_transfers`, same engine as purchase orders (`TR-XXXX`). Header: `fromLocationId`, `toLocationId` (must differ), `carrier`, `trackingNumber`, `eta`, `notes`." },
      { t: "ul", items: [
        "`send` (draft → `in_transit`) posts `−qty` at the source with reason `movement_created` and records `transfer_out` movements.",
        "`receive` posts `+qty` at the destination (`movement_received`, activating the level if needed) and records `transfer_in`.",
        "`cancel` from `in_transit` (no receipts) posts `+qty` back at the source (`movement_canceled`). `close` from `partial` has no stock effect.",
        "Remaining units on `in_transit` / `partial` transfers feed the destination's `inTransit` on Inventory and the Inbound board.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "stocktakes",
    title: "Stocktakes",
    category: "Inventory",
    everyday: [
      { t: "p", text: "A **stocktake** is a count of what's really on the shelf at one location. You enter what you count, and posting it sets each counted item's stock to your count and records the difference." },
      { t: "ol", items: [
        "Click **New stocktake** and pick the location.",
        "Open it and press **Load all items at …** to list everything stocked there, or search to add just the items you're counting.",
        "Type each count. Leave a box blank to skip that item. Press **Save items** as you go, so nothing is lost.",
        "When you're done, press **Post counts**. Each counted item's Available is set to your count, and the difference shows as **Net variance**.",
      ] },
      { t: "callout", tone: "warning", title: "Post soon after counting", text: "The difference is worked out against Shopify's figure at the moment you post. If items sell between counting and posting, those sales are absorbed into the variance. Count and post when the location is quiet." },
    ],
    technical: [
      { t: "p", text: "Keyed `stocktakes`; MongoDB `app_stocktakes` (`SC-XXXX`). Lines carry `counted` (`null` = skipped) and, once posted, `expected`." },
      { t: "ul", items: [
        "`load_location` pages the location's `inventoryLevels` (100 per page), adding every tracked item while keeping existing counts and hand-added lines.",
        "`post` reads live `available` per item at the location (`readAvailable()`: `inventoryItem.inventoryLevel(locationId:)`, 100 items per query; not stocked counts as 0). It posts `counted − available` per line with reason `cycle_count_available`, records `stocktake` movements for non-zero deltas, and stores `expected`.",
        "Posted and cancelled stocktakes are locked; `varianceUnits` (Σ counted − expected) is derived on read.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "categories",
    title: "Categories",
    category: "Catalog",
    everyday: [
      { t: "p", text: "**Categories** shows every product type used in your Shopify catalog, and how many products have each type — Eau de Parfum, Extrait, Home & Candles, and so on. It's a read-only summary." },
      {
        t: "dl",
        items: [
          { term: "Category", def: "A product type in use in your store (products with no type are grouped as Uncategorized)." },
          { term: "Products", def: "How many products have that type." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Categories to see how your catalog is spread.", "To change a product's category, open it on the **Products** page and change its Category."] },
      { t: "callout", tone: "info", title: "Category is structure, Collection is marketing", text: "Think of **categories** as the aisles in a shop and **collections** as the front-window displays." },
    ],
    technical: [
      { t: "p", text: "Keyed `categories`; Shopify-backed, **read-only**. Shopify has no category entity at this level, so `readCategories()` scans up to 250 products' `productType` and returns one row per distinct type with its count, sorted by count. `parent` is always empty and `status` always `active` — the form's Parent / Hidden fields have no effect." },
      { t: "p", text: "KPIs: Categories, Top level (all of them, since `parent` is empty), Products classified, Hidden (always 0)." },
    ],
  },

  // ==========================================================================
  {
    id: "orders",
    title: "Orders",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Orders** page is every sale that has come in, online and in-store, read live from Shopify — and it's where you move each order through your own workflow: checking it, packing it, booking a courier, printing a label, and handing it over." },
      { t: "p", text: "The tabs above the table show the order's **stage** in that workflow: **Exception**, **Pending CC**, **Active**, **Packaged**, **Booking Failed**, **Finalized**, **In Pickup & Packing**, **Dispatched**, plus Fulfilled, Delivered, **POS sale** (sold at a till — no shipping steps), Returned, Canceled, Draft, Duplicate, and On Hold. The stage is separate from Shopify's own Payment and Fulfillment columns." },
      { t: "h", text: "Where new orders land" },
      { t: "p", text: "The moment an order is placed, its shipping address is checked for problems a courier would trip over — a blank or very short address, placeholder text like test, keyboard mashing, a run of the same letter, only the city or country, a missing city, or a missing or unusable phone number. Then it's filed automatically:" },
      { t: "ul", items: [
        "**Exception** — the address has a problem. Fix it before anything ships.",
        "**Pending CC** — the address is fine but the customer paid only by **bank deposit**, so it waits until the deposit has cleared.",
        "**Active** — the address is fine and it's paid another way (PayFast, cash on delivery, and so on). Ready to pack.",
      ] },
      { t: "callout", tone: "warning", title: "Automatic filing needs the order webhook", text: "New orders are only checked and filed if the order webhook is registered on the **Integrations** page. Orders placed before that show up as **Active** without an address check. In-store (POS) orders are never checked — there's nothing to ship." },
      { t: "h", text: "The control panel" },
      { t: "p", text: "Tick one or more orders from the same tab and a **control panel** appears at the bottom of the screen with only the actions that make sense there:" },
      {
        t: "dl",
        items: [
          { term: "Exception", def: "**Modify** (fix the address), **Move to Active**, or **Discard**. Moving an order you haven't modified asks first: This order was flagged as malformed. Are you sure you want to move it into active orders? — once you've modified it, it moves straight away." },
          { term: "Pending CC", def: "**Deposit cleared → Active** once the money is in, **Modify**, or **Discard**." },
          { term: "Active", def: "**Create Package** (hands it to the packing team and tags it `packaged` in Shopify), **Modify**, **Move to Exceptions**, or **Discard**." },
          { term: "Packaged", def: "**Assign consignment** — pick the courier (leave it on **Auto**: Karachi goes to the **manual courier**, everywhere else to **Insta**; or choose **Custom…** and type any courier's name) and each order gets a consignment ID generated automatically, in the format chosen in **Settings → Consignment IDs**. Works on many orders at once. **Back to Active** undoes the package." },
          { term: "Booking Failed", def: "Left over from the old courier-booking step — new orders no longer land here. If an order is in this tab, press **Assign consignment** to give it a generated ID." },
          { term: "Finalized", def: "**Print shipping label**, or **Cancel** — cancelling a finalized order needs a reason and releases its consignment." },
          { term: "In Pickup & Packing", def: "The label is printed. **Dispatch** when the courier collects it, reprint the label, or **Cancel pickup** to send it back to Finalized. Dispatch asks which **load sheet** the parcels go on." },
          { term: "Dispatched", def: "**Add to load sheet** for any order not yet on one. **Mark fulfilled** once it's delivered — for any courier, it also marks the order fulfilled in Shopify (also available from **Delivered**). Or: **Mark delivered** when the courier confirms delivery, or **Mark returned (RTO)** when the parcel comes back undelivered (also on the **Shipments** page)." },
        ],
      },
      { t: "callout", tone: "info", title: "Editing an order's customer details", text: "**Modify** (in the triage tabs), **⋯ › Edit** (any tab, one order), and **Edit details** on the order's own page all open the same form: shipping name, address, phone, email, and order note. As you type it shows whether the address still looks wrong. Nothing is saved until you press **Save changes** and confirm — then the change is written to the Shopify order (the customer's account isn't changed). Any stage except Canceled can be edited. If the label is already printed the form reminds you to reprint it, and once the parcel has left it warns that the courier won't see the change." },
      { t: "callout", tone: "info", title: "Discard doesn't touch Shopify", text: "Discarding moves the order to **Canceled** here only. The Shopify order isn't cancelled or refunded — do that in Shopify if you need to." },
      { t: "p", text: "The panel stays pinned to the bottom of the screen. Its **⋯** button is always there, even when the ticked orders come from different tabs. It holds **Open in new tab** (each ticked order's page), **Edit** (the same as Modify, for one order in Exception, Pending CC, or Active), and **Advanced › Move to**, which puts the orders straight into any tab you pick. Move to is a manual override, so nothing else happens: no Shopify tags, no consignment assigned, no load sheet. **Delete permanently**, the last item, deletes the orders in Shopify." },
      { t: "callout", tone: "warning", title: "Delete can't be undone", text: "**Delete** removes the order from Shopify itself, along with its payment and fulfilment records. Shopify won't delete some orders (open, paid ones, for example) and shows why. If you only want an order off the workflow, use **Discard** or **Move to → Canceled** instead." },
      { t: "h", text: "Labels, scanning, and load sheets" },
      { t: "p", text: "**Print shipping label** opens the labels in a new tab, one per page, ready for a 4×6 label printer: the order number, courier, a **QR code**, the consignment ID, the customer's name, address, and phone, and the cash to collect (or PAID)." },
      { t: "callout", tone: "success", title: "Scan a label with your phone", text: "The QR code is a link to this app. Scan it with a phone camera (you'll be asked to sign in first if you aren't) and the order moves to its next stage: **Finalized** → **In Pickup & Packing** → **Dispatched**, and for the manual courier a second scan on delivery → **Fulfilled**. Before dispatching, the page asks which of the courier's open load sheets the parcel goes on (or to start a new one). The page shows the order number and the move it made." },
      { t: "callout", tone: "success", title: "Scan to dispatch", text: "The **Scan to dispatch** button next to the tabs opens a scanner box. Scan each printed label with a barcode scanner (or type the consignment ID and press Enter), then pick which of that courier's load sheets it goes on. The sheet you used last for that courier is already highlighted, so pressing Enter confirms it." },
      { t: "callout", tone: "info", title: "Every dispatched parcel goes on a load sheet", text: "However an order is dispatched — the button, a scanner, or a phone — it's added to a courier **load sheet** (see **Dispatch**). You always choose the sheet — nothing is ever picked or started for you. The **Dispatch** button asks once per courier in your selection: one of that courier's open (Draft) sheets, or **Start a new sheet**. You can have as many sheets open at once as you like, for the same courier or different ones. The **Load sheet** column shows where each parcel went." },
      { t: "callout", tone: "warning", title: "Print labels from the live site", text: "The QR link points at whichever web address the labels were printed from. Print them from the public site, not from a computer's localhost, or phones won't be able to open the link." },
      { t: "h", text: "Manual courier deliveries" },
      { t: "p", text: "When a parcel is delivered, tick it in **Dispatched** (or **Delivered**) and press **Mark fulfilled** — for any courier. The order is marked fulfilled in Shopify too, with the consignment ID as its tracking number and no email to the customer, and moves to **Fulfilled**. Manual-courier riders can also do it by scanning the label a second time on delivery; other couriers' labels don't fulfil on a rescan." },
      { t: "h", text: "The columns" },
      {
        t: "dl",
        items: [
          { term: "Ship", def: "A small code at the start of the row for how the order ships: **STD** standard, **EXP** express, **ON** overnight / same-day, **ECO** economy, **FREE** free shipping, **PICK** local pickup, **—** not shipped (e.g. POS). Hover it for the full name; searching finds orders by shipping method too." },
          { term: "Order / Customer", def: "The order number, and the name entered on the order (the shipping name, or the billing name if there's none). That can differ from the name on the customer's account; searching finds either." },
          { term: "Status", def: "The workflow stage — also which tab it's under." },
          { term: "City / Courier", def: "The destination city, and the courier it's booked with (or, before booking, whichever courier is on the Shopify shipment)." },
          { term: "Consignment / Load sheet", def: "The courier's consignment ID once assigned (the code in the label's QR — you can search by it), and the load sheet it was dispatched on." },
          { term: "Payment", def: "**Paid**, **Pending**, or **Refunded**." },
          { term: "Fulfillment", def: "**Fulfilled**, **Partial**, or **Unfulfilled** in Shopify." },
          { term: "Channel", def: "**Online** or **POS**." },
          { term: "Amount / Disc. / Shipping / Net Total", def: "Item subtotal, discount, shipping charged, and the final total." },
          { term: "Gateway / Tags / Qty / Date", def: "How it was paid, its Shopify tags, how many items, and when it was placed." },
        ],
      },
      { t: "ol", items: ["Start with the **Exception** tab: tick each order, **Modify** the address, then **Move to Active**.", "Check **Pending CC** — when a bank deposit has cleared, press **Deposit cleared → Active**.", "In **Active**, tick what's ready and press **Create Package**.", "In **Packaged**, tick the orders and press **Assign consignment** — leave the courier on Auto and the IDs are generated for you.", "In **Finalized**, press **Print shipping label** and stick the labels on the parcels.", "When the courier collects, press **Dispatch**, scan the labels, or scan the whole batch into a load sheet on the Dispatch page.", "When parcels are delivered, press **Mark fulfilled**."] },
      { t: "callout", tone: "info", title: "Click an order to see every step", text: "Clicking an order opens its own page: the **Timeline** (placed, payments, each shipment and delivery, refunds, cancellation) mixed with every step of your workflow, newest first; the items; the shipping address; the payment summary; the **Customer** this order is for, as entered on it; a **Customer profile** card for the Shopify account it's linked to (contact details, number of orders, total spent, customer since, tags, notes, and **Also known as** — every name the customer has used on their account, saved addresses, and recent orders, with how many orders used each); and a **Workflow** card with the current stage, any address flags, the courier, consignment, cash to collect, load sheet, and a link to the label. **Edit details** at the top (or **Edit** on the Customer or Shipping address card) changes the customer's details on the order." },
      { t: "callout", tone: "warning", title: "The workflow needs the database", text: "Order stages are stored in this app's database, not in Shopify. If the database isn't reachable, every order shows as **Active** and the control panel can't move anything." },
      { t: "callout", tone: "info", title: "Stat cards", text: "**Orders** and **Revenue** (with a badge comparing the last 30 days to the 30 before), **Unfulfilled** (not yet shipped in Shopify), and **Avg. order value**. Like every Shopify page, the list holds your latest 100 orders." },
    ],
    technical: [
      { t: "p", text: "Keyed `orders`; Shopify-backed, with the app-owned workflow overlay merged on. `readOrders()` maps `name`; `customer` = `shippingAddress.name` → `billingAddress.name` → `customer.displayName` → `Guest` (the name on the order, not the account's), with `customer.displayName` also kept as `customerAccount` for search; `shippingLine.title` → `shippingMethod` and, via `shippingType()` (keyword match on title / code, a zero price → `free`, no line → `none`), `shippingType` — rendered by the `indicator` column type, which shows an option's `short` code with its `label` as the tooltip; `shippingAddress.city`, the first fulfillment's `trackingInfo.company` → `courier`, `paymentGatewayNames` → `gateway`, `tags`, `subtotalPriceSet` / `totalDiscountsSet` / `totalShippingPriceSet` / `totalPriceSet`, `subtotalLineItemsQuantity`, `displayFinancialStatus` → `payment` (`paid` / `pending` / `refunded`), `displayFulfillmentStatus` → `fulfillment` (`fulfilled` / `partial` / `unfulfilled`), `sourceName` → `channel`, `createdAt`, `note`. Search covers `number`, `customer`, `consignmentId`." },
      { t: "p", text: "`GET /api/resources/orders` runs `attachOrderOps()` (`src/lib/order-ops.ts`) to add `opsStatus` (default `active`), `consignmentId`, `loadSheet`, `flags`, `modified`, and the booked `courier` (which wins over Shopify's tracking company). `orders` declares `rowHref`, so rows open `/dashboard/orders/[id]` instead of a drawer; the generic PATCH path (note + `setOrderOps()` override) still exists for API use." },
      { t: "h", text: "The workflow document" },
      { t: "p", text: "`app_order_ops` holds one document per touched order, `_id` = Shopify order id: `opsStatus`, `flags`, `modified`, `courier`, `consignmentId` (unique partial index), `bookingError`, `codAmount` / `total` / `number` (snapshot at Create Package), `labelPrintedAt`, `dispatchedAt`, `loadSheet`, `fulfilledAt`, `cancelReason`, and an append-only `history` of `{ at, action, from, to, note }`. No customer PII is stored — names and addresses are always read live." },
      { t: "ul", items: [
        "**Intake**: `POST /api/webhooks/orders-create` (Shopify `orders/create`, HMAC-verified with the client secret) → `intakeFromWebhook()` (`src/lib/order-workflow.ts`) → `checkAddress()` + `routeNewOrder()` (`src/lib/address-check.ts`) → `intakeOrder()`, a `$setOnInsert` upsert so retries never overwrite a status staff already changed. POS orders are skipped. Routing: any address issue → `exception`; every gateway matching `/bank|deposit|transfer|ibft/i` → `pending_cc`; otherwise `active`.",
        "**Transitions**: `ACTION_FROM` in `src/config/order-workflow.ts` is the single table of which action runs from which status; the control panel reads it for buttons and `runOrderAction()` enforces it behind `POST /api/orders/[id]/actions` (`{ action, ...payload }`). Only the label-QR rescan restricts `mark_fulfilled` to `MANUAL_COURIER`; from the app it runs for any courier.",
        "`applyTransition()` is a compare-and-set on `{ _id, opsStatus: from }` (upserting only when `from` is the default `active`), so a lost race reports \"status changed in the meantime\" instead of a double move.",
        "`move_active` from `exception` without `modified` returns `409 { needsConfirmation }`; the client asks, then resends with `confirmed: true`.",
        "`modify` → `orderUpdate` with a new `shippingAddress` (`MailingAddressInput`; `provinceCode` / `countryCode` passed through), `note`, and `email` (validated), then re-runs `checkAddress()` into `flags`. It's allowed from every stage but `canceled` (`EDITABLE_STAGES`); the control panel only shows it as a button in `MODIFY_BUTTON_TABS`, elsewhere through ⋯ › Edit. `OrderEditDrawer` (exported from `order-control-panel.tsx`) is shared with the order page's Edit details, and warns for `LABEL_PRINTED_STAGES` / `SHIPPED_STAGES`.",
        "`create_package` reads `readOrderBrief()` (`totalOutstandingSet` → `codAmount`) and `tagsAdd`s `packaged`; `unpackage` `tagsRemove`s it.",
        "`assign_consignment`: `{ courier }`, a `COURIERS` value, a custom name, or `\"auto\"` (default: `defaultCourierFor(city)`). `normalizeCourier()` trims it, caps it at 40 characters, and snaps a case-insensitive match to the listed courier; the stored `courier` is that name. In the ID, `<courier-name>` is `courierCode()`: the listed `code` (`INSTA`, `MANKHI` for the manual courier), else the custom name reduced to `[A-Z0-9]`. The server reads the city and number via `readOrderBrief()`, then generates the ID with `renderConsignmentId(readAppSettings().consignmentTemplate, …)` (`src/config/consignment-schema.ts`). `<ms-since-epoch>` comes from `nextConsignmentMs()`, strictly increasing per process, so a sequential bulk run never repeats a value. The unique `consignmentId` index is the final guard. There is no manual entry and no courier booking API any more (the Insta stub was removed). `booking_failed` stays as a status only for orders already in it.",
        "`print_label` → `in_pickup_packing` (a reprint just logs). Labels render at `/print/labels?ids=…` (outside `/dashboard` so no chrome prints; gated by the proxy and a session check), QR generated server-side with the `qrcode` package.",
        "`dispatch` → `dispatched` and `add_to_load_sheet` (from `dispatched`, no `loadSheet` yet): `resolveLoadSheet(courier, target, location)` in `src/lib/dispatch.ts` resolves the user's choice — a Draft sheet id for the same courier, or `\"new\"` (opened from `location`); there is no automatic choice, and a missing target is an error — then `attachToLoadSheet()` `$push`es the consignment and `$inc`s the sheet totals (idempotent via `consignmentIds: { $ne }`). The control panel sends `sheetFor` (one choice per courier) and runs orders sequentially, reusing the first returned `loadSheetId` per courier when the choice is `\"new\"`. `remove_from_sheet` (→ `in_pickup_packing`, unsets `loadSheet` / `dispatchedAt`) and `move_to_sheet` (to another Draft of the same courier) both require the current sheet to be a Draft, and `detachFromLoadSheet()` reverses the totals. `mark_fulfilled` runs from `dispatched` / `delivered` for any courier.",
        "`mark_fulfilled` → `fulfilled`: `fulfillOrder()` reads the order's `fulfillmentOrders` and runs one `fulfillmentCreate` over every `OPEN` / `IN_PROGRESS` one with `trackingInfo { company, number: consignmentId }` and `notifyCustomer: false`; nothing open counts as success. Needs `read_merchant_managed_fulfillment_orders` / `write_merchant_managed_fulfillment_orders`.",
        "`cancel` from `in_pickup_packing` → `finalized` (clears `labelPrintedAt`); from `finalized` it requires `reason` → `canceled`, stores `cancelReason`, and unsets `consignmentId` so the label can't be scanned. `discard` → `canceled` locally only.",
        "Generic bulk actions, shown for any selection (mixed tabs included) and not part of `ACTION_FROM`: **Move to** PATCHes `/api/resources/orders/[id]` with `{ opsStatus }` only. That goes through `setOrderOps()` (history entry `set_status`, no side effects), and the route skips `orderUpdate` unless `notes` is in the body, so the Shopify note is kept. **Delete** calls `DELETE /api/resources/orders/[id]`: Shopify `orderDelete(orderId)` (needs `write_orders`; Shopify's userErrors, such as refusing open paid orders, are passed through), then `deleteOrderOps()` drops the `app_order_ops` doc.",
      ] },
      { t: "h", text: "Scanning" },
      { t: "ul", items: [
        "Label QRs encode `<origin>/scan/<consignmentId>` (`scanPath()`), the origin taken from the request's `host` / `x-forwarded-*` headers.",
        "`/scan/[consignmentId]` renders `ScanAdvance`, which POSTs `{ advance: true }` to `/api/consignments/[consignmentId]` once after load — never on the GET, so link previews can't move orders; a ref guard stops Strict Mode running it twice. The endpoint maps status through `SCAN_ADVANCE` (`finalized` → `print_label`, `in_pickup_packing` → `dispatch`, `dispatched` → `mark_fulfilled` for `MANUAL_COURIER` only). A sheet step without `target` answers **409** `{ needsSheet, courier, sheets }` (`listDraftSheets()`); `ScanAdvance`, Scan to dispatch, and the sheet scanner pick with `SheetPicker` (`src/components/dashboard/sheet-picker.tsx`) and resend with `target` (+ `location` for `\"new\"`).",
        "The in-app scanners (`src/components/dashboard/scanners.tsx`) are keyboard-wedge: a focused input that submits on Enter. `consignmentFromScan()` reduces a scanned URL to the bare id, so older bare-id labels still work. Scan to dispatch POSTs without `advance` (always `dispatch`).",
      ] },
      { t: "p", text: "`/dashboard/orders` is a literal route (`OrdersView`) wrapping `ResourceView` with `toolbar` (Scan to dispatch) and `selectionBar` (`OrderControlPanel`). The detail page (`GET /api/orders/[id]` → `readOrderDetail()` + `getOrderOps()`) merges `ops.history` into Shopify's timeline as `ops`-kind steps. `customer` is the order's own shipping/billing name; `customerProfile` (`buildProfile()` in `src/lib/shopify-order-detail.ts`, `null` for guests) reads the linked account's contact fields, `numberOfOrders`, `amountSpent`, `tags`, `note`, `addresses(first: 20)`, and its last 50 orders' shipping/billing names. `aliases` de-duplicates those names case- and space-insensitively, counting orders per name and flagging the account name and this order's. KPIs: Orders and Revenue (`periodDelta` over 30 days), Unfulfilled, Avg. order value." },
      { t: "callout", tone: "info", title: "One flat stage per order", text: "Reference systems often track several independent badges per order (pipeline stage, payment, a separate return flag). This app uses a single `opsStatus` — every tab is mutually exclusive. If an order ever needs to be, say, Fulfilled and Returned at once, the fix is splitting `opsStatus` into a pipeline stage plus a separate exception field in the same document." },
    ],
  },

  // ==========================================================================
  {
    id: "draft-orders",
    title: "Draft orders",
    category: "Sales",
    everyday: [
      { t: "p", text: "A **Draft order** is an order you create yourself before the customer pays — handy for phone orders or wholesale. This page lists your Shopify draft orders with their total and status." },
      {
        t: "dl",
        items: [
          { term: "Draft / Customer", def: "The draft's number (like #D12) and who it's for." },
          { term: "Total", def: "What the draft comes to." },
          { term: "Status", def: "**Open**, **Invoice sent**, or **Completed** (paid and turned into a real order) — set by Shopify." },
        ],
      },
      { t: "ol", items: ["Open Sales then Draft Orders.", "Click New and enter the total and a note — this creates a Shopify draft with one line called Custom sale for that amount.", "Open it in Shopify admin to add real products, attach a customer, send the invoice, or complete it.", "Click a draft here to update its note."] },
      { t: "callout", tone: "warning", title: "Only the total and note are used", text: "Creating a draft here sends just the total (as one custom line) and the note — the Customer field isn't attached. Status changes as you invoice and complete the draft in Shopify; changing it here isn't saved." },
    ],
    technical: [
      { t: "p", text: "Keyed `draft-orders`; Shopify-backed. `readDraftOrders()` maps `name`, `customer.displayName`, `totalPriceSet`, `status` (lowercased: `open`, `invoice_sent`, `completed`), `createdAt`, `note2`." },
      { t: "ul", items: [
        "Create: `draftOrderCreate` with one custom line item (`title: Custom sale`, `originalUnitPrice: total`, `quantity: 1`) and `note`. A total of 0 is rejected.",
        "Update: `draftOrderUpdate` with `note` only. Delete: `draftOrderDelete`.",
        "KPIs: Open drafts, Pipeline value (`sum(total)` over all drafts), Invoices sent, Completed.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "returns",
    title: "Returns",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Returns** page tracks items customers send back — from the moment a return is requested through to refund. It shares a page with **Dispatch** (a switch at the top flips between them) because both are about a parcel's life after the sale, just in opposite directions." },
      {
        t: "dl",
        items: [
          { term: "RMA #", def: "The return's reference, e.g. **RMA001** — you choose it when you open the return." },
          { term: "Order", def: "The original order number, with the customer underneath." },
          { term: "Reason", def: "**Damaged**, **Wrong item**, **Changed mind**, **Defective**, **Late delivery**, or **Other**." },
          { term: "Status", def: "**Requested → Approved → In Transit → Received → Refunded**, or **Rejected** — also the tab it's under." },
          { term: "Refund Amount / Restock Location", def: "How much is being refunded, and where the item goes back into stock." },
        ],
      },
      { t: "ol", items: ["Open Sales then Returns (or flip to it from the Dispatch switch).", "Click New return and enter the RMA #, order #, customer, and reason.", "Set Approved once you've agreed to take it back, and pick the pickup courier.", "Move it to In Transit, then Received once it's back.", "Enter the refund amount and set Refunded once the money has gone back — or Rejected if you're declining it."] },
      { t: "callout", tone: "warning", title: "A record only — Shopify isn't changed", text: "A return here doesn't refund the customer in Shopify, change the order, or put stock back. Issue the refund in Shopify, and raise a **Stock Adjustment** (reason: stock received) to restock." },
    ],
    technical: [
      { t: "p", text: "Keyed `returns`; app-owned in MongoDB (`app_returns`) via the generic `src/lib/app-data.ts` path. Search covers `reference`, `orderNumber`, `customer`. `status` drives `tabs`; `reason` is an independent status field. `restockLocation` and `courier` reuse `LOCATION_OPTIONS` / `COURIER_OPTIONS`." },
      { t: "ul", items: [
        "`reference` is hand-entered (not a counter) and `orderNumber` is free text — neither is linked to the Shopify order or to `app_order_ops` (an order's `returned` stage is set separately).",
        "`refundAmount` is hand-entered and can drift from Shopify's refund records, which remain the source of truth for money.",
        "KPIs: Returns, Pending (requested + approved + in transit), Refunded (`sum(refundAmount)` of refunded), Rejected.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "shipments",
    title: "Shipments",
    category: "Logistics",
    everyday: [
      { t: "p", text: "**Shipments** tracks every parcel that has a consignment, from the moment it's booked until it's delivered or comes back. It's the place to chase parcels that are taking too long and to record what happened to each one." },
      {
        t: "dl",
        items: [
          { term: "Tracking", def: "**Awaiting pickup** (label printed, not handed over yet), **In transit** (dispatched), **Delivered** (or marked fulfilled), **Returned (RTO)** — also the tabs." },
          { term: "Days out", def: "How long a parcel in transit has been with the courier. Over 5 days counts as **Stuck**." },
          { term: "COD", def: "The cash the courier collects on delivery (0 if it was paid online)." },
          { term: "City", def: "Recorded when the consignment is assigned. Older parcels may show none." },
        ],
      },
      { t: "ol", items: [
        "Check the **In transit** tab and the **Stuck** card every day, and chase the courier on anything stuck.",
        "When a courier confirms delivery, tick the parcels and press **Mark delivered** — or **Mark fulfilled** on the Orders page, which also fulfils the order in Shopify.",
        "When a parcel comes back undelivered, tick it, press **Mark returned (RTO)**, and give a reason.",
        "Click any row to open its order.",
      ] },
      { t: "callout", tone: "info", title: "Returned stock isn't added back automatically", text: "Marking a parcel returned doesn't change stock. Once you've checked the items, put them back with a **stock adjustment** (reason: Stock received)." },
    ],
    technical: [
      { t: "p", text: "Keyed `shipments`; read model over `app_order_ops` docs with a `consignmentId` (`listConsignedOrders()` → `listShipments()` in `src/lib/logistics.ts`, newest 5,000). The route returns `readOnly: false` so rows are selectable; the config turns off create, edit, delete, and bulk move." },
      { t: "ul", items: [
        "`stage` = `trackingStage(opsStatus)` (`src/config/logistics.ts`): `finalized` / `in_pickup_packing` → `awaiting_pickup`, `dispatched` → `in_transit`, `fulfilled` / `delivered` → `delivered`, `returned` → `returned`.",
        "`daysInTransit` is measured from `dispatchedAt`; `stuck` when it exceeds `SHIPMENT_STUCK_DAYS` (5). `deliveryDays` runs from `dispatchedAt` to `deliveredAt` (or `fulfilledAt`).",
        "The panel runs the order workflow actions `mark_delivered` (`dispatched` → `delivered`, stamps `deliveredAt`) and `mark_returned` (`dispatched` / `fulfilled` / `delivered` → `returned`, stamps `returnedAt`, reason in history) through `POST /api/orders/[id]/actions`. Both are also on the Orders control panel.",
        "`assign_consignment` snapshots the shipping `city` onto the ops doc for this board and the city scorecard.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "dispatch",
    title: "Dispatch",
    category: "Logistics",
    everyday: [
      { t: "p", text: "The **Dispatch** page is your courier handover book. A **load sheet** is the list you hand a courier when their rider collects a batch: which parcels (consignment IDs), how many, their combined value, and the cash on delivery (**COD**) the rider has to collect. It's proof of what left with them, and the COD total is what the courier owes you back." },
      { t: "p", text: "Sheets move through three stages, shown as tabs: **Draft** (still being loaded), **Posted** (handed to the courier), and **Archived** (settled, kept for records)." },
      { t: "callout", tone: "info", title: "You choose every sheet", text: "Dispatching always asks which sheet: the Dispatch button (once per courier), Scan to dispatch (after each scan), and a phone scanning a label. You pick one of the courier's open **Draft** sheets or start a new one — sheets are never started or chosen for you. Run as many open sheets at once as you need: each open sheet's page has **Scan parcels on**, which loads every scanned label straight onto that sheet, so two people can load two sheets side by side. The sheet's parcel count, total, COD, and consignment list update with every parcel. When the rider leaves, press **Post — handed to courier**." },
      { t: "callout", tone: "info", title: "Orders, sheets, and couriers stay in sync", text: "A sheet holds one courier's parcels only. Its courier can't be changed once parcels are on it, and its totals are counted from its parcels, never typed in. On an open sheet's page you can tick parcels and **Remove from sheet** (they go back to In Pickup & Packing) or **Move to another sheet** of the same courier. Moving an order back to an earlier stage takes it off its open sheet. Once a sheet is handed over its parcels stay on it — mark a parcel returned instead. Any parcel that doesn't match its sheet shows an **Out of sync** badge with the reason." },
      { t: "callout", tone: "success", title: "Scan a load sheet", text: "Or build a sheet at the door: press **Scan load sheet**, pick the courier (for a custom courier, pick **Other** and type the same name used when assigning the consignment), then **A new sheet** (and where it leaves from) or one of that courier's open sheets, and scan every parcel's label as you hand it over. Each scan adds the parcel and its COD; the running totals show at the bottom. Saving marks every order **Dispatched**, and posts the sheet if **Post the sheet when done** is ticked. Parcels must have a printed label (In Pickup & Packing), or already be Dispatched but on no sheet, and be booked with the same courier." },
      {
        t: "dl",
        items: [
          { term: "Reference/ID", def: "The sheet's number, like **LS001**, assigned automatically." },
          { term: "Courier / Location", def: "Which courier is collecting, and where the parcels leave from." },
          { term: "Consignments", def: "Every consignment ID on the sheet." },
          { term: "Status", def: "**Draft**, **Posted**, or **Archived** — also the tab." },
          { term: "Reconciliation", def: "**Pending** or **Reconciled** — whether the courier has paid you the COD it collected. Recording a payment on **COD Reconciliation** and ticking the sheets it covers marks them Reconciled for you." },
          { term: "Total Shipments / Total Amount / COD Amount", def: "Parcel count, combined order value, and cash to collect — counted from the parcels on the sheet, and can't be edited." },
          { term: "Weight", def: "Entered by hand if you track it." },
          { term: "Date Created / Date Posted", def: "When the sheet was started, and when it was handed over." },
        ],
      },
      { t: "h", text: "Opening and printing a sheet" },
      { t: "p", text: "Click any sheet to open it. Its page lists **every parcel on it** — order number, consignment ID, customer, city, phone, stage, COD, and value (click a parcel to open that order) — with the parcel count, COD, total value, and weight on top. The buttons there move the sheet along: **Post — handed to courier**, **Mark COD reconciled**, and **Archive**." },
      { t: "p", text: "Press **Print** for the courier **manifest**: a one-page handover document with the sheet number, courier, dates, the parcel table with each COD amount, the totals, and signature lines for the person handing over and the rider receiving. Print two — one for the rider, one for your records." },
      { t: "p", text: "To change a sheet's location, status, reconciliation, weight, or notes — or its courier while it's still empty — or to delete an empty one, use the **…** menu at the end of its row (Edit / Delete)." },
      { t: "ol", items: ["Dispatch orders from the Orders page, or use **Scan load sheet** here.", "When the rider arrives, open the courier's Draft sheet, check the parcels, and press **Print** for the manifest to sign.", "Press **Post — handed to courier** as the rider leaves — this stamps Date Posted.", "When the courier pays you the COD, open the sheet and press **Mark COD reconciled**.", "Press **Archive** on settled sheets to keep the Posted tab to what's still outstanding.", "You can also click **New load sheet** to start one by hand (for example, a different location)."] },
      { t: "callout", tone: "warning", title: "Only Draft sheets take new parcels", text: "Once a sheet is Posted it can't take more parcels or go back to Draft — pick or start another sheet for that courier. A sheet that has parcels on it can't be deleted, because orders remember which sheet they left on — archive it instead." },
      { t: "callout", tone: "warning", title: "Posting stamps the date for good", text: "Date Posted is set the first time a sheet becomes Posted, and archiving it later doesn't change it." },
    ],
    technical: [
      { t: "p", text: "Keyed `dispatch`; app-owned in MongoDB (`app_dispatch_load_sheets`) via `src/lib/dispatch.ts`, parameterised by `LoadSheetResource` so `return-load-sheets` shares it. Search covers `reference`, `courier`, `location`." },
      { t: "ul", items: [
        "`reference` (`LS001`, …) comes from an atomic counter in `app_counters`; `createdAt` is server-set; `datePosted` is stamped the first time `status` becomes `posted` and never overwritten.",
        "`status` (`draft` / `posted` / `archived`) drives `tabs`; `reconciliation` (`pending` / `reconciled`) is independent.",
        "`resolveLoadSheet(courier, target, location)` — an id must be a Draft for the same courier; `\"new\"` opens one from `location` (default `Main Warehouse`); there is no automatic target. `updateLoadSheet()` refuses a courier change on a loaded dispatch sheet and any return to `draft`, and never takes totals from the client (they move only through `attachToLoadSheet()` / `detachFromLoadSheet()`). `setOrderOps()` and order delete call `releaseFromSheet()`, which detaches from a Draft sheet and refuses a handed-over one. `getLoadSheetDetail()` adds `syncIssue` per parcel (courier mismatch, a stage outside `ON_SHEET_STAGES`, the order pointing at another sheet, or missing from `consignmentIds`). `attachToLoadSheet()` `$push`es the consignment into `consignmentIds` and `$inc`s `totalShipments` / `totalAmount` / `codAmount` from the order's Create Package snapshot, idempotently. `postLoadSheet()` posts and stamps `datePosted`.",
        "Totals stay editable in the drawer; `weight` is hand-entered only. `deleteLoadSheet()` refuses a sheet whose `consignmentIds` isn't empty.",
        "**Scanned sheets**: the courier select's `Other` reveals a name field, run through `normalizeCourier()` so it matches orders on a custom courier. `POST /api/dispatch/scan-sheet` → `createScannedLoadSheet()` in `src/lib/load-sheet-scan.ts` (separate because it calls `runOrderAction()`, and `order-workflow.ts` imports `dispatch.ts`). Each consignment is resolved via `findByConsignment()` and must be `in_pickup_packing`, or `dispatched` with no `loadSheet`, and booked with the sheet's courier; a new sheet is opened, each order runs `dispatch` / `add_to_load_sheet` with `{ target: sheetId }`, then the sheet is posted. The scanner UI pre-checks each code with `GET /api/consignments/[consignmentId]`.",
        "`/dashboard/dispatch` and `/dashboard/returns` render `DispatchReturnsView`: a `Segmented` switch over a `key`-remounted `ResourceView`, with `router.replace()` keeping the URL (and so the sidebar highlight and guide link) in sync. The Dispatch half passes `toolbar={<ScanLoadSheetButton />}`.",
      ] },
      { t: "p", text: "**Detail and manifest**: `dispatch` declares `rowHref`, so a row click opens `/dashboard/dispatch/[id]` (Edit / Delete remain in the row menu). Both that page and the printable manifest `/print/load-sheets/[id]` (A4, auto-prints, gated like the labels) load `getLoadSheetDetail()` in `src/lib/load-sheet-detail.ts`: `getLoadSheet()` + `findBySheet()` (orders whose `consignmentId` is in the sheet's `consignmentIds`, or whose `loadSheet` equals its reference, in attach order), with customer name / city / phone read live via `readOrderSummaries()` — one batched `nodes(ids:)` query per 100 orders. A Shopify failure still lists the parcels, without those fields. The page's stage buttons PATCH the full sheet through `/api/resources/dispatch/[id]` (same path as the drawer) and `router.refresh()`." },
      { t: "p", text: "The `#` column is the display-only `\"index\"` column type; Date Created / Date Posted use `\"datetime\"`. KPIs: Load sheets, Draft, Posted, Archived." },
    ],
  },

  // ==========================================================================
  {
    id: "return-load-sheets",
    title: "Return Load Sheets",
    category: "Logistics",
    everyday: [
      { t: "p", text: "**Return Load Sheets** is Dispatch's mirror image — instead of the parcels going out with a courier, it records the returns a courier hands back to you. Same fields, opposite direction: Draft while you're expecting it, Posted once the courier hands it over, Archived once it's settled." },
      { t: "ol", items: ["Open Logistics then Return Load Sheets.", "Click New load sheet and pick the courier and the location it's coming into.", "Fill in the shipment count, amounts, and weight.", "Set it to Posted once the courier has handed the returns over — this stamps Date Posted.", "When any COD owed on undelivered orders is settled, set Reconciliation to Reconciled.", "Archive old settled sheets."] },
      { t: "callout", tone: "info", title: "Filled in by hand", text: "Unlike outgoing sheets, return sheets aren't linked to orders or scanning — every figure is entered by hand." },
    ],
    technical: [
      { t: "p", text: "Keyed `return-load-sheets`; same `src/lib/dispatch.ts` module as `dispatch` with its own collection (`app_return_load_sheets`), counter id, and `RL` reference prefix. Same fields, tabs, and one-way `datePosted` stamp; no `consignmentIds`, no order linkage, no scanner." },
    ],
  },

  // ==========================================================================
  {
    id: "inbound",
    title: "Inbound",
    category: "Logistics",
    everyday: [
      { t: "p", text: "**Inbound** is everything on its way to you: purchase orders your suppliers haven't fully delivered, and transfers between your locations that haven't been fully received. It's sorted by due date, so the next delivery is at the top." },
      {
        t: "dl",
        items: [
          { term: "Document / From / To", def: "The PO or transfer, where it's coming from (supplier or location), and where it's going." },
          { term: "Carrier / Tracking", def: "As entered with **Shipping details** on the document." },
          { term: "Due / Timing", def: "The ETA, or the PO's expected-by date. **Overdue**, **Due today**, **Upcoming**, or **No date** — also the tabs." },
          { term: "Units to come", def: "Units not received yet." },
        ],
      },
      { t: "p", text: "Click a row to open the document and receive it." },
    ],
    technical: [
      { t: "p", text: "Keyed `inbound`; read-only. `listInbound()` in `src/lib/inventory-docs.ts` unions purchase orders and transfers in `OPEN_INBOUND_STATUSES` (`ordered`, `in_transit`, `partial`). `due` is `eta || expectedAt`, and `timing` compares it with today (UTC date). Rows are sorted by `due` (undated last), and `rowHref` goes to `/dashboard/[kind]/[docId]`." },
    ],
  },

  // ==========================================================================
  {
    id: "cod-remittances",
    title: "COD Reconciliation",
    category: "Logistics",
    everyday: [
      { t: "p", text: "Couriers collect cash on delivery (**COD**) from your customers and pay it over to you later. This page shows how much each courier has collected, how much they've paid, and what they still owe." },
      {
        t: "dl",
        items: [
          { term: "COD in the field", def: "Cash on parcels still out for delivery — not owed yet." },
          { term: "COD collected", def: "Cash on parcels marked delivered (or fulfilled) — the courier has it." },
          { term: "Remitted", def: "What you've recorded the courier paying you." },
          { term: "Outstanding", def: "Collected minus remitted: what the courier still owes. A negative figure usually means a payment was entered twice, or a delivered parcel wasn't marked delivered." },
        ],
      },
      { t: "ol", items: [
        "When a courier pays you, click **New remittance**.",
        "Pick the courier, enter the amount, the date, and the bank or cheque reference.",
        "Under **Settles load sheets**, tick the load sheets this payment covers — they're marked **COD reconciled** on the Dispatch page when you save.",
        "Check **Outstanding** in the Courier balances table regularly, and chase couriers who are behind.",
      ] },
    ],
    technical: [
      { t: "p", text: "The page is `CodView`: a balances table from `codByCourier(shipments, remittances)` (`src/config/logistics.ts`, computed client-side, so it matches the Shipments board) above a `ResourceView` of `cod-remittances`." },
      { t: "ul", items: [
        "`cod-remittances` is app-owned (`app_cod_remittances`): `courier` (`optionsFrom` shipments' distinct `courier`), `amount`, `receivedAt`, `reference`, `loadSheetIds` (multiselect over `dispatch`), `notes`.",
        "Create and update are special-cased in the resource routes: `validateRemittance()` requires a courier and an amount above 0, then `reconcileLoadSheets(loadSheetIds)` sets `reconciliation: reconciled` on those `app_dispatch_load_sheets`. Un-ticking a sheet later doesn't un-reconcile it.",
        "Collected counts `codAmount` (the Create Package snapshot) on `delivered`-stage shipments; in the field counts `in_transit`.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "courier-performance",
    title: "Courier Performance",
    category: "Logistics",
    everyday: [
      { t: "p", text: "**Courier Performance** scores each courier, and each destination city, on how reliably parcels get delivered. Use it to decide which courier to use where, and to spot cities with a lot of returns." },
      {
        t: "dl",
        items: [
          { term: "Delivery rate / RTO rate", def: "Of the parcels that finished — delivered or returned — the share that were delivered, or came back. Parcels still in transit aren't counted." },
          { term: "Avg. days", def: "Average days from dispatch to delivery." },
          { term: "Stuck", def: "Parcels in transit for more than 5 days." },
          { term: "COD collected", def: "Cash on the parcels it delivered." },
        ],
      },
      { t: "callout", tone: "info", title: "Only as good as the tracking", text: "These figures come from the **Shipments** board, so keep marking parcels delivered or returned there. Parcels nobody marks stay In transit and eventually show as Stuck." },
    ],
    technical: [
      { t: "p", text: "`CourierPerformanceView` reads `useResource(\"shipments\")` and calls `performanceBy(rows, groupBy)` (`src/config/logistics.ts`) three times: overall, by `courier`, by `city`. Only `in_transit` / `delivered` / `returned` stages count. Rates are over `delivered + returned`; `avgDeliveryDays` averages `deliveryDays` where known. RTO rates of 20% or more are highlighted. Nav-only page (no resource config)." },
    ],
  },

  // ==========================================================================
  {
    id: "leads",
    title: "Leads",
    category: "Sales",
    everyday: [
      { t: "p", text: "**Leads** tracks prospective wholesale or business buyers before they become customers — who they are, how they found you, who's following up, and how far along the conversation is." },
      {
        t: "dl",
        items: [
          { term: "Lead / Company", def: "The contact and their business." },
          { term: "Email / Phone", def: "How to reach them." },
          { term: "Source", def: "Website, WhatsApp, Referral, Social, Walk-in, or Other." },
          { term: "Status", def: "**New → Contacted → Qualified → Converted**, or **Lost** — also the tab." },
          { term: "Assigned To", def: "Who owns the follow-up." },
        ],
      },
      { t: "ol", items: ["Open Sales then Leads.", "Click New and fill in the contact and how they reached you.", "Assign someone to follow up.", "Move it through Contacted and Qualified as the conversation goes.", "Mark it Converted once they order, or Lost if it goes nowhere."] },
      { t: "callout", tone: "warning", title: "Converting doesn't create anything", text: "Marking a lead Converted doesn't create a Shopify customer or order — add those yourself." },
    ],
    technical: [
      { t: "p", text: "Keyed `leads`; app-owned in MongoDB (`app_leads`) via `src/lib/app-data.ts`. Search covers `name`, `company`, `email`. `source` and `status` are independent status fields; `status` drives `tabs`. KPIs: Leads, New, Qualified, Converted." },
      { t: "callout", tone: "info", title: "A standard CRM shape", text: "The field set is a conventional lead pipeline rather than a copy of a verified reference screen — adjust it in `src/config/resources.ts` if your process differs." },
    ],
  },

  // ==========================================================================
  {
    id: "transactions",
    title: "Transactions",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Transactions** page is the money trail behind your orders — every payment taken and every refund given, as recorded by Shopify. Where Orders tells you what was sold, Transactions tells you what money actually moved. It's view-only." },
      {
        t: "dl",
        items: [
          { term: "Reference / Order", def: "The payment provider's reference, and the order it belongs to." },
          { term: "Amount", def: "How much money moved." },
          { term: "Kind", def: "**Sale** (money in) or **Refund** (money back to the customer)." },
          { term: "Gateway", def: "How it was paid — the payment method Shopify recorded." },
          { term: "Date", def: "When it was processed." },
        ],
      },
      { t: "ol", items: ["Open Sales then Transactions.", "Search by reference, order number, or gateway.", "Use the Kind column to separate sales from refunds.", "Match a transaction to its order with the order number."] },
      { t: "callout", tone: "info", title: "Completed money only", text: "This page lists payments and refunds that actually went through, so every row shows **Success**. Failed or pending card attempts aren't listed — check the order's own page for those." },
    ],
    technical: [
      { t: "p", text: "Keyed `transactions`; Shopify-backed, **read-only**. `readTransactions()` reads `tenderTransactions` (first 100): `remoteReference` → `ref` (or a generated `txn_<id>`), `order.name`, `amount` (absolute value; a negative amount means `kind: refund`, else `sale`), `paymentMethod` → `gateway`, `processedAt`. `status` is always `success` — tender transactions are settled money only; authorizations and failed attempts don't appear (they're on each order's detail timeline)." },
      { t: "p", text: "KPIs: Gross volume (`sum(amount)` of sales), Refunds, Net (sales minus refunds), Success rate (always 100% for this source)." },
    ],
  },

  // ==========================================================================
  {
    id: "abandoned",
    title: "Abandoned checkouts",
    category: "Sales",
    everyday: [
      { t: "p", text: "An **Abandoned checkout** is a cart a shopper took to checkout but didn't pay for. This page lists them from Shopify so you can see what almost sold. It's view-only." },
      {
        t: "dl",
        items: [
          { term: "Customer", def: "The shopper's email, if they entered one." },
          { term: "Cart value / Items", def: "What the cart was worth and how many items were in it." },
          { term: "Abandoned", def: "When they left." },
        ],
      },
      { t: "ol", items: ["Open Sales then Abandoned Checkouts.", "Sort by Cart value to see the biggest missed sales.", "Follow up with the shopper from Shopify admin, which can send a recovery email with a link back to their cart."] },
      { t: "callout", tone: "warning", title: "Recovery isn't tracked here yet", text: "The **Recovery** column always reads Not contacted and can't be changed, so the Recovered and Recovery rate cards stay at zero. Shopify's own abandoned-checkout screen shows whether a recovery email went out." },
    ],
    technical: [
      { t: "p", text: "Keyed `abandoned`; Shopify-backed, **read-only**. `readAbandoned()` reads `abandonedCheckouts` (first 50): `customer.email` (or `unknown`), `totalPriceSet`, `lineItemsQuantity`, `createdAt`. `stage` is always `none` — recovery state isn't read from Shopify or stored app-side." },
      { t: "p", text: "KPIs: Abandoned carts, Potential revenue (`sum(total)`), Recovered and Recovery rate (both 0 until `stage` is sourced). Needs `read_checkouts`." },
    ],
  },

  // ==========================================================================
  {
    id: "pos",
    title: "POS overview",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "**Point of Sale** (POS) is selling face to face in your physical shops. You sell from the **Till**; the **POS Overview** page summarises it: sales and cash taken today, which registers are in use and what each has sold today, your locations, and the latest in-store sales. **Open till** at the top takes you straight to selling." },
      {
        t: "dl",
        items: [
          { term: "Till", def: "The selling screen — scan, take payment, print the receipt. See **Till**." },
          { term: "Registers", def: "Each till, and the store whose stock it sells." },
          { term: "POS Staff", def: "The people who sell in person; their PIN signs them in at the till." },
          { term: "Locations", def: "Your Shopify locations (stores and warehouses)." },
        ],
      },
      { t: "callout", tone: "info", title: "In-store sales land in Orders", text: "Every till sale is a real Shopify order — paid, already handed over, stock taken off that store. It shows in **Orders** under the **POS sale** tab with a **POS** marker, and never enters the shipping workflow (no packaging, consignment, or label). Sales made on Shopify's own POS app land there too." },
    ],
    technical: [
      { t: "p", text: "`PosView` (`src/components/dashboard/pos-view.tsx`) computes from POS orders (`channel === \"pos\"`, via `isPosOrder()`): sales and cash (gateway matching /cash/) for today by `placedAt` in the browser's local day, per-register sales from the `register:<name>` tag, plus `registers`, `locations`, and `pos-staff`." },
    ],
  },

  // ==========================================================================
  {
    id: "pos-till",
    title: "Till",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "The **Till** is where you sell in person. Each sale becomes an order in Shopify, already paid and handed over, with the stock taken off the store the till belongs to." },
      { t: "ol", items: [
        "**Pick the register** the first time on a device — the till remembers it. (Add registers on the Registers page first, each with the store it sells from.)",
        "**Sign in with your PIN** (from POS Staff). Use **Switch cashier** when someone else takes over — every sale records who made it.",
        "**Add items**: scan a barcode, or type a SKU and press Enter, or search by name and tap the product. Each tile shows how many are in stock at this store.",
        "In the cart, change quantities with − / +, give an item a **Discount** (% or an amount), or put a **Sale discount** on the whole cart.",
        "Optionally **add a customer** — search by name, phone, or email, or add a new one. Leave it as walk-in otherwise.",
        "Press **Charge**, pick how they paid: **Cash** (type what they handed you, or tap a quick amount — the till shows the change), **Card**, **JazzCash**, **EasyPaisa**, or **Bank transfer** (add the slip or transaction reference).",
        "**Complete sale**, then **Print receipt** (80mm thermal printer) and **New sale**.",
      ] },
      { t: "h", text: "Returns and exchanges" },
      { t: "ol", items: [
        "Switch the till to **Return** and enter the receipt's order number (e.g. PF1032K).",
        "Enter how many of each item are coming back.",
        "**Refund** gives the money back — pick how you're handing it back (cash, card, wallet). **Exchange for other items** gives no money back; instead the value becomes a credit on the next sale, and the till switches to Sale with the credit applied.",
        "Returned items go straight back into this store's stock.",
      ] },
      { t: "callout", tone: "warning", title: "Exchange credit isn't paid out", text: "If the replacement items cost less than the credit, the difference isn't refunded — the till warns you. Do a normal refund for the difference instead." },
      { t: "callout", tone: "info", title: "Prices come from Shopify", text: "The till always charges Shopify's current price; only quantities and the discounts you enter come from the till. Selling an item whose stock shows 0 is allowed (you have it in hand) and the till just warns you." },
    ],
    technical: [
      { t: "p", text: "`/dashboard/pos/till` renders `PosTill` (`src/components/dashboard/pos-till.tsx`). The register id is kept per device in `localStorage` (`suedebucks:pos-register`); the cashier's PIN only lives in memory and is re-verified on every sale and return. Money is computed by `computeCart()` (`src/config/pos.ts`), shared by the till and the server so both agree to the cent." },
      { t: "ul", items: [
        "`POST /api/pos/cashier` → `verifyCashier(pin)` (active, non-suspended `pos-staff` with that PIN; duplicate PINs are refused). `GET /api/pos/catalog?registerId=` → `readCatalog(locationId)`: active product variants (100 per page, up to 3,000) with `price`, `sku`, `barcode`, and `inventoryLevel(locationId).available`. `GET /api/pos/customers?q=` searches Shopify customers.",
        "`POST /api/pos/sale` → `createSale()`: re-reads variant prices from Shopify, folds line discounts into each unit price (`properties` record the original price and discount), and sends cart discount + exchange credit as one `itemFixedDiscountCode`. It calls `orderCreate` with `financialStatus: PAID`, one `SALE` transaction on the method's gateway, `fulfillmentStatus: FULFILLED` + `fulfillment.locationId` (stock leaves that location; `inventoryBehaviour: DECREMENT_IGNORING_POLICY`), tags `pos`, `register:<name>`, `cashier:<name>`, and `customAttributes` (`POS_ATTR`: register, location, cashier, payment, reference, cash tendered, change, discount, exchange). The customer is `toAssociate` (existing) or `toUpsert` (new).",
        "Returns: `GET /api/pos/sale-lookup?number=` (`orders(query: \"name:…\")`, with `refundableQuantity` per line); `POST /api/pos/return` → `createReturn()` asks `order.suggestedRefund` for the exact amount and parent transaction, then `refundCreate` with `restockType: RETURN` at the register's location. **Refund** sends the suggested transactions; **exchange** sends none and returns the amount as credit for the next sale.",
        "Orders integration: `isPosOrder(sourceName, tags)` marks `channel: pos` and `shippingType: pos`; `attachOrderOps()` defaults those orders to the `pos` stage (tab **POS sale**), and the `orders/create` webhook skips them. `/print/receipt/[id]` renders an 80mm receipt from `readOrderDetail()` (now with `attributes`); POS orders get **Print receipt** and a **POS sale** card on their page.",
        "Requires `write_orders`, `read_customers` / `write_customers`, `read_inventory`, `read_products`.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "registers",
    title: "Registers",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "A **Register** is a till, and the store whose stock it sells. The Till asks for a register the first time on each device." },
      {
        t: "dl",
        items: [
          { term: "Register", def: "A name for the till, like Front counter, with the store it sells from underneath." },
          { term: "Sells from", def: "The Shopify location whose stock goes down when this till sells, and where returned items go back." },
          { term: "Status", def: "**In use** or **Switched off** (a switched-off register can't be picked at the till)." },
        ],
      },
      { t: "ol", items: ["Open Point of Sale then Registers.", "Click New register, name it, pick the store it sells from, and save.", "On the device at that counter, open the Till and pick this register."] },
    ],
    technical: [
      { t: "p", text: "Keyed `registers`; app-owned in MongoDB (`app_registers`). Create and update go through `prepareRegister()` (`src/lib/pos.ts`), which requires `name` and `locationId` (`optionsFrom: locations`) and stores the location's `location` name next to it. `getRegister()` refuses inactive registers and ones with no `locationId` (older registers made before the till existed need one set). KPIs: Registers, In use, Stores covered, Need a store." },
    ],
  },

  // ==========================================================================
  {
    id: "pos-staff",
    title: "POS staff",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "**POS Staff** are the people who sell in your physical shops. Their **PIN** signs them in at the **Till**, and every sale and return records who made it." },
      {
        t: "dl",
        items: [
          { term: "Staff / Email", def: "Who they are and how to reach them." },
          { term: "Role", def: "**Manager**, **Associate**, or **Cashier** — a label; everyone with a PIN can sell and do returns." },
          { term: "Location", def: "Which shop they usually work at." },
          { term: "PIN", def: "4–8 digits, unique to them — what they type at the till." },
          { term: "Status", def: "**Active**, or **Suspended** — a suspended person's PIN stops working at the till." },
        ],
      },
      { t: "ol", items: ["Open Point of Sale then POS Staff.", "Click New to add someone, with a unique PIN.", "Suspend someone instead of deleting them if they're away — their past sales keep their name."] },
      { t: "callout", tone: "warning", title: "Keep PINs unique and private", text: "Two active people with the same PIN can't sign in until one is changed. PINs are stored as plain text in this app, so don't reuse bank or phone PINs. The till itself still needs the dashboard login once on each device." },
    ],
    technical: [
      { t: "p", text: "Keyed `pos-staff`; app-owned in MongoDB (`app_pos_staff`). `verifyCashier(pin)` (`src/lib/pos.ts`) matches `pin` among staff whose `status` isn't `suspended` / `inactive`, refusing a PIN that matches more than one. The cashier's `name` is written to each sale's `cashier:<name>` tag and `POS cashier` attribute (a snapshot — renaming later doesn't rewrite past sales). Roles aren't enforced." },
      { t: "p", text: "KPIs: Staff, Active, Managers, Locations covered (distinct `location`)." },
    ],
  },

  // ==========================================================================
  {
    id: "locations",
    title: "Locations",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "**Locations** lists the places set up in your Shopify store — shops and warehouses — with their address and whether they're active. It's view-only; add or change locations in Shopify admin." },
      {
        t: "dl",
        items: [
          { term: "Location", def: "Its name, with the street address underneath." },
          { term: "Type", def: "**Retail** if it fulfils online orders in Shopify, otherwise **Warehouse**." },
          { term: "Status", def: "**Active** or **Inactive** in Shopify." },
        ],
      },
      { t: "callout", tone: "info", title: "Used by stock adjustments", text: "The **Facility** list on a stock adjustment comes from these locations." },
      { t: "callout", tone: "warning", title: "Inventory value isn't filled in", text: "The **Inventory value** column always shows zero for now." },
    ],
    technical: [
      { t: "p", text: "Keyed `locations`; Shopify-backed, **read-only** (no writer — deleting a location would strand inventory). `readLocations()` reads `locations` (first 50): `name`, `isActive` → `status`, `address.address1/city/country`, and `type` = `retail` when `fulfillsOnlineOrders`, else `warehouse` (a heuristic; `popup` never comes from Shopify). `inventoryValue` is `0` — not computed." },
      { t: "p", text: "KPIs: Locations, Active, Retail, Warehouses. Rows feed `optionsFrom` for the stock-adjustment `facilityId` field." },
    ],
  },

  // ==========================================================================
  {
    id: "settings",
    title: "Settings",
    category: "System",
    everyday: [
      { t: "p", text: "**Settings** shows the account you're signed in with, the format used for generated consignment IDs, and a few display preferences." },
      {
        t: "dl",
        items: [
          { term: "Account", def: "The admin account signed in right now." },
          { term: "Currency", def: "Which currency symbol and format amounts are shown in. It only changes how figures look — it doesn't convert them — so pick your store's own currency (e.g. PKR). Remembered in this browser." },
          { term: "Consignment IDs", def: "The format of the consignment ID generated when an order is assigned a consignment. Pick one from the **Schema** list — the example underneath shows what an ID will look like — and press **Save schema**. The default is `FKHIT<order-city>V<courier-name>A<ms-since-epoch>`, e.g. FKHITKARACHIVINSTAA1790000000000. It applies to the whole store from the next assignment on; IDs already assigned don't change." },
          { term: "Dashboard view", def: "**New** shows every page in the sidebar. **Legacy** shows a shorter list: Dashboard, Analytics, Customers, Products, Inventory, Stock Adjustments, Orders, Draft Orders, Returns, Dispatch, Return Load Sheets, Leads, Settings, Integrations, and Guide. Remembered in this browser." },
          { term: "Integrations", def: "A shortcut to the Shopify connection page." },
        ],
      },
      { t: "callout", tone: "warning", title: "Store details and notifications aren't saved yet", text: "The **Store details** fields (name, email, phone, timezone, address) and the **Notifications** switches are placeholders — Save changes doesn't store them, and no notification emails are sent. Your store's real details live in Shopify admin." },
      { t: "callout", tone: "info", title: "Legacy hides pages, it doesn't lock them", text: "Legacy only tidies the sidebar. A hidden page still opens from its address or a bookmark." },
      { t: "callout", tone: "warning", title: "One login runs this dashboard", text: "There is a single administrator account. Anyone with it can see and change everything, so keep it private and log out on shared computers (account menu, top right). A login lasts seven days." },
    ],
    technical: [
      { t: "p", text: "`SettingsView` (`src/components/dashboard/settings-view.tsx`). The **consignment ID schema** is the one server-side setting: `readAppSettings()` / `writeAppSettings()` in `src/lib/app-settings.ts` (MongoDB `app_settings`, `_id: \"config\"`, else `.data/settings.json`), saved by `saveConsignmentTemplateAction()` (`src/lib/settings-actions.ts`), which only accepts a member of `CONSIGNMENT_TEMPLATES`. An unknown stored value reads back as the default. Tokens (`<order-city>`, `<courier-name>`, `<order-number>`, `<ms-since-epoch>`) are filled by `renderConsignmentId()`, with values reduced to `[A-Z0-9]`. Two more settings persist client-side in `localStorage`: currency (`src/lib/currency.ts`, key `suedebucks:currency`, format-only via `formatCurrency`) and dashboard view (`src/lib/dashboard-view.ts`, key `suedebucks:dashboard-view`). Store details and notification toggles are uncontrolled or local state with no backend." },
      { t: "ul", items: [
        "In `legacy` mode the sidebar filters each nav category to `LEGACY_VISIBLE_HREFS` and drops empty categories (Point of Sale disappears). Routes, APIs, and guide slugs are untouched.",
        "Auth: `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars, `sb_session` HMAC cookie (7 days, `SESSION_SECRET`), `src/proxy.ts` guarding `/dashboard/*`, `/print/*`, `/scan/*`. Logout (`logoutAction`) deletes the cookie. There is no refresh — an expired session just means signing in again.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "integrations",
    title: "Integrations",
    category: "System",
    everyday: [
      { t: "p", text: "The **Integrations** page connects SuedeBucks to your **Shopify** store — until it's connected, every Shopify page is empty. It's also where you check the app's Shopify permissions and switch on automatic order checking." },
      { t: "p", text: "To connect you need your store's address plus a **Client ID** and **Client Secret** — an ID-and-password pair belonging to an app you create once in Shopify's developer dashboard. SuedeBucks uses that pair to fetch short-lived keys automatically, so there's no permanent master key to lose." },
      {
        t: "ol",
        items: [
          "Go to the **Shopify Dev Dashboard** (dev.shopify.com), sign in with the account that owns the Peirama store, and create an app for SuedeBucks.",
          "Open Integrations here and press **Copy full list** under Scopes to grant the app. Paste the list into the app's access scopes in the Dev Dashboard, release the version, and install the app on your store.",
          "Copy the app's **Client ID** and **Client Secret**.",
          "Back here, keep the method on **Client credentials**, enter your yourstore.myshopify.com address, paste the ID and Secret, and press **Connect Shopify**. The page tests the connection straight away.",
          "Enter the app's public web address and press **Register webhook**, so new orders are checked and filed into the right Orders tab automatically.",
        ],
      },
      { t: "h", text: "Keeping permissions up to date" },
      { t: "p", text: "Once connected, the page compares the permissions (**scopes**) the app actually has with the ones SuedeBucks needs. Any that are missing are highlighted in red, with a **Copy missing** button. New features sometimes need new scopes — for example **Mark fulfilled** for manual-courier orders needs `read_merchant_managed_fulfillment_orders` and `write_merchant_managed_fulfillment_orders`." },
      { t: "ol", items: ["Press **Copy missing** (or **Copy full list**).", "In the Dev Dashboard, open the app's configuration, paste the scopes into its access scopes, and release a new version.", "Reinstall or update the app on your store so the new permissions are granted.", "Reload Integrations — the red scopes should be gone.", "Retry the action. SuedeBucks automatically fetches a fresh Shopify key when it sees **Access denied**, so you don't need to reconnect. If the error persists, the new version hasn't been installed on the store yet."] },
      {
        t: "dl",
        items: [
          { term: "Store domain", def: "Your technical Shopify address ending in .myshopify.com — not your public website address." },
          { term: "Client ID / Client Secret", def: "The app's identity and password. Treat the Secret like a password." },
          { term: "Legacy admin token", def: "The old method — a permanent shpat_ key. Only for stores that still have one. It can't register the order webhook." },
          { term: "Test connection", def: "Re-checks that the address and credentials work; the Shopify dot in the bottom bar shows the result." },
          { term: "Register webhook", def: "Tells Shopify to send every new order to SuedeBucks for the address check. Needs the public https:// address — Shopify can't reach localhost." },
          { term: "Disconnect", def: "Deletes the stored credentials from SuedeBucks. Your Shopify store is untouched." },
        ],
      },
      { t: "callout", tone: "warning", title: "This app is not approved to access the Order object", text: "If Orders or Customers show this error even with a working connection, it isn't a scope problem — it's Shopify's separate **Protected Customer Data** approval for names, emails, phones, and addresses. Request it in the **Partner Dashboard** (Apps → your app → API access → Protected customer data access). For a single-store custom app it's usually approved within a day." },
    ],
    technical: [
      { t: "p", text: "`/dashboard/integrations` manages the Shopify connection against the **Admin GraphQL API** (`https://{store}.myshopify.com/admin/api/{version}/graphql.json`, default version `2026-01`)." },
      {
        t: "ul",
        items: [
          "Auth is the OAuth **client credentials grant**: `POST /admin/oauth/access_token` with `grant_type: client_credentials`. `resolveAccessToken()` caches the short-lived token with a 60s margin and re-mints on demand. A token keeps the scopes it was minted with, so when `shopifyQuery()` gets a GraphQL `Access denied` on a *cached* token it drops the cache, mints a fresh token, persists it, and retries once (a still-denied retry means the installation itself lacks the scope); a `legacy admin_token` method remains for permanent `shpat_` keys.",
          "Config persists to the MongoDB `integrations` collection when `MONGODB_URI` is set, else `.data/integrations.json`. `toView()` masks secrets before anything reaches the client.",
          "Server actions in `src/lib/integration-actions.ts`: `connectShopifyAction`, `testShopifyAction` (a `{ shop { name currencyCode } }` probe that updates `lastCheck`), `disconnectShopifyAction`, `registerOrderWebhookAction`.",
          "**Scopes**: `SHOPIFY_SCOPES_REQUIRED` in `src/lib/shopify-scopes.ts` is the single list. The page server-renders `readGrantedScopes()` (`currentAppInstallation.accessScopes`, `src/lib/shopify-client.ts`) and `ScopesPanel` highlights required scopes missing from the grant, with copy-missing / copy-all buttons. `null` (lookup failed) hides the comparison.",
          "**Order webhook**: `registerOrderWebhookAction(baseUrl)` rejects non-HTTPS and localhost origins, reuses an existing `ORDERS_CREATE` subscription to `<origin>/api/webhooks/orders-create`, else calls `webhookSubscriptionCreate(topic: ORDERS_CREATE, webhookSubscription: { uri })`. Deliveries are HMAC-verified with the stored `clientSecret`, so it requires client credentials.",
        ],
      },
      {
        t: "ul",
        items: [
          "The three mandatory GDPR webhooks live at `src/app/api/webhooks/{customers-data-request,customers-redact,shop-redact}/route.ts`, backed by `src/lib/shopify-webhooks.ts`. Each reads the raw body and verifies `x-shopify-hmac-sha256` (`verifyShopifyWebhook()`, `timingSafeEqual`) before parsing.",
          "The app stores no customer PII. `customers/data_request` acknowledges; `customers/redact` removes the customer's id from every segment's `customerIds`; `shop/redact` clears every app-owned collection (segments, registers, POS staff, returns, leads, stock adjustments, both load-sheet collections, `app_order_ops`, and the retired `app_packages` / `app_shipments`).",
        ],
      },
    ],
    deep: [
      {
        title: "Client credentials vs. the old token — what changed",
        everyday: [
          { t: "p", text: "It used to work like a house key: Shopify handed you one permanent key and you gave it to trusted software. If it leaked, it worked forever. The new way works like a hotel: SuedeBucks shows its ID at the desk (the Client ID and Secret) and gets a room key that expires on its own. Lose a room key and it stops working by itself." },
        ],
        technical: [
          { t: "p", text: "Shopify retired admin-created custom apps and their permanent offline tokens. Apps now live in the **Dev Dashboard** and authenticate with OAuth grants; for a single-merchant backend the client credentials grant fits — no redirect, no callback URL. Tokens are cached in the integration record (`cachedToken.expiresAt`) and re-minted lazily after expiry; `resolveAccessToken()` is the one seam to change if SuedeBucks is ever distributed to many merchants (authorization-code install flow)." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "glossary",
    title: "Glossary",
    category: "Reference",
    everyday: [
      { t: "p", text: "Plain-language definitions of the terms used across the dashboard." },
      {
        t: "dl",
        items: [
          { term: "SuedeBucks vs. Peirama", def: "SuedeBucks is the software; Peirama is the store it's set up for." },
          { term: "SKU", def: "Stock Keeping Unit — your code for one exact product, used to track stock." },
          { term: "Product vs. variant", def: "A product is an item (a fragrance); a variant is a version of it (50ml, 100ml). Inventory lists variants; Products edits the first variant." },
          { term: "Collection", def: "A curated, themed group of products, like a Summer edit." },
          { term: "Category", def: "A product's type in Shopify (Eau de Parfum, Extrait)." },
          { term: "Segment", def: "A named group of customers you pick by hand." },
          { term: "Stock adjustment", def: "A recorded, reasoned change to stock (damage, stocktake, stock received) that updates Shopify when completed." },
          { term: "Order stage", def: "Where an order is in your own workflow — the Orders tabs (Exception, Active, Packaged, …), separate from Shopify's payment and fulfilment status." },
          { term: "Exception", def: "An order whose shipping address looked wrong when it arrived, waiting to be fixed." },
          { term: "Pending CC", def: "An order paid by bank deposit, waiting for the deposit to clear." },
          { term: "Consignment ID", def: "The courier's tracking reference for one parcel — printed on the label and inside its QR code." },
          { term: "Shipping label", def: "The printed sticker for a parcel: QR code, consignment ID, customer name, address, phone, and cash to collect." },
          { term: "Load sheet", def: "The handover list for a courier's pickup batch: every consignment, the parcel count, and the COD to collect." },
          { term: "COD", def: "Cash on delivery — money the rider collects from the customer and later pays back to you." },
          { term: "Reconciliation", def: "Confirming the courier has paid you the COD from a load sheet." },
          { term: "Manual courier", def: "The in-house Karachi courier. No booking system: its consignment IDs are generated here, and you mark its deliveries fulfilled yourself." },
          { term: "Fulfillment", def: "Shopify's record that an order has been shipped: fulfilled, partial, or unfulfilled." },
          { term: "Draft order", def: "An order created by hand before payment." },
          { term: "Abandoned checkout", def: "A cart taken to checkout but not paid for." },
          { term: "Transaction", def: "One movement of money — a payment or a refund." },
          { term: "Gateway", def: "How a payment was taken, such as PayFast, bank deposit, or cash on delivery." },
          { term: "POS", def: "Point of Sale — selling in person at a physical shop." },
          { term: "Register / Cash float", def: "A till, and the starting cash put in its drawer." },
          { term: "Scope", def: "A permission the Shopify app has been granted, like read_orders." },
          { term: "Webhook", def: "A message Shopify sends to SuedeBucks the moment something happens, like a new order." },
          { term: "KPI", def: "Key Performance Indicator — the headline numbers in the stat cards." },
        ],
      },
      { t: "callout", tone: "info", title: "Two lookalike pairs to remember", text: "**Order stage vs. Fulfillment**: your workflow tab vs. Shopify's shipping record. **Collection vs. Category**: curated marketing group vs. the product's type." },
    ],
    technical: [
      { t: "p", text: "Literal values stored on rows, by resource." },
      {
        t: "dl",
        items: [
          { term: "orders.opsStatus", def: "`exception`, `pending_cc`, `active`, `packaged`, `booking_failed`, `finalized`, `in_pickup_packing`, `dispatched`, `fulfilled`, `delivered`, `returned`, `canceled`, `draft`, `duplicate`, `on_hold` (`ORDER_STATUS_OPTIONS`). Default `active`." },
          { term: "orders.payment / fulfillment / channel", def: "`paid` / `pending` / `refunded`; `fulfilled` / `partial` / `unfulfilled`; `online` / `pos`." },
          { term: "OrderAction", def: "`modify`, `move_active`, `move_exception`, `discard`, `create_package`, `unpackage`, `assign_consignment`, `print_label`, `dispatch`, `add_to_load_sheet`, `mark_fulfilled`, `mark_delivered`, `mark_returned`, `remove_from_sheet`, `move_to_sheet`, `cancel` — allowed-from table in `ACTION_FROM`." },
          { term: "products.status", def: "`active`, `draft`, `archived`." },
          { term: "customers.status", def: "`active`, `invited`, `disabled` (mapped from Shopify `state`)." },
          { term: "inventory.status", def: "`in_stock`, `low` (≤ 5), `out` (≤ 0) — derived." },
          { term: "discounts.type / status", def: "`percentage`, `fixed`, `bogo`, `shipping`; Shopify's `active`, `scheduled`, `expired`." },
          { term: "stock-adjustments.status", def: "`parked` or `completed` (immutable)." },
          { term: "dispatch / return-load-sheets", def: "`status`: `draft`, `posted`, `archived`; `reconciliation`: `pending`, `reconciled`; references `LS###` / `RL###`." },
          { term: "returns.status", def: "`requested`, `approved`, `in_transit`, `received`, `refunded`, `rejected`." },
          { term: "leads.status", def: "`new`, `contacted`, `qualified`, `converted`, `lost`." },
          { term: "transactions.kind", def: "`sale` or `refund` (from the tender amount's sign); `status` always `success`." },
          { term: "sb_session", def: "The signed HMAC auth cookie (7 days) checked by `src/proxy.ts`." },
          { term: "app_order_ops", def: "MongoDB collection for the order workflow overlay, keyed by Shopify order id." },
        ],
      },
    ],
  },
];
