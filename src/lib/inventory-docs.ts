import "server-only";
import { ObjectId, type Collection, type UpdateFilter } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import { APP_OWNED_COLLECTIONS, DB_UNAVAILABLE } from "./app-data";
import { shopifyQuery, toGid, fromGid, type ShopifyResult } from "./shopify-client";
import {
  adjustShopifyInventory,
  readAvailable,
  recordMovements,
  type MovementInput,
  type QuantityChange,
} from "./inventory-ledger";
import {
  DOC_NOUN,
  DOC_PREFIX,
  OPEN_INBOUND_STATUSES,
  canRunDoc,
  docStatus,
  type DocAction,
  type DocLine,
  type InventoryDocKind,
} from "@/config/inventory-docs";
import type { Row } from "@/config/resource-types";

/**
 * Purchase orders, transfers, and stocktakes (see src/config/inventory-docs.ts
 * for the state machines). A document is a header (supplier / locations /
 * carrier details) plus item lines, in MongoDB, one collection per kind.
 *
 * - Headers are created and edited through the generic resource API, lines
 *   and stage changes through `runDocAction()` (`POST /api/inventory-docs/
 *   [kind]/[id]`).
 * - Every step that moves stock posts to Shopify first and only then saves;
 *   a Shopify rejection leaves the document unchanged. Each posted change is
 *   also written to the movement ledger (src/lib/inventory-ledger.ts).
 * - Steps run under a short-lived `busy` claim so two concurrent clicks can't
 *   post the same receipt twice; a claim older than two minutes is treated
 *   as abandoned.
 * - Item and location names are resolved from Shopify, supplier names from
 *   the suppliers collection — never trusted from the client.
 */

const COLLECTION: Record<InventoryDocKind, string> = {
  "purchase-orders": "app_purchase_orders",
  transfers: "app_transfers",
  stocktakes: "app_stocktakes",
};
export const INVENTORY_DOC_COLLECTIONS = Object.values(COLLECTION);

const COUNTERS = "app_counters";
const STALE_CLAIM_MS = 2 * 60_000;
const MAX_LINES = 1000;

type Doc = { _id: ObjectId } & Record<string, unknown>;

const str = (v: unknown): string => (v == null ? "" : String(v)).trim();
const lines = (d: Record<string, unknown>): DocLine[] => (Array.isArray(d.lines) ? (d.lines as DocLine[]) : []);
const nowIso = () => new Date().toISOString();

async function col(kind: InventoryDocKind): Promise<Collection<Doc> | null> {
  const db = await getDb();
  return db ? db.collection<Doc>(COLLECTION[kind]) : null;
}

/** Derived totals shown in the list and on the detail page. */
function toRow(kind: InventoryDocKind, doc: Doc): Row {
  const { _id, busy: _b, busyAt: _ba, ...rest } = doc;
  void _b;
  void _ba;
  const ls = lines(doc);
  const units = ls.reduce((a, l) => a + (l.qty || 0), 0);
  const receivedUnits = ls.reduce((a, l) => a + (l.received || 0), 0);
  const row: Row = {
    ...rest,
    id: _id.toHexString(),
    lineCount: ls.length,
    units,
    receivedUnits,
    remainingUnits: Math.max(0, units - receivedUnits),
  };
  if (kind === "purchase-orders") {
    row.value = ls.reduce((a, l) => a + (l.qty || 0) * (l.unitCost || 0), 0);
  }
  if (kind === "stocktakes") {
    const counted = ls.filter((l) => l.counted != null);
    row.countedLines = counted.length;
    row.units = counted.reduce((a, l) => a + (l.counted ?? 0), 0);
    row.varianceUnits =
      doc.status === "posted" ? counted.reduce((a, l) => a + ((l.counted ?? 0) - (l.expected ?? 0)), 0) : null;
  }
  return row;
}

