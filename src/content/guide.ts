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
      { t: "p", text: "The left sidebar groups everything into six areas:" },
      {
        t: "dl",
        items: [
          { term: "Overview", def: "The **Dashboard** (your store at a glance) and **Analytics** (revenue trend, channels, top customers)." },
          { term: "Relations", def: "The people side: **Customers**, **Segments** (groups of customers), and **Discounts**." },
          { term: "Catalog", def: "What you sell: **Products**, **Collections**, **Inventory**, **Stock Adjustments**, and **Categories**." },
          { term: "Sales", def: "Orders and everything after the sale: **Orders**, **Draft Orders**, **Returns**, **Dispatch** (courier load sheets), **Return Load Sheets**, **Leads**, **Transactions**, and **Abandoned Checkouts**." },
          { term: "Point of Sale", def: "Selling in person: **POS Overview**, **Registers**, **Locations**, and **POS Staff**." },
          { term: "System", def: "**Settings**, **Integrations** (the Shopify connection), and this **Guide**." },
        ],
      },
      { t: "h", text: "Where the data comes from" },
      { t: "p", text: "Most pages show your **Shopify** store live — products, customers, orders, discounts, collections, inventory, transactions, abandoned checkouts, and locations are read straight from Shopify every time you open them, and many of them can be edited here too. A few things Shopify has no place for are kept in this app's own database instead: order workflow stages, load sheets, stock adjustment documents, returns, leads, segments, registers, and POS staff." },
      { t: "callout", tone: "info", title: "Nothing is made up", text: "If Shopify isn't connected, or the database isn't reachable, the affected pages are simply **empty** with a message explaining why — the app never fills in sample or placeholder data." },
      { t: "h", text: "How every page works" },
      { t: "p", text: "Almost every page is built the same way, so once you know one you know them all:" },
      {
        t: "ol",
        items: [
          "Four **stat cards** at the top show the headline numbers. A small percentage badge, where shown, compares the last 30 days with the 30 days before.",
          "Some pages have **tabs** above the table (All, plus one per stage) to show one stage at a time.",
          "Use the **search box** in the top bar to find rows, and click a column heading to sort.",
          "Click **New** to add a record, or click a row to edit it in the drawer that slides in from the right. Pages that are view-only say so under their title.",
          "Tick the boxes on the left of rows to act on several at once — a bar appears pinned to the bottom of the screen. Its **⋯** button holds the bulk actions: move them to another stage, or delete them.",
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
      { t: "h", text: "The resource engine" },
      { t: "p", text: "Almost every page is `src/app/dashboard/[resource]/page.tsx` + `src/components/dashboard/resource-view.tsx`, rendered purely from its entry in `RESOURCES` (`src/config/resources.ts`): columns, drawer fields, KPI `stats`, `searchKeys`, optional `tabs`, `rowLocked`, `rowHref`, and a `guide` slug. `ResourceView` also takes two optional props — `toolbar` (extra buttons by the tabs) and `selectionBar` (replaces the generic bulk bar) — used by Orders and Dispatch. Both the generic bulk bar (Move to / Delete behind a `MoreHorizontal` menu) and the orders control panel render inside `SelectionDock` (`src/components/dashboard/selection-dock.tsx`): `fixed` at `bottom-10`, offset past the sidebar via the shell's `--content-left` CSS variable, with an in-flow spacer so it never covers the last rows. Literal routes override the dynamic one where a page needs more: `/dashboard/orders`, `/dashboard/dispatch`, `/dashboard/returns`." },
      { t: "p", text: "Responsive behaviour: below `lg` the sidebar is an off-canvas drawer (hamburger in the top bar); below `sm` the top-bar search becomes a toggle that opens a search row under the header. `ResourceView` renders `tabs` on their own `overflow-x-auto` row (the `Segmented` buttons are `shrink-0 whitespace-nowrap`), tables scroll inside their card (`Table` wraps in `overflow-x-auto`), the orders control panel puts its actions in one scrolling row below `sm`, the bottom bar drops the wordmark below `sm`, and the guide swaps its side TOC for a `<select>` below `lg`." },
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
    category: "Catalog",
    everyday: [
      { t: "p", text: "The **Inventory** page shows how many units you have of every product variant (every size or version), with its SKU and a stock status. It's view-only — stock changes go through **Stock Adjustments**." },
      {
        t: "dl",
        items: [
          { term: "Item / SKU", def: "The product, plus the variant name if it has one, and its SKU." },
          { term: "Location", def: "Shown as All locations — the figure is the total across every location." },
          { term: "On hand / Available", def: "The variant's total stock in Shopify." },
          { term: "Status", def: "**Out of stock** at 0 or below, **Low stock** at 5 or fewer, otherwise **In stock**." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Inventory.", "Search by item or SKU.", "Check the Low stock and Out of stock cards for what needs reordering.", "To correct a count, record damage, or book in a delivery, go to **Stock Adjustments**."] },
      { t: "callout", tone: "info", title: "Totals, not per-location", text: "This page shows each variant's total across all locations. Per-location stock lives in Shopify admin; a stock adjustment still applies to one specific location." },
    ],
    technical: [
      { t: "p", text: "Keyed `inventory`; Shopify-backed and **read-only** (no writer). `readInventory()` reads `productVariants` (first 100): `inventoryQuantity` → `onHand` and `available`, `sku`, product + variant title → `name` (variant omitted when `Default Title`), and `inventoryItem.id` → `inventoryItemId` (used by the stock-adjustment item picker)." },
      { t: "ul", items: [
        "`location` is the constant `All locations`; `committed` and `reorderPoint` are `0` — per-location `inventoryLevels` aren't read.",
        "`status` is derived: `out` if `onHand <= 0`, `low` if `<= 5`, else `in_stock`.",
        "KPIs: SKUs tracked, Units on hand, Low stock, Out of stock.",
      ] },
    ],
  },

  // ==========================================================================
  {
    id: "stock-adjustments",
    title: "Stock Adjustments",
    category: "Catalog",
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
      { t: "ol", items: ["Open Catalog then Stock Adjustments and click New stock adjustment.", "Pick the item and the facility — both lists come live from Shopify.", "Enter the signed quantity and the reason.", "Leave it Parked to save a draft, or set it Completed to apply the change now.", "To apply a parked draft later, open it and set it to Completed."] },
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
      ] },
      { t: "callout", tone: "info", title: "Modelled on Unleashed", text: "Mirrors the Unleashed Software adjustments screen: number, status, reason, facility, quantity, dates — with the same parked-to-completed lifecycle." },
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
      { t: "p", text: "The tabs above the table show the order's **stage** in that workflow: **Exception**, **Pending CC**, **Active**, **Packaged**, **Booking Failed**, **Finalized**, **In Pickup & Packing**, **Dispatched**, plus Fulfilled, Delivered, Returned, Canceled, Draft, Duplicate, and On Hold. The stage is separate from Shopify's own Payment and Fulfillment columns." },
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
          { term: "Dispatched", def: "**Add to load sheet** for any order not yet on one. For the **manual Karachi courier** only: **Mark fulfilled** once the rider has delivered it." },
        ],
      },
      { t: "callout", tone: "info", title: "Modify saves only when you confirm", text: "Modify opens a form with the shipping address and order note. As you type it shows whether the address still looks wrong. Nothing is saved until you press **Save changes** and confirm — then the change is written to the Shopify order." },
      { t: "callout", tone: "info", title: "Discard doesn't touch Shopify", text: "Discarding moves the order to **Canceled** here only. The Shopify order isn't cancelled or refunded — do that in Shopify if you need to." },
      { t: "p", text: "The panel stays pinned to the bottom of the screen. Its **⋯** button is always there, even when the ticked orders come from different tabs. Inside, **Move to** puts the orders straight into any tab you pick. It's a manual override, so nothing else happens: no Shopify tags, no consignment assigned, no load sheet. **Delete permanently** deletes the orders in Shopify." },
      { t: "callout", tone: "warning", title: "Delete can't be undone", text: "**Delete** removes the order from Shopify itself, along with its payment and fulfilment records. Shopify won't delete some orders (open, paid ones, for example) and shows why. If you only want an order off the workflow, use **Discard** or **Move to → Canceled** instead." },
      { t: "h", text: "Labels, scanning, and load sheets" },
      { t: "p", text: "**Print shipping label** opens the labels in a new tab, one per page, ready for a 4×6 label printer: the order number, courier, a **QR code**, the consignment ID, the customer's name, address, and phone, and the cash to collect (or PAID)." },
      { t: "callout", tone: "success", title: "Scan a label with your phone", text: "The QR code is a link to this app. Scan it with a phone camera (you'll be asked to sign in first if you aren't) and the order moves to its next stage by itself: **Finalized** → **In Pickup & Packing** → **Dispatched**, and for the manual courier a second scan on delivery → **Fulfilled**. The page shows the order number and the move it made." },
      { t: "callout", tone: "success", title: "Scan to dispatch", text: "The **Scan to dispatch** button next to the tabs opens a scanner box. Scan each printed label with a barcode scanner (or type the consignment ID and press Enter) and each order is dispatched on the spot." },
      { t: "callout", tone: "info", title: "Every dispatched parcel goes on a load sheet", text: "However an order is dispatched — the button, a scanner, or a phone — it's added to a courier **load sheet** (see **Dispatch**). By default that's the courier's open draft sheet, started automatically if there isn't one. The Dispatch button also lets you pick another draft sheet for that courier, or start a new one. The **Load sheet** column shows where each parcel went." },
      { t: "callout", tone: "warning", title: "Print labels from the live site", text: "The QR link points at whichever web address the labels were printed from. Print them from the public site, not from a computer's localhost, or phones won't be able to open the link." },
      { t: "h", text: "Manual courier deliveries" },
      { t: "p", text: "Karachi orders with the manual courier finish with one more step: when the rider confirms delivery, tick the order in **Dispatched** and press **Mark fulfilled** (or have the rider scan the label). The order is marked fulfilled in Shopify too, with the consignment ID as its tracking number and no email to the customer, and moves to **Fulfilled**. Insta orders have no manual step." },
      { t: "h", text: "The columns" },
      {
        t: "dl",
        items: [
          { term: "Order / Customer", def: "The order number and who placed it." },
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
      { t: "ol", items: ["Start with the **Exception** tab: tick each order, **Modify** the address, then **Move to Active**.", "Check **Pending CC** — when a bank deposit has cleared, press **Deposit cleared → Active**.", "In **Active**, tick what's ready and press **Create Package**.", "In **Packaged**, tick the orders and press **Assign consignment** — leave the courier on Auto and the IDs are generated for you.", "In **Finalized**, press **Print shipping label** and stick the labels on the parcels.", "When the courier collects, press **Dispatch**, scan the labels, or scan the whole batch into a load sheet on the Dispatch page.", "For manual-courier parcels, press **Mark fulfilled** once they're delivered."] },
      { t: "callout", tone: "info", title: "Click an order to see every step", text: "Clicking an order opens its own page: the **Timeline** (placed, payments, each shipment and delivery, refunds, cancellation) mixed with every step of your workflow, newest first; the items; the shipping address; the payment summary; and a **Workflow** card with the current stage, any address flags, the courier, consignment, cash to collect, load sheet, and a link to the label." },
      { t: "callout", tone: "warning", title: "The workflow needs the database", text: "Order stages are stored in this app's database, not in Shopify. If the database isn't reachable, every order shows as **Active** and the control panel can't move anything." },
      { t: "callout", tone: "info", title: "Stat cards", text: "**Orders** and **Revenue** (with a badge comparing the last 30 days to the 30 before), **Unfulfilled** (not yet shipped in Shopify), and **Avg. order value**. Like every Shopify page, the list holds your latest 100 orders." },
    ],
    technical: [
      { t: "p", text: "Keyed `orders`; Shopify-backed, with the app-owned workflow overlay merged on. `readOrders()` maps `name`, `customer.displayName`, `shippingAddress.city`, the first fulfillment's `trackingInfo.company` → `courier`, `paymentGatewayNames` → `gateway`, `tags`, `subtotalPriceSet` / `totalDiscountsSet` / `totalShippingPriceSet` / `totalPriceSet`, `subtotalLineItemsQuantity`, `displayFinancialStatus` → `payment` (`paid` / `pending` / `refunded`), `displayFulfillmentStatus` → `fulfillment` (`fulfilled` / `partial` / `unfulfilled`), `sourceName` → `channel`, `createdAt`, `note`. Search covers `number`, `customer`, `consignmentId`." },
      { t: "p", text: "`GET /api/resources/orders` runs `attachOrderOps()` (`src/lib/order-ops.ts`) to add `opsStatus` (default `active`), `consignmentId`, `loadSheet`, `flags`, `modified`, and the booked `courier` (which wins over Shopify's tracking company). `orders` declares `rowHref`, so rows open `/dashboard/orders/[id]` instead of a drawer; the generic PATCH path (note + `setOrderOps()` override) still exists for API use." },
      { t: "h", text: "The workflow document" },
      { t: "p", text: "`app_order_ops` holds one document per touched order, `_id` = Shopify order id: `opsStatus`, `flags`, `modified`, `courier`, `consignmentId` (unique partial index), `bookingError`, `codAmount` / `total` / `number` (snapshot at Create Package), `labelPrintedAt`, `dispatchedAt`, `loadSheet`, `fulfilledAt`, `cancelReason`, and an append-only `history` of `{ at, action, from, to, note }`. No customer PII is stored — names and addresses are always read live." },
      { t: "ul", items: [
        "**Intake**: `POST /api/webhooks/orders-create` (Shopify `orders/create`, HMAC-verified with the client secret) → `intakeFromWebhook()` (`src/lib/order-workflow.ts`) → `checkAddress()` + `routeNewOrder()` (`src/lib/address-check.ts`) → `intakeOrder()`, a `$setOnInsert` upsert so retries never overwrite a status staff already changed. POS orders are skipped. Routing: any address issue → `exception`; every gateway matching `/bank|deposit|transfer|ibft/i` → `pending_cc`; otherwise `active`.",
        "**Transitions**: `ACTION_FROM` in `src/config/order-workflow.ts` is the single table of which action runs from which status; the control panel reads it for buttons and `runOrderAction()` enforces it behind `POST /api/orders/[id]/actions` (`{ action, ...payload }`). `canRun(action, status, courier)` also restricts `mark_fulfilled` to `MANUAL_COURIER`.",
        "`applyTransition()` is a compare-and-set on `{ _id, opsStatus: from }` (upserting only when `from` is the default `active`), so a lost race reports \"status changed in the meantime\" instead of a double move.",
        "`move_active` from `exception` without `modified` returns `409 { needsConfirmation }`; the client asks, then resends with `confirmed: true`.",
        "`modify` → `orderUpdate` with a new `shippingAddress` (`MailingAddressInput`; `provinceCode` / `countryCode` passed through) and `note`, then re-runs `checkAddress()` into `flags`.",
        "`create_package` reads `readOrderBrief()` (`totalOutstandingSet` → `codAmount`) and `tagsAdd`s `packaged`; `unpackage` `tagsRemove`s it.",
        "`assign_consignment`: `{ courier }`, a `COURIERS` value, a custom name, or `\"auto\"` (default: `defaultCourierFor(city)`). `normalizeCourier()` trims it, caps it at 40 characters, and snaps a case-insensitive match to the listed courier; the stored `courier` is that name. In the ID, `<courier-name>` is `courierCode()`: the listed `code` (`INSTA`, `MANKHI` for the manual courier), else the custom name reduced to `[A-Z0-9]`. The server reads the city and number via `readOrderBrief()`, then generates the ID with `renderConsignmentId(readAppSettings().consignmentTemplate, …)` (`src/config/consignment-schema.ts`). `<ms-since-epoch>` comes from `nextConsignmentMs()`, strictly increasing per process, so a sequential bulk run never repeats a value. The unique `consignmentId` index is the final guard. There is no manual entry and no courier booking API any more (the Insta stub was removed). `booking_failed` stays as a status only for orders already in it.",
        "`print_label` → `in_pickup_packing` (a reprint just logs). Labels render at `/print/labels?ids=…` (outside `/dashboard` so no chrome prints; gated by the proxy and a session check), QR generated server-side with the `qrcode` package.",
        "`dispatch` → `dispatched` and `add_to_load_sheet` (from `dispatched`, no `loadSheet` yet): `resolveLoadSheet(courier, target)` in `src/lib/dispatch.ts` picks the sheet — `\"auto\"` (default: the courier's newest Draft, opened if none, under a per-courier in-process lock), `\"new\"`, or a Draft sheet id for the same courier — then `attachToLoadSheet()` `$push`es the consignment and `$inc`s the sheet totals (idempotent via `consignmentIds: { $ne }`). The control panel runs orders sequentially, reusing the first returned `loadSheetId` per courier when the target is `\"new\"`.",
        "`mark_fulfilled` → `fulfilled`: `fulfillOrder()` reads the order's `fulfillmentOrders` and runs one `fulfillmentCreate` over every `OPEN` / `IN_PROGRESS` one with `trackingInfo { company, number: consignmentId }` and `notifyCustomer: false`; nothing open counts as success. Needs `read_merchant_managed_fulfillment_orders` / `write_merchant_managed_fulfillment_orders`.",
        "`cancel` from `in_pickup_packing` → `finalized` (clears `labelPrintedAt`); from `finalized` it requires `reason` → `canceled`, stores `cancelReason`, and unsets `consignmentId` so the label can't be scanned. `discard` → `canceled` locally only.",
        "Generic bulk actions, shown for any selection (mixed tabs included) and not part of `ACTION_FROM`: **Move to** PATCHes `/api/resources/orders/[id]` with `{ opsStatus }` only. That goes through `setOrderOps()` (history entry `set_status`, no side effects), and the route skips `orderUpdate` unless `notes` is in the body, so the Shopify note is kept. **Delete** calls `DELETE /api/resources/orders/[id]`: Shopify `orderDelete(orderId)` (needs `write_orders`; Shopify's userErrors, such as refusing open paid orders, are passed through), then `deleteOrderOps()` drops the `app_order_ops` doc.",
      ] },
      { t: "h", text: "Scanning" },
      { t: "ul", items: [
        "Label QRs encode `<origin>/scan/<consignmentId>` (`scanPath()`), the origin taken from the request's `host` / `x-forwarded-*` headers.",
        "`/scan/[consignmentId]` renders `ScanAdvance`, which POSTs `{ advance: true }` to `/api/consignments/[consignmentId]` once after load — never on the GET, so link previews can't move orders; a ref guard stops Strict Mode running it twice. The endpoint maps status through `SCAN_ADVANCE` (`finalized` → `print_label`, `in_pickup_packing` → `dispatch`, `dispatched` → `mark_fulfilled`).",
        "The in-app scanners (`src/components/dashboard/scanners.tsx`) are keyboard-wedge: a focused input that submits on Enter. `consignmentFromScan()` reduces a scanned URL to the bare id, so older bare-id labels still work. Scan to dispatch POSTs without `advance` (always `dispatch`).",
      ] },
      { t: "p", text: "`/dashboard/orders` is a literal route (`OrdersView`) wrapping `ResourceView` with `toolbar` (Scan to dispatch) and `selectionBar` (`OrderControlPanel`). The detail page (`GET /api/orders/[id]` → `readOrderDetail()` + `getOrderOps()`) merges `ops.history` into Shopify's timeline as `ops`-kind steps. KPIs: Orders and Revenue (`periodDelta` over 30 days), Unfulfilled, Avg. order value." },
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
    id: "dispatch",
    title: "Dispatch",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Dispatch** page is your courier handover book. A **load sheet** is the list you hand a courier when their rider collects a batch: which parcels (consignment IDs), how many, their combined value, and the cash on delivery (**COD**) the rider has to collect. It's proof of what left with them, and the COD total is what the courier owes you back." },
      { t: "p", text: "Sheets move through three stages, shown as tabs: **Draft** (still being loaded), **Posted** (handed to the courier), and **Archived** (settled, kept for records)." },
      { t: "callout", tone: "info", title: "Dispatched orders fill sheets automatically", text: "When orders are dispatched from the Orders page (button or scan), they're added to their courier's open **Draft** sheet — one is started automatically if there isn't one, dispatching from the **Main Warehouse**. The sheet's parcel count, total, COD, and consignment list update with every parcel. When the rider leaves, open the sheet and set it to **Posted**." },
      { t: "callout", tone: "success", title: "Scan a load sheet", text: "Or build a sheet at the door: press **Scan load sheet**, pick the courier (for a custom courier, pick **Other** and type the same name used when assigning the consignment) and location, and scan every parcel's label as you hand it over. Each scan adds the parcel and its COD; the running totals show at the bottom. **Create load sheet** posts it straight away and marks every order **Dispatched**. Parcels must have a printed label (In Pickup & Packing), or already be Dispatched but on no sheet, and be booked with the same courier." },
      {
        t: "dl",
        items: [
          { term: "Reference/ID", def: "The sheet's number, like **LS001**, assigned automatically." },
          { term: "Courier / Location", def: "Which courier is collecting, and where the parcels leave from." },
          { term: "Consignments", def: "Every consignment ID on the sheet." },
          { term: "Status", def: "**Draft**, **Posted**, or **Archived** — also the tab." },
          { term: "Reconciliation", def: "**Pending** or **Reconciled** — whether the courier has paid you the COD it collected." },
          { term: "Total Shipments / Total Amount / COD Amount", def: "Parcel count, combined order value, and cash to collect — added up automatically as parcels go on." },
          { term: "Weight", def: "Entered by hand if you track it." },
          { term: "Date Created / Date Posted", def: "When the sheet was started, and when it was handed over." },
        ],
      },
      { t: "h", text: "Opening and printing a sheet" },
      { t: "p", text: "Click any sheet to open it. Its page lists **every parcel on it** — order number, consignment ID, customer, city, phone, stage, COD, and value (click a parcel to open that order) — with the parcel count, COD, total value, and weight on top. The buttons there move the sheet along: **Post — handed to courier**, **Mark COD reconciled**, and **Archive**." },
      { t: "p", text: "Press **Print** for the courier **manifest**: a one-page handover document with the sheet number, courier, dates, the parcel table with each COD amount, the totals, and signature lines for the person handing over and the rider receiving. Print two — one for the rider, one for your records." },
      { t: "p", text: "To change a sheet's courier, location, figures, or notes, or to delete an empty one, use the **…** menu at the end of its row (Edit / Delete)." },
      { t: "ol", items: ["Dispatch orders from the Orders page, or use **Scan load sheet** here.", "When the rider arrives, open the courier's Draft sheet, check the parcels, and press **Print** for the manifest to sign.", "Press **Post — handed to courier** as the rider leaves — this stamps Date Posted.", "When the courier pays you the COD, open the sheet and press **Mark COD reconciled**.", "Press **Archive** on settled sheets to keep the Posted tab to what's still outstanding.", "You can also click **New load sheet** to start one by hand (for example, a different location)."] },
      { t: "callout", tone: "warning", title: "Only Draft sheets take new parcels", text: "Once a sheet is Posted, dispatches go onto the courier's next Draft sheet (started automatically). A sheet that has parcels on it can't be deleted, because orders remember which sheet they left on — archive it instead." },
      { t: "callout", tone: "warning", title: "Posting stamps the date for good", text: "Date Posted is set the first time a sheet becomes Posted, and archiving it later doesn't change it." },
    ],
    technical: [
      { t: "p", text: "Keyed `dispatch`; app-owned in MongoDB (`app_dispatch_load_sheets`) via `src/lib/dispatch.ts`, parameterised by `LoadSheetResource` so `return-load-sheets` shares it. Search covers `reference`, `courier`, `location`." },
      { t: "ul", items: [
        "`reference` (`LS001`, …) comes from an atomic counter in `app_counters`; `createdAt` is server-set; `datePosted` is stamped the first time `status` becomes `posted` and never overwritten.",
        "`status` (`draft` / `posted` / `archived`) drives `tabs`; `reconciliation` (`pending` / `reconciled`) is independent.",
        "`resolveLoadSheet(courier, target, location)` — `\"auto\"` returns the courier's newest Draft or opens one (`Main Warehouse`) under a per-courier in-process lock; `\"new\"` always opens one; an id must be a Draft for the same courier. `attachToLoadSheet()` `$push`es the consignment into `consignmentIds` and `$inc`s `totalShipments` / `totalAmount` / `codAmount` from the order's Create Package snapshot, idempotently. `postLoadSheet()` posts and stamps `datePosted`.",
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
    category: "Sales",
    everyday: [
      { t: "p", text: "**Return Load Sheets** is Dispatch's mirror image — instead of the parcels going out with a courier, it records the returns a courier hands back to you. Same fields, opposite direction: Draft while you're expecting it, Posted once the courier hands it over, Archived once it's settled." },
      { t: "ol", items: ["Open Sales then Return Load Sheets.", "Click New load sheet and pick the courier and the location it's coming into.", "Fill in the shipment count, amounts, and weight.", "Set it to Posted once the courier has handed the returns over — this stamps Date Posted.", "When any COD owed on undelivered orders is settled, set Reconciliation to Reconciled.", "Archive old settled sheets."] },
      { t: "callout", tone: "info", title: "Filled in by hand", text: "Unlike outgoing sheets, return sheets aren't linked to orders or scanning — every figure is entered by hand." },
    ],
    technical: [
      { t: "p", text: "Keyed `return-load-sheets`; same `src/lib/dispatch.ts` module as `dispatch` with its own collection (`app_return_load_sheets`), counter id, and `RL` reference prefix. Same fields, tabs, and one-way `datePosted` stamp; no `consignmentIds`, no order linkage, no scanner." },
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
      { t: "p", text: "**Point of Sale** (POS) is selling face to face in your physical shops. The **POS Overview** page summarises it: open registers, sales today, cash in drawers, active staff, your locations, and your latest in-store orders." },
      {
        t: "dl",
        items: [
          { term: "Registers", def: "Your tills — a record of which are open, their cash float, and sales today." },
          { term: "Locations", def: "Your Shopify locations (stores and warehouses)." },
          { term: "POS Staff", def: "The people who sell in person, with a role and a PIN." },
        ],
      },
      { t: "callout", tone: "info", title: "In-store sales land in Orders", text: "Sales rung up on Shopify POS show up in **Orders** with the **POS** channel, and in the Recent POS orders list here. They skip the shipping workflow — there's nothing to deliver." },
      { t: "callout", tone: "warning", title: "Registers and staff are records you keep", text: "Registers and POS Staff are kept in this app's database; they don't control Shopify POS. Opening a register or suspending a staff member here doesn't change anything on the actual till." },
    ],
    technical: [
      { t: "p", text: "`PosView` (`src/components/dashboard/pos-view.tsx`) aggregates `registers`, `locations`, `pos-staff`, and `orders` (`channel === \"pos\"`, latest five). Registers and staff are app-owned (MongoDB); locations are Shopify-backed and read-only." },
      { t: "callout", tone: "warning", title: "Location lists aren't linked", text: "The location dropdowns on registers and POS staff (`Flagship Store` / `Airport Popup` / `Downtown Kiosk`), and on load sheets and returns (`LOCATION_OPTIONS`), are fixed option lists in `src/config/resources.ts` — they don't read from the Shopify locations resource. Only the stock-adjustment facility picker is live." },
    ],
  },

  // ==========================================================================
  {
    id: "registers",
    title: "Registers",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "A **Register** is a till. This page is your record of each one: where it is, whether it's open, the cash float it started with, its sales today, and who opened it." },
      {
        t: "dl",
        items: [
          { term: "Register", def: "A name for the till, like Front Desk 1, with its location." },
          { term: "Status", def: "**Open** or **Closed**." },
          { term: "Cash float", def: "The starting cash in the drawer for giving change." },
          { term: "Sales today", def: "What the till has taken today." },
          { term: "Opened by", def: "Who started the session." },
        ],
      },
      { t: "ol", items: ["Open Point of Sale then Registers.", "Click New to add a till, or click one to update it.", "At the start of a shift set it **Open**, with the float and who opened it.", "At the end of the day enter the sales, set it **Closed**, and count the drawer: it should hold the float plus cash sales."] },
      { t: "callout", tone: "info", title: "Entered by hand", text: "Every figure here is typed in — nothing is pulled from Shopify POS — and each till is a single record, not a history of shifts." },
    ],
    technical: [
      { t: "p", text: "Keyed `registers`; app-owned in MongoDB (`app_registers`). Search covers `name`, `location`, `openedBy`. Fields: `name`, `location` (fixed list), `status` (`open` / `closed`), `openedBy` (free text, not linked to `pos-staff`), `cashFloat`, `sales`. No session log or cash-variance tracking." },
      { t: "p", text: "KPIs: Open registers, Cash in drawers (`sum(cashFloat)` of open), POS sales today (`sum(sales)`), Registers." },
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
    id: "pos-staff",
    title: "POS staff",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "**POS Staff** is your record of the people who sell in your physical shops: their role, where they work, a PIN, and whether they're active." },
      {
        t: "dl",
        items: [
          { term: "Staff / Email", def: "Who they are and how to reach them." },
          { term: "Role", def: "**Manager**, **Associate**, or **Cashier**." },
          { term: "Location", def: "Which shop they work at." },
          { term: "PIN", def: "Their till code." },
          { term: "Status", def: "**Active** or **Suspended**." },
        ],
      },
      { t: "ol", items: ["Open Point of Sale then POS Staff.", "Click New to add someone, with their role, location, and PIN.", "Set someone to Suspended rather than deleting them if they're away."] },
      { t: "callout", tone: "warning", title: "This list doesn't control the tills", text: "Staff here are records only — their PINs don't sign anyone in to Shopify POS, and suspending someone here doesn't lock them out of the till. Manage real POS access in Shopify. Because PINs are stored as plain text here, don't reuse real till PINs." },
    ],
    technical: [
      { t: "p", text: "Keyed `pos-staff`; app-owned in MongoDB (`app_pos_staff`). Search covers `name`, `email`, `location`. Fields: `name`, `email`, `role` (`manager` / `associate` / `cashier`), `location` (fixed list), `pin` (plain text), `status` (`active` / `suspended`). Roles are labels — no permissions are enforced — and these are not dashboard users (the dashboard has one admin login)." },
      { t: "p", text: "KPIs: Staff, Active, Managers, Locations covered (distinct `location`)." },
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
          { term: "OrderAction", def: "`modify`, `move_active`, `move_exception`, `discard`, `create_package`, `unpackage`, `assign_consignment`, `print_label`, `dispatch`, `add_to_load_sheet`, `mark_fulfilled`, `cancel` — allowed-from table in `ACTION_FROM`." },
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
