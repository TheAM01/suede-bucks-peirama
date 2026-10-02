#!/usr/bin/env node
/**
 * Seed 20 sample orders into the connected Shopify store.
 *
 *   npm run seed:orders              # dry run — prints what would be created
 *   npm run seed:orders -- --yes     # actually create the 20 orders
 *   npm run seed:orders -- --delete --yes   # delete every order this script created
 *
 * Uses the store connected on the Integrations page (MongoDB `integrations`
 * collection when MONGODB_URI is set in .env.local, else .data/integrations.json)
 * and mints a short-lived token with its client credentials, exactly like the
 * app does. Needs the `write_orders` and `write_customers` scopes.
 *
 * What gets created — all fictional, all tagged `suedebucks-seed` so they can
 * be found and removed:
 * - 20 customers with made-up names and @example.com emails (example.com is
 *   reserved for documentation, so no real inbox is ever involved), phone
 *   numbers in the fictional 555-01xx range, and US shipping addresses.
 * - A mix of shipping methods (standard, express, overnight, economy, free),
 *   payment gateways (COD and bank deposit left pending, card payments paid),
 *   1–3 line items each, and order dates spread over the last 30 days.
 * - Two orders with deliberately incomplete addresses, so the Exception tab
 *   has something in it once the orders/create webhook runs the address check.
 *
 * Prices are in the shop's own currency (read from Shopify). Inventory is not
 * touched (`inventoryBehaviour: BYPASS`) and no receipt emails are sent.
 * Shopify fires the orders/create webhook for these like any other order.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const TAG = "suedebucks-seed";
const args = new Set(process.argv.slice(2));
const CONFIRMED = args.has("--yes");
const DELETE = args.has("--delete");

// --- connection ---------------------------------------------------------------------

function readEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
  );
}

async function readIntegration() {
  const env = readEnv();
  if (env.MONGODB_URI) {
    try {
      const { MongoClient } = await import("mongodb");
      const client = await new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).connect();
      const doc = await client.db(env.MONGODB_DB || "suedebucks").collection("integrations").findOne({ _id: "config" });
      await client.close();
      if (doc?.shopify) return doc.shopify;
    } catch (err) {
      console.warn(`MongoDB unreachable (${err.message}) — trying .data/integrations.json`);
    }
  }
  const file = path.join(ROOT, ".data", "integrations.json");
  if (existsSync(file)) {
    const cfg = JSON.parse(readFileSync(file, "utf8"));
    if (cfg.shopify) return cfg.shopify;
  }
  throw new Error("No Shopify connection found — connect the store on the Integrations page first.");
}

async function accessToken(s) {
  if (s.authMethod === "admin_token") return s.adminToken;
  if (s.cachedToken?.expiresAt > Date.now()) return s.cachedToken.accessToken;
  const res = await fetch(`https://${s.storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: s.clientId, client_secret: s.clientSecret, grant_type: "client_credentials" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.access_token) throw new Error(`Token exchange failed (${res.status}) — check the app's credentials.`);
  return json.access_token;
}

function client(s, token) {
  const url = `https://${s.storeDomain}/admin/api/${s.apiVersion || "2026-01"}/graphql.json`;
  return async (query, variables) => {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json().catch(() => ({}));
      const throttled = res.status === 429 || json.errors?.some?.((e) => /throttled/i.test(e.message));
      if (throttled && attempt < 5) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
      return json.data;
    }
  };
}

// --- sample data --------------------------------------------------------------------

/** Fictional people. Emails use example.com; phones use the reserved 555-01xx range. */
const PEOPLE = [
  ["Olivia", "Bennett", "742 Maple Grove Ave", "", "Portland", "OR", "97205"],
  ["Marcus", "Holloway", "1180 Riverside Dr", "Apt 4B", "Austin", "TX", "78704"],
  ["Priya", "Raman", "56 Chestnut St", "", "Boston", "MA", "02108"],
  ["Daniel", "Okafor", "3301 Peachtree Rd NE", "Suite 210", "Atlanta", "GA", "30326"],
  ["Sofia", "Marquez", "905 Ocean View Blvd", "", "San Diego", "CA", "92109"],
  ["Ethan", "Whitaker", "48 Lakeshore Ln", "", "Madison", "WI", "53703"],
  ["Hannah", "Lindqvist", "2217 Elm Street", "Unit 12", "Denver", "CO", "80205"],
  ["Jamal", "Carter", "615 Magnolia Ave", "", "Charlotte", "NC", "28203"],
  ["Mei", "Tanaka", "1400 Pine St", "Apt 803", "Seattle", "WA", "98101"],
  ["Lucas", "Ferreira", "77 Harbor Point Rd", "", "Miami", "FL", "33131"],
  ["Grace", "O'Connell", "320 Willow Bend", "", "Columbus", "OH", "43215"],
  ["Noah", "Abernathy", "8890 Desert Sage Way", "", "Phoenix", "AZ", "85016"],
  ["Ava", "Kowalski", "19 Brookside Ct", "", "Minneapolis", "MN", "55401"],
  ["Samuel", "Nguyen", "2650 Cedar Hollow Rd", "Apt 2", "Nashville", "TN", "37203"],
  ["Chloe", "Dubois", "411 Bayou St", "", "New Orleans", "LA", "70116"],
  ["Isaac", "Mendel", "1025 Park Ave", "Apt 7C", "New York", "NY", "10028"],
  ["Zara", "Haddad", "54 Copper Canyon Dr", "", "Salt Lake City", "UT", "84101"],
  ["Leo", "Castellano", "3009 Sunset Blvd", "", "Los Angeles", "CA", "90026"],
  // Two deliberately incomplete addresses — they should land in the Exception tab.
  ["Ruby", "Fairchild", "N/A", "", "Chicago", "IL", "60601"],
  ["Owen", "Prescott", "12", "", "Kansas City", "MO", ""],
];