async function nextNumber(kind: InventoryDocKind): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error(DB_UNAVAILABLE);
  const counter = await db
    .collection<{ _id: string; seq: number }>(COUNTERS)
    .findOneAndUpdate({ _id: kind }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  if (!counter) throw new Error(DB_UNAVAILABLE);
  return `${DOC_PREFIX[kind]}-${String(counter.seq).padStart(4, "0")}`;
}

// --- Shopify / supplier lookups ------------------------------------------------------

async function resolveLocations(ids: string[]): Promise<{ names?: Map<string, string>; error?: string }> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const names = new Map<string, string>();
  if (unique.length === 0) return { names };
  const res = await shopifyQuery<{ nodes: ({ id: string; name: string; isActive: boolean } | null)[] }>(
    `query($ids: [ID!]!) { nodes(ids: $ids) { ... on Location { id name isActive } } }`,
    { ids: unique.map((id) => toGid("Location", id)) },
  );
  if (!res.ok) return { error: res.error };
  for (const n of res.data.nodes) {
    if (!n?.id) continue;
    if (n.isActive === false) return { error: `${n.name} is deactivated in Shopify — pick an active location.` };
    names.set(fromGid(n.id), n.name);
  }
  const missing = unique.find((id) => !names.has(id));
  if (missing) return { error: "That location no longer exists in Shopify." };
  return { names };
}

interface ItemInfo {
  item: string;
  sku: string;
  unitCost: number;
}

/** Display name / SKU / cost for inventory item ids, in batches of 100. */
async function resolveItems(ids: string[]): Promise<{ items?: Map<string, ItemInfo>; error?: string }> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const items = new Map<string, ItemInfo>();
  for (let i = 0; i < unique.length; i += 100) {
    const res = await shopifyQuery<{
      nodes: ({
        id: string;
        sku?: string;
        tracked?: boolean;
        unitCost?: { amount?: string } | null;
        variant?: { title?: string; product?: { title?: string } };
      } | null)[];
    }>(
      `query($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on InventoryItem { id sku tracked unitCost { amount } variant { title product { title } } }
        }
      }`,
      { ids: unique.slice(i, i + 100).map((id) => toGid("InventoryItem", id)) },
    );
    if (!res.ok) return { error: res.error };
    for (const n of res.data.nodes) {
      if (!n?.id) continue;
      const product = str(n.variant?.product?.title);
      const variant = str(n.variant?.title);
      if (n.tracked === false) {
        return { error: `Shopify doesn't track inventory for ${product || "an item"} — enable tracking on the product first.` };
      }
      items.set(fromGid(n.id), {
        item: (variant && variant !== "Default Title" ? `${product} — ${variant}` : product) || "Unknown item",
        sku: str(n.sku),
        unitCost: Number(n.unitCost?.amount ?? 0) || 0,
      });
    }
  }
  const missing = unique.find((id) => !items.has(id));
  if (missing) return { error: "An item on this document no longer exists in Shopify." };
  return { items };
}

async function resolveSupplier(id: string): Promise<{ name?: string; error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Pick a supplier." };
  const db = await getDb();
  if (!db) return { error: DB_UNAVAILABLE };
  const s = await db.collection(APP_OWNED_COLLECTIONS.suppliers).findOne({ _id: new ObjectId(id) });
  if (!s) return { error: "That supplier no longer exists." };
  return { name: str(s.name) || "Unnamed supplier" };
}

// --- headers (generic resource API) -----------------------------------------------------

const HEADER_KEYS: Record<InventoryDocKind, string[]> = {
  "purchase-orders": ["supplierId", "locationId", "expectedAt", "carrier", "trackingNumber", "eta", "notes"],
  transfers: ["fromLocationId", "toLocationId", "carrier", "trackingNumber", "eta", "notes"],
  stocktakes: ["locationId", "notes"],
};
/** Header keys that fix where stock goes — only editable while Draft. */
const DRAFT_ONLY_KEYS = new Set(["supplierId", "locationId", "fromLocationId", "toLocationId"]);
const FINAL_STATUSES = new Set(["received", "closed", "cancelled", "posted"]);

