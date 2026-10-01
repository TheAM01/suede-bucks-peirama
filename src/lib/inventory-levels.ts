import "server-only";
import { getDb, isDbConfigured } from "./db";
import { DB_UNAVAILABLE } from "./app-data";
import { shopifyQuery, fromGid, type ShopifyResult } from "./shopify-client";
import { openInboundByItem } from "./inventory-docs";
import type { Row } from "@/config/resource-types";

/**
 * Inventory levels — one row per tracked variant per location it's stocked
 * at, read live from Shopify (on hand / committed / available / incoming,
 * unit cost), with two app-side additions merged on top:
 *
 * - reorder point and reorder quantity, set per item × location and stored
 *   in MongoDB (`app_reorder_points`) — Shopify has no such fields;
 * - On order (open purchase-order lines) and In transit (sent transfers),
 *   from src/lib/inventory-docs.ts.
 *
 * Status: Out when available ≤ 0, Low when available ≤ the reorder point
 * (or ≤ 5 when no reorder point is set), else In stock.
 */

const REORDER = "app_reorder_points";
/** Low-stock threshold for items without a reorder point. */
export const DEFAULT_LOW_STOCK = 5;
/** 100 variants × 10 levels per page: requested cost ~435 (measured 87 per 20), under Shopify's 1,000 cap. */
const PAGE = 100;
const MAX_PAGES = 30;
const THROTTLE_RETRIES = 5;

type VariantPage = {
  productVariants: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: {
      id: string;
      sku?: string;
      title?: string;
      product?: { title?: string };
      inventoryItem?: {
        id: string;
        tracked?: boolean;
        unitCost?: { amount?: string } | null;
        inventoryLevels?: {
          nodes: { location: { id: string; name: string }; quantities: { name: string; quantity: number }[] }[];
        };
      } | null;
    }[];
  };
};

interface ReorderDoc {
  _id: string;
  reorderPoint: number;
  reorderQty: number;
}

async function readReorderPoints(): Promise<Map<string, ReorderDoc>> {
  const out = new Map<string, ReorderDoc>();
  if (!isDbConfigured()) return out;
  try {
    const db = await getDb();
    if (!db) return out;
    for (const d of await db.collection<ReorderDoc>(REORDER).find().toArray()) out.set(d._id, d);
  } catch {
    // Levels still list, just without reorder points.
  }
  return out;
}

/** Big catalogs drain Shopify's query-cost bucket; a "Throttled" reply means wait and retry, not fail. */
async function queryWithBackoff(query: string, variables: Record<string, unknown>): Promise<ShopifyResult<VariantPage>> {
  for (let attempt = 0; ; attempt++) {
    const res = await shopifyQuery<VariantPage>(query, variables);
    if (res.ok || !/throttled/i.test(res.error) || attempt >= THROTTLE_RETRIES) return res;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
}

export async function readInventoryLevels(): Promise<{ rows: Row[]; error?: string }> {
  const [reorder, inbound] = await Promise.all([readReorderPoints(), openInboundByItem()]);
  const rows: Row[] = [];
  let after: string | null = null;
  let truncated = false;

  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) {
      truncated = true;
      break;
    }
    const res: ShopifyResult<VariantPage> = await queryWithBackoff(
      `query($after: String) {
        productVariants(first: ${PAGE}, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id sku title
            product { title }
            inventoryItem {
              id tracked
              unitCost { amount }
              inventoryLevels(first: 10) {
                nodes {
                  location { id name }
                  quantities(names: ["available", "on_hand", "committed", "incoming"]) { name quantity }
                }
              }
            }
          }
        }
      }`,
      { after },
    );
    if (!res.ok) return { rows, error: res.error };

    for (const v of res.data.productVariants.nodes) {
      const inv = v.inventoryItem;
      if (!inv || inv.tracked === false) continue;
      const itemId = fromGid(inv.id);
      const productTitle = String(v.product?.title ?? "");
      const variantTitle = String(v.title ?? "");
      const name = variantTitle && variantTitle !== "Default Title" ? `${productTitle} — ${variantTitle}` : productTitle;
      const unitCost = Number(inv.unitCost?.amount ?? 0) || 0;

      for (const lvl of inv.inventoryLevels?.nodes ?? []) {
        const locationId = fromGid(lvl.location.id);
        const q = (n: string) => lvl.quantities.find((x) => x.name === n)?.quantity ?? 0;
        const key = `${itemId}:${locationId}`;
        const rp = reorder.get(key);
        const reorderPoint = rp?.reorderPoint ?? 0;
        const reorderQty = rp?.reorderQty ?? 0;
        const available = q("available");
        const onHand = q("on_hand");
        const { onOrder = 0, inTransit = 0 } = inbound.get(key) ?? {};
        const threshold = reorderPoint > 0 ? reorderPoint : DEFAULT_LOW_STOCK;
        const status = available <= 0 ? "out" : available <= threshold ? "low" : "in_stock";
        // Suggest topping up to reorder point + reorder qty, net of what's already coming.
        const suggested =
          status === "in_stock"
            ? 0
            : Math.max(0, (reorderQty || threshold * 2) - Math.max(0, available) - onOrder - inTransit);

        rows.push({
          // item × location — also how a reorder-point edit finds its row (saveReorderPoint)
          id: key,
          variantId: fromGid(v.id),
          inventoryItemId: itemId,
          name,
          sku: String(v.sku ?? ""),
          locationId,
          location: lvl.location.name,
          onHand,
          committed: q("committed"),
          available,
          incoming: q("incoming"),
          onOrder,
          inTransit,
          reorderPoint,
          reorderQty,
          suggested,
          unitCost,
          stockValue: Math.max(0, onHand) * unitCost,
          status,
        });
      }
    }
    if (!res.data.productVariants.pageInfo.hasNextPage) break;
    after = res.data.productVariants.pageInfo.endCursor;
  }

  return {
    rows,
    error: truncated ? `Showing the first ${PAGE * MAX_PAGES} variants — the rest weren't loaded.` : undefined,
  };
}

/** Save the app-side reorder settings for one stock row (`id` = `inventoryItemId:locationId`). */
export async function saveReorderPoint(id: string, patch: Record<string, unknown>): Promise<{ error?: string }> {
  const [itemId, locationId] = id.split(":");
  if (!itemId || !locationId) return { error: "That stock row is missing its item or location." };
  const reorderPoint = Number(patch.reorderPoint ?? 0);
  const reorderQty = Number(patch.reorderQty ?? 0);
  if (![reorderPoint, reorderQty].every((n) => Number.isInteger(n) && n >= 0)) {
    return { error: "Reorder point and quantity must be whole numbers, zero or more." };
  }
  if (!isDbConfigured()) return { error: "No database configured — connect MongoDB to save reorder points." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    await db
      .collection<ReorderDoc>(REORDER)
      .updateOne({ _id: `${itemId}:${locationId}` }, { $set: { reorderPoint, reorderQty } }, { upsert: true });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}