const SHIPPING = [
  { title: "Standard Shipping (5–7 days)", code: "STANDARD", price: 350 },
  { title: "Express Shipping (2–3 days)", code: "EXPRESS", price: 900 },
  { title: "Overnight", code: "OVERNIGHT", price: 1800 },
  { title: "Economy (8–12 days)", code: "ECONOMY", price: 200 },
  { title: "Free Shipping", code: "FREE", price: 0 },
];

/** Gateway → how the order is paid. COD / bank deposit stay pending (Pending CC routing); cards are paid. */
const PAYMENTS = [
  { gateway: "Cash on Delivery (COD)", paid: false },
  { gateway: "Bank Deposit", paid: false },
  { gateway: "PayFast", paid: true },
  { gateway: "Cash on Delivery (COD)", paid: false },
  { gateway: "Shopify Payments", paid: true },
];

/** Custom line items used alongside (or instead of) the store's real variants. */
const CUSTOM_ITEMS = [
  { title: "Oud Nocturne — Eau de Parfum 50ml", sku: "SEED-OUD-50", price: 12500 },
  { title: "Saffron Veil — Eau de Parfum 100ml", sku: "SEED-SAF-100", price: 18900 },
  { title: "Citrus Atlas — Eau de Toilette 75ml", sku: "SEED-CIT-75", price: 7800 },
  { title: "Amber Dune — Travel Spray 10ml", sku: "SEED-AMB-10", price: 2400 },
  { title: "Rose Alcove — Body Mist 200ml", sku: "SEED-ROS-200", price: 3600 },
  { title: "Discovery Set — 5 × 2ml", sku: "SEED-DISC-5", price: 2950 },
];

/** Deterministic pseudo-random, so a re-run builds the same orders. */
let seed = 20261002;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (list) => list[Math.floor(rand() * list.length)];

function buildOrders(currency, variants) {
  return PEOPLE.map(([firstName, lastName, address1, address2, city, provinceCode, zip], i) => {
    const email = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com";
    const phone = `+1${String(201 + ((i * 37) % 700)).padStart(3, "0")}55501${String(i).padStart(2, "0")}`;
    const address = { firstName, lastName, address1, address2, city, provinceCode, zip, countryCode: "US", phone };

    // 1–3 lines: real store variants when there are any, otherwise custom items.
    const lineCount = 1 + Math.floor(rand() * 3);
    const lineItems = [];
    const used = new Set();
    for (let n = 0; n < lineCount; n++) {
      const useVariant = variants.length > 0 && rand() < 0.4;
      const quantity = 1 + Math.floor(rand() * 2);
      if (useVariant) {
        const v = pick(variants);
        if (used.has(v.id)) continue;
        used.add(v.id);
        lineItems.push({ variantId: v.id, quantity, priceSet: money(v.price, currency) });
      } else {
        const item = pick(CUSTOM_ITEMS);
        if (used.has(item.sku)) continue;
        used.add(item.sku);
        lineItems.push({
          title: item.title,
          sku: item.sku,
          quantity,
          requiresShipping: true,
          taxable: false,
          priceSet: money(item.price, currency),
        });
      }
    }

    const shipping = SHIPPING[i % SHIPPING.length];
    const payment = PAYMENTS[i % PAYMENTS.length];
    const subtotal = lineItems.reduce((a, l) => a + Number(l.priceSet.shopMoney.amount) * l.quantity, 0);
    const total = subtotal + shipping.price;
    const processedAt = new Date(Date.now() - Math.floor(rand() * 30 * 86_400_000)).toISOString();

    return {
      email,
      phone,
      processedAt,
      currency,
      tags: [TAG],
      note: i >= PEOPLE.length - 2 ? "Seed order with an incomplete address (tests the Exception tab)." : "Seed order.",
      customer: { toUpsert: { email, firstName, lastName, phone, tags: [TAG] } },
      shippingAddress: address,
      billingAddress: address,
      lineItems,
      shippingLines: [{ title: shipping.title, code: shipping.code, source: "suedebucks-seed", priceSet: money(shipping.price, currency) }],
      financialStatus: payment.paid ? "PAID" : "PENDING",
      transactions: payment.paid
        ? [{ kind: "SALE", status: "SUCCESS", gateway: payment.gateway, amountSet: money(total, currency), processedAt }]
        : [{ kind: "SALE", status: "PENDING", gateway: payment.gateway, amountSet: money(total, currency), processedAt }],
    };
  });
}