/** Validate header input and resolve the display names it implies. */
async function buildHeader(
  kind: InventoryDocKind,
  input: Record<string, unknown>,
  keys: string[],
): Promise<{ fields?: Record<string, unknown>; error?: string }> {
  const f: Record<string, unknown> = {};
  for (const k of keys) f[k] = str(input[k]);

  if (kind === "purchase-orders" && "supplierId" in f) {
    const s = await resolveSupplier(String(f.supplierId));
    if (s.error) return { error: s.error };
    f.supplier = s.name;
  }
  const locKeys: [string, string][] = [
    ["locationId", "location"],
    ["fromLocationId", "from"],
    ["toLocationId", "to"],
  ];
  const wanted = locKeys.filter(([k]) => k in f);
  for (const [k] of wanted) if (!f[k]) return { error: "Pick the location." };
  if (kind === "transfers" && "fromLocationId" in f && f.fromLocationId === f.toLocationId) {
    return { error: "A transfer needs two different locations." };
  }
  if (wanted.length) {
    const r = await resolveLocations(wanted.map(([k]) => String(f[k])));
    if (r.error) return { error: r.error };
    for (const [k, name] of wanted) f[name] = r.names!.get(String(f[k]));
  }
  for (const d of ["expectedAt", "eta"]) {
    if (d in f && f[d] && !/^\d{4}-\d{2}-\d{2}$/.test(String(f[d]))) return { error: "Dates must be YYYY-MM-DD." };
  }
  return { fields: f };
}

function noDb(kind: InventoryDocKind) {
  return `No database configured — connect MongoDB to store ${DOC_NOUN[kind].toLowerCase()}s.`;
}

export async function listDocs(kind: InventoryDocKind): Promise<{ rows: Row[]; error?: string }> {
  if (!isDbConfigured()) return { rows: [], error: noDb(kind) };
  try {
    const c = await col(kind);
    if (!c) return { rows: [], error: DB_UNAVAILABLE };
    const docs = await c.find().sort({ _id: -1 }).limit(500).toArray();
    return { rows: docs.map((d) => toRow(kind, d)) };
  } catch {
    return { rows: [], error: DB_UNAVAILABLE };
  }
}

export async function getDoc(kind: InventoryDocKind, id: string): Promise<{ row?: Row; error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  if (!isDbConfigured()) return { error: noDb(kind) };
  try {
    const c = await col(kind);
    if (!c) return { error: DB_UNAVAILABLE };
    const doc = await c.findOne({ _id: new ObjectId(id) });
    return doc ? { row: toRow(kind, doc) } : { error: `That ${DOC_NOUN[kind].toLowerCase()} no longer exists.` };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function createDoc(
  kind: InventoryDocKind,
  input: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  if (!isDbConfigured()) return { error: noDb(kind) };
  const h = await buildHeader(kind, input, HEADER_KEYS[kind]);
  if (h.error) return { error: h.error };
  try {
    const c = await col(kind);
    if (!c) return { error: DB_UNAVAILABLE };
    const at = nowIso();
    const doc = {
      ...h.fields,
      number: await nextNumber(kind),
      status: "draft",
      lines: [],
      history: [{ at, action: "create", note: "Created" }],
      createdAt: at,
      updatedAt: at,
    };
    const res = await c.insertOne(doc as unknown as Doc);
    return { row: toRow(kind, { ...doc, _id: res.insertedId } as Doc) };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function updateDocHeader(
  kind: InventoryDocKind,
  id: string,
  input: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const c = await col(kind);
    if (!c) return { error: DB_UNAVAILABLE };
    const oid = new ObjectId(id);
    const existing = await c.findOne({ _id: oid });
    if (!existing) return { error: `That ${DOC_NOUN[kind].toLowerCase()} no longer exists.` };
    if (FINAL_STATUSES.has(String(existing.status))) {
      return { error: `${existing.number} is ${docStatus(kind, existing.status).label.toLowerCase()} — it can't be edited.` };
    }
    // Once stock has moved, the supplier / locations are fixed.
    const keys = HEADER_KEYS[kind].filter((k) => existing.status === "draft" || !DRAFT_ONLY_KEYS.has(k));
    const h = await buildHeader(kind, input, keys);
    if (h.error) return { error: h.error };
    await c.updateOne({ _id: oid }, { $set: { ...h.fields, updatedAt: nowIso() } });
    return getDoc(kind, id);
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function deleteDoc(kind: InventoryDocKind, id: string): Promise<{ error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const c = await col(kind);
    if (!c) return { error: DB_UNAVAILABLE };
    const res = await c.deleteOne({ _id: new ObjectId(id), status: "draft", busy: { $ne: true } });
    if (res.deletedCount === 0) {
      const still = await c.findOne({ _id: new ObjectId(id) });
      if (still) return { error: "Only drafts can be deleted — cancel or close it instead, so its history stays." };
    }
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

// --- actions --------------------------------------------------------------------------

export interface DocActionResult {
  ok?: boolean;
  error?: string;
  row?: Row;
}

/** Claim the document for one step (see module comment). */
async function claim(c: Collection<Doc>, oid: ObjectId, statuses: readonly string[]): Promise<Doc | null> {
  return c.findOneAndUpdate(
    {
      _id: oid,
      status: { $in: [...statuses] },
      $or: [{ busy: { $ne: true } }, { busyAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS).toISOString() } }],
    },
    { $set: { busy: true, busyAt: nowIso() } },
    { returnDocument: "after" },
  );
}

/** Parse `[{ inventoryItemId, qty }]`, merging duplicate items. */
function parseQtyLines(raw: unknown, field: "qty" | "counted"): { lines?: Map<string, number>; error?: string } {
  if (!Array.isArray(raw)) return { error: "No lines sent." };
  if (raw.length > MAX_LINES) return { error: `A document can hold at most ${MAX_LINES} lines.` };
  const out = new Map<string, number>();
  for (const r of raw as Record<string, unknown>[]) {
    const id = str(r.inventoryItemId);
    if (!id) return { error: "A line has no item." };
    const n = Number(r[field]);
    if (!Number.isInteger(n) || n < 0) return { error: "Quantities must be whole numbers, zero or more." };
    out.set(id, (out.get(id) ?? 0) + n);
  }
  return { lines: out };
}

export async function runDocAction(
  kind: InventoryDocKind,
  id: string,
  action: unknown,
  payload: Record<string, unknown>,
): Promise<DocActionResult> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  const a = String(action) as DocAction;
  const c = await col(kind).catch(() => null);
  if (!c) return { error: isDbConfigured() ? DB_UNAVAILABLE : noDb(kind) };
  const oid = new ObjectId(id);

  const current = await c.findOne({ _id: oid });
  if (!current) return { error: `That ${DOC_NOUN[kind].toLowerCase()} no longer exists.` };
  if (!canRunDoc(kind, a, current.status)) {
    return { error: `Can't do that while ${current.number} is ${docStatus(kind, current.status).label.toLowerCase()}.` };
  }

  const doc = await claim(c, oid, [String(current.status)]);
  if (!doc) return { error: "Someone else is working on this document right now — try again in a moment." };

  let result: { set?: Record<string, unknown>; note?: string; error?: string };
  try {
    result = await step(kind, a, doc, payload);
  } catch (err) {
    console.error("[inventory-docs]", err);
    result = { error: "Something went wrong — nothing was changed." };
  }

  const at = nowIso();
  const update = {
    $unset: { busy: "", busyAt: "" },
    ...(result.error
      ? {}
      : {
          $set: { ...result.set, updatedAt: at },
          $push: { history: { at, action: a, note: result.note ?? "" } },
        }),
  };
  await c.updateOne({ _id: oid }, update as unknown as UpdateFilter<Doc>);
  if (result.error) return { error: result.error };
  const fresh = await getDoc(kind, id);
  return { ok: true, row: fresh.row };
}

/** One step: validate, post stock to Shopify, return the fields to save. Throws nothing it can describe. */
async function step(
  kind: InventoryDocKind,
  action: DocAction,
  doc: Doc,
  payload: Record<string, unknown>,
): Promise<{ set?: Record<string, unknown>; note?: string; error?: string }> {
  const number = String(doc.number);
  const docLines = lines(doc);
  const href = `/dashboard/${kind}/${doc._id.toHexString()}`;
  const uri = `suedebucks://${kind}/${number}`;
  const at = nowIso();

  switch (action) {
    case "set_lines": {
      if (kind === "stocktakes") {
        const parsed = parseCounts(payload.lines);
        if (parsed.error) return { error: parsed.error };
        const resolved = await resolveItems([...parsed.lines!.keys()]);
        if (resolved.error) return { error: resolved.error };
        const next: DocLine[] = [...parsed.lines!].map(([itemId, counted]) => ({
          inventoryItemId: itemId,
          ...pickInfo(resolved.items!.get(itemId)!),
          qty: 0,
          counted,
        }));
        return { set: { lines: next }, note: `${next.length} lines saved` };
      }
      const parsed = parseQtyLines(payload.lines, "qty");
      if (parsed.error) return { error: parsed.error };
      const resolved = await resolveItems([...parsed.lines!.keys()]);
      if (resolved.error) return { error: resolved.error };
      const costs = new Map(
        (Array.isArray(payload.lines) ? (payload.lines as Record<string, unknown>[]) : []).map((l) => [
          str(l.inventoryItemId),
          Number(l.unitCost),
        ]),
      );
      const next: DocLine[] = [...parsed.lines!]
        .filter(([, q]) => q > 0)
        .map(([itemId, qty]) => {
          const info = resolved.items!.get(itemId)!;
          const line: DocLine = { inventoryItemId: itemId, item: info.item, sku: info.sku, qty, received: 0 };
          if (kind === "purchase-orders") {
            const cost = costs.get(itemId);
            line.unitCost = Number.isFinite(cost) && cost! >= 0 ? cost! : info.unitCost;
          }
          return line;
        });
      return { set: { lines: next }, note: `${next.length} lines saved` };
    }

    case "place": {
      if (docLines.length === 0) return { error: "Add at least one item before placing the order." };
      return { set: { status: "ordered", orderedAt: at }, note: "Order placed with the supplier" };
    }

    case "ship": {
      const set: Record<string, unknown> = {
        carrier: str(payload.carrier),
        trackingNumber: str(payload.trackingNumber),
        eta: str(payload.eta),
      };
      if (set.eta && !/^\d{4}-\d{2}-\d{2}$/.test(String(set.eta))) return { error: "ETA must be a date." };
      if (kind === "purchase-orders") {
        set.status = "in_transit";
        if (!doc.shippedAt) set.shippedAt = at;
      }
      const bits = [set.carrier, set.trackingNumber && `#${set.trackingNumber}`, set.eta && `ETA ${set.eta}`].filter(Boolean);
      return { set, note: bits.length ? `Shipping details: ${bits.join(" · ")}` : "Shipping details cleared" };
    }

    case "send": {
      if (docLines.length === 0) return { error: "Add at least one item before sending." };
      const from = String(doc.fromLocationId);
      const error = await adjustShopifyInventory(
        docLines.map((l) => ({ inventoryItemId: l.inventoryItemId, locationId: from, delta: -l.qty })),
        "movement_created",
        uri,
      );
      if (error) return { error: `Shopify didn't take the stock out of ${doc.from}: ${error}` };
      await recordMovements(
        docLines.map((l) =>
          movement(`transfer_out:${number}:${l.inventoryItemId}`, "transfer_out", number, href, l, from, String(doc.from), -l.qty, `to ${doc.to}`),
        ),
      );
      return { set: { status: "in_transit", sentAt: at }, note: `Sent from ${doc.from} — ${sumQty(docLines)} units left stock` };
    }

    case "receive": {
      const parsed = payload.all === true
        ? { lines: new Map(docLines.map((l) => [l.inventoryItemId, l.qty - (l.received ?? 0)])) }
        : parseQtyLines(payload.lines, "qty");
      if (parsed.error) return { error: parsed.error };
      const receipt = new Map([...parsed.lines!].filter(([, q]) => q > 0));
      if (receipt.size === 0) return { error: "Enter how many units arrived." };
      for (const [itemId, q] of receipt) {
        const l = docLines.find((x) => x.inventoryItemId === itemId);
        if (!l) return { error: "A received item isn't on this document." };
        const remaining = l.qty - (l.received ?? 0);
        if (q > remaining) return { error: `${l.item}: only ${remaining} still to receive.` };
      }
      const locationId = String(kind === "transfers" ? doc.toLocationId : doc.locationId);
      const location = String(kind === "transfers" ? doc.to : doc.location);
      const changes: QuantityChange[] = [...receipt].map(([itemId, q]) => ({ inventoryItemId: itemId, locationId, delta: q }));
      const error = await adjustShopifyInventory(changes, kind === "transfers" ? "movement_received" : "received", uri);
      if (error) return { error: `Shopify didn't add the stock at ${location}: ${error}` };

      const seq = (Array.isArray(doc.receipts) ? doc.receipts.length : 0) + 1;
      const type = kind === "transfers" ? "transfer_in" : "receipt";
      await recordMovements(
        [...receipt].map(([itemId, q]) => {
          const l = docLines.find((x) => x.inventoryItemId === itemId)!;
          const note = kind === "transfers" ? `from ${doc.from}` : `from ${doc.supplier}`;
          return movement(`${type}:${number}:${seq}:${itemId}`, type, number, href, l, locationId, location, q, note);
        }),
      );
      const next = docLines.map((l) => ({ ...l, received: (l.received ?? 0) + (receipt.get(l.inventoryItemId) ?? 0) }));
      const complete = next.every((l) => (l.received ?? 0) >= l.qty);
      const units = [...receipt.values()].reduce((a, b) => a + b, 0);
      return {
        set: {
          lines: next,
          status: complete ? "received" : "partial",
          ...(complete ? { receivedAt: at } : {}),
          receipts: [...(Array.isArray(doc.receipts) ? doc.receipts : []), { at, units }],
        },
        note: `Received ${units} units at ${location}${complete ? " — complete" : ""}`,
      };
    }

    case "close": {
      const short = docLines.reduce((a, l) => a + Math.max(0, l.qty - (l.received ?? 0)), 0);
      return {
        set: { status: "closed", closedAt: at },
        note: kind === "transfers"
          ? `Closed — ${short} units never arrived (already out of ${doc.from}'s stock)`
          : `Closed — ${short} units won't be delivered`,
      };
    }

    case "cancel": {
      const reason = str(payload.reason);
      // An in-transit transfer with nothing received yet: put the stock back at the source.
      if (kind === "transfers" && doc.status === "in_transit") {
        const from = String(doc.fromLocationId);
        const error = await adjustShopifyInventory(
          docLines.map((l) => ({ inventoryItemId: l.inventoryItemId, locationId: from, delta: l.qty })),
          "movement_canceled",
          uri,
        );
        if (error) return { error: `Shopify didn't return the stock to ${doc.from}: ${error}` };
        await recordMovements(
          docLines.map((l) =>
            movement(`transfer_cancel:${number}:${l.inventoryItemId}`, "transfer_in", number, href, l, from, String(doc.from), l.qty, "transfer cancelled — returned to source"),
          ),
        );
      }
      return { set: { status: "cancelled", cancelledAt: at, cancelReason: reason }, note: reason ? `Cancelled — ${reason}` : "Cancelled" };
    }

    case "load_location": {
      const loaded = await readLocationItems(String(doc.locationId));
      if (loaded.error) return { error: loaded.error };
      const existing = new Map(docLines.map((l) => [l.inventoryItemId, l]));
      const next: DocLine[] = loaded.items!.map((it) => ({
        inventoryItemId: it.inventoryItemId,
        item: it.item,
        sku: it.sku,
        qty: 0,
        counted: existing.get(it.inventoryItemId)?.counted ?? null,
      }));
      // Keep lines added by hand that aren't stocked here yet.
      for (const l of docLines) if (!next.some((n) => n.inventoryItemId === l.inventoryItemId)) next.push(l);
      return { set: { lines: next }, note: `Loaded ${loaded.items!.length} items stocked at ${doc.location}` };
    }

    case "post": {
      const counted = docLines.filter((l) => l.counted != null);
      if (counted.length === 0) return { error: "Enter at least one count before posting." };
      const locationId = String(doc.locationId);
      const live = await readAvailable(counted.map((l) => l.inventoryItemId), locationId);
      if (live.error) return { error: live.error };
      const expected = (l: DocLine) => live.levels!.get(`${l.inventoryItemId}:${locationId}`) ?? 0;
      const changes = counted.map((l) => ({ inventoryItemId: l.inventoryItemId, locationId, delta: (l.counted ?? 0) - expected(l) }));
      const error = await adjustShopifyInventory(changes, "cycle_count_available", uri);
      if (error) return { error: `Shopify didn't take the counts: ${error}` };
      await recordMovements(
        counted
          .map((l) => ({ l, delta: (l.counted ?? 0) - expected(l) }))
          .filter((x) => x.delta !== 0)
          .map(({ l, delta }) =>
            movement(`stocktake:${number}:${l.inventoryItemId}`, "stocktake", number, href, l, locationId, String(doc.location), delta, `counted ${l.counted}, expected ${expected(l)}`),
          ),
      );
      const next = docLines.map((l) => (l.counted != null ? { ...l, expected: expected(l) } : l));
      const variance = changes.reduce((a, ch) => a + ch.delta, 0);
      return {
        set: { lines: next, status: "posted", postedAt: at },
        note: `Posted ${counted.length} counts — net variance ${variance > 0 ? "+" : ""}${variance} units`,
      };
    }

    default:
      return { error: "Unknown action." };
  }
}

function parseCounts(raw: unknown): { lines?: Map<string, number | null>; error?: string } {
  if (!Array.isArray(raw)) return { error: "No lines sent." };
  if (raw.length > MAX_LINES) return { error: `A stocktake can hold at most ${MAX_LINES} lines.` };
  const out = new Map<string, number | null>();
  for (const r of raw as Record<string, unknown>[]) {
    const id = str(r.inventoryItemId);
    if (!id) return { error: "A line has no item." };
    if (r.counted === null || r.counted === "" || r.counted === undefined) {
      out.set(id, null);
      continue;
    }
    const n = Number(r.counted);
    if (!Number.isInteger(n) || n < 0) return { error: "Counts must be whole numbers, zero or more." };
    out.set(id, n);
  }
  return { lines: out };
}

const pickInfo = (i: ItemInfo) => ({ item: i.item, sku: i.sku });
const sumQty = (ls: DocLine[]) => ls.reduce((a, l) => a + l.qty, 0);

function movement(
  key: string,
  type: MovementInput["type"],
  reference: string,
  href: string,
  l: DocLine,
  locationId: string,
  location: string,
  delta: number,
  note: string,
): MovementInput {
  return {
    key,
    type,
    reference,
    href,
    inventoryItemId: l.inventoryItemId,
    item: l.item,
    sku: l.sku,
    locationId,
    location,
    delta,
    note,
  };
}

type LocationLevelsPage = {
  location: {
    inventoryLevels: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: {
        item: { id: string; sku?: string; tracked?: boolean; variant?: { title?: string; product?: { title?: string } } };
      }[];
    };
  } | null;
};

/** Every item stocked at a location (for "Load all items" on a stocktake). */
async function readLocationItems(
  locationId: string,
): Promise<{ items?: { inventoryItemId: string; item: string; sku: string }[]; error?: string }> {
  const items: { inventoryItemId: string; item: string; sku: string }[] = [];
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    const res: ShopifyResult<LocationLevelsPage> = await shopifyQuery<LocationLevelsPage>(
      `query($id: ID!, $after: String) {
        location(id: $id) {
          inventoryLevels(first: 100, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { item { id sku tracked variant { title product { title } } } }
          }
        }
      }`,
      { id: toGid("Location", locationId), after },
    );
    if (!res.ok) return { error: res.error };
    const levels: NonNullable<LocationLevelsPage["location"]>["inventoryLevels"] | undefined =
      res.data.location?.inventoryLevels;
    if (!levels) return { error: "That location no longer exists in Shopify." };
    for (const { item } of levels.nodes) {
      if (item.tracked === false) continue;
      const product = str(item.variant?.product?.title);
      const variant = str(item.variant?.title);
      items.push({
        inventoryItemId: fromGid(item.id),
        item: (variant && variant !== "Default Title" ? `${product} — ${variant}` : product) || "Unknown item",
        sku: str(item.sku),
      });
    }
    if (!levels.pageInfo.hasNextPage) break;
    after = levels.pageInfo.endCursor;
  }
  return { items };
}

// --- cross-document views ------------------------------------------------------------------

/** Units still expected per `itemId:locationId`: open PO lines (onOrder) and sent transfers (inTransit). */
export async function openInboundByItem(): Promise<Map<string, { onOrder: number; inTransit: number }>> {
  const out = new Map<string, { onOrder: number; inTransit: number }>();
  if (!isDbConfigured()) return out;
  try {
    for (const kind of ["purchase-orders", "transfers"] as const) {
      const c = await col(kind);
      if (!c) return out;
      const docs = await c.find({ status: { $in: [...OPEN_INBOUND_STATUSES] } }).toArray();
      for (const d of docs) {
        const loc = String(kind === "transfers" ? d.toLocationId : d.locationId);
        for (const l of lines(d)) {
          const remaining = Math.max(0, l.qty - (l.received ?? 0));
          if (!remaining) continue;
          const k = `${l.inventoryItemId}:${loc}`;
          const cur = out.get(k) ?? { onOrder: 0, inTransit: 0 };
          if (kind === "purchase-orders") cur.onOrder += remaining;
          else cur.inTransit += remaining;
          out.set(k, cur);
        }
      }
    }
  } catch {
    // Inventory still lists without the inbound columns.
  }
  return out;
}

/** The Inbound board: every PO and transfer whose goods are still on the way. */
export async function listInbound(): Promise<{ rows: Row[]; error?: string }> {
  if (!isDbConfigured()) return { rows: [], error: "No database configured — connect MongoDB to track inbound stock." };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows: Row[] = [];
    for (const kind of ["purchase-orders", "transfers"] as const) {
      const c = await col(kind);
      if (!c) return { rows: [], error: DB_UNAVAILABLE };
      const docs = await c.find({ status: { $in: [...OPEN_INBOUND_STATUSES] } }).toArray();
      for (const d of docs) {
        const r = toRow(kind, d);
        const due = String(d.eta || d.expectedAt || "");
        rows.push({
          id: `${kind}:${r.id}`,
          docId: r.id,
          kind,
          type: kind === "purchase-orders" ? "purchase" : "transfer",
          number: d.number,
          origin: kind === "purchase-orders" ? d.supplier : d.from,
          destination: kind === "purchase-orders" ? d.location : d.to,
          status: d.status,
          carrier: d.carrier ?? "",
          trackingNumber: d.trackingNumber ?? "",
          due,
          timing: !due ? "no_date" : due < today ? "overdue" : due === today ? "today" : "upcoming",
          remainingUnits: r.remainingUnits,
          createdAt: d.createdAt,
        });
      }
    }
    rows.sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")));
    return { rows };
  } catch {
    return { rows: [], error: DB_UNAVAILABLE };
  }
}