function money(amount, currency) {
  return { shopMoney: { amount: Number(amount).toFixed(2), currencyCode: currency } };
}

// --- run ----------------------------------------------------------------------------

const ORDER_CREATE = `mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    order { id name totalPriceSet { shopMoney { amount currencyCode } } }
    userErrors { field message }
  }
}`;

async function seedOrders(gql) {
  const data = await gql(`{
    shop { name currencyCode }
    productVariants(first: 20) { nodes { id price } }
  }`);
  const currency = data.shop.currencyCode;
  const variants = data.productVariants.nodes.map((v) => ({ id: v.id, price: Number(v.price) || 1000 }));
  const orders = buildOrders(currency, variants);

  console.log(`Store: ${data.shop.name} (${currency}) — ${variants.length} variants available for line items.\n`);
  for (const o of orders) {
    const items = o.lineItems.map((l) => `${l.quantity}× ${l.title ?? "store variant"}`).join(", ");
    console.log(`  ${o.shippingAddress.firstName} ${o.shippingAddress.lastName.padEnd(11)} ${o.shippingAddress.city}, ${o.shippingAddress.provinceCode}  ·  ${o.shippingLines[0].title}  ·  ${o.transactions[0].gateway}  ·  ${items}`);
  }
  if (!CONFIRMED) {
    console.log(`\nDry run — nothing was created. Re-run with --yes to create these ${orders.length} orders.`);
    return;
  }

  console.log("\nCreating…");
  let ok = 0;
  for (const order of orders) {
    const res = await gql(ORDER_CREATE, {
      order,
      options: { inventoryBehaviour: "BYPASS", sendReceipt: false, sendFulfillmentReceipt: false },
    });
    const errs = res.orderCreate.userErrors;
    const who = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    if (errs.length) {
      console.log(`  ✗ ${who}: ${errs.map((e) => e.message).join("; ")}`);
    } else {
      ok++;
      const o = res.orderCreate.order;
      console.log(`  ✓ ${o.name}  ${who}  ${o.totalPriceSet.shopMoney.amount} ${o.totalPriceSet.shopMoney.currencyCode}`);
    }
  }
  console.log(`\n${ok} of ${orders.length} orders created, tagged "${TAG}".`);
}

async function deleteSeeded(gql) {
  const data = await gql(`query($q: String!) { orders(first: 100, query: $q) { nodes { id name } } }`, { q: `tag:${TAG}` });
  const orders = data.orders.nodes;
  console.log(`${orders.length} seeded orders found.`);
  if (!CONFIRMED) {
    console.log("Dry run — re-run with --delete --yes to delete them (permanent).");
    return;
  }
  for (const o of orders) {
    const res = await gql(
      `mutation($id: ID!) { orderDelete(orderId: $id) { deletedId userErrors { message } } }`,
      { id: o.id },
    );
    const errs = res.orderDelete.userErrors;
    console.log(errs.length ? `  ✗ ${o.name}: ${errs.map((e) => e.message).join("; ")}` : `  ✓ deleted ${o.name}`);
  }
  console.log(`\nSeeded customers (tag "${TAG}") are left in place — delete them in Shopify admin if you want them gone.`);
}

try {
  const integration = await readIntegration();
  const gql = client(integration, await accessToken(integration));
  if (DELETE) await deleteSeeded(gql);
  else await seedOrders(gql);
} catch (err) {
  console.error(`\nSeed failed: ${err.message}`);
  process.exit(1);
}
