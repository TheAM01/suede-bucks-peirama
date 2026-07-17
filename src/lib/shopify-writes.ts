import "server-only";
import { shopifyQuery, toGid, fromGid } from "./shopify-client";
import type { Row } from "@/config/resource-types";

/**
 * Live Shopify writes (migration Phase 4): one mutation mapper per resource,
 * keyed to the same form fields declared in `src/config/resources.ts`.
 * Every mutation checks `userErrors` and surfaces Shopify's validation
 * messages verbatim so the drawer can show them. Resources stay read-only
 * when Shopify has no sane write path (transactions, abandoned checkouts,
 * derived categories) — and individual unsupported operations return a clear
 * explanation instead of a generic failure.
 *
 * Requires the `write_*` scopes listed in `shopify-scopes.ts`.
 */

export interface WriteResult {
  row?: Row;
  error?: string;
}

export interface ShopifyWriter {
  create?: (values: Record<string, unknown>) => Promise<WriteResult>;
  update?: (id: string, patch: Record<string, unknown>) => Promise<WriteResult>;
  remove?: (id: string) => Promise<WriteResult>;
  /** Human explanations for operations Shopify itself doesn't support. */
  notes?: { create?: string; update?: string; remove?: string };
}

const str = (v: unknown): string => (v == null ? "" : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type UserError = { field?: string[] | null; message: string };
const userErrorText = (errs: unknown): string | undefined => {
  const list = (errs ?? []) as UserError[];
  if (!list.length) return undefined;
  return list.map((e) => e.message).join("; ");
};

const get = (o: unknown, ...path: string[]): unknown => {
  let cur: unknown = o;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
};

/** Run a mutation and unwrap `payloadKey.userErrors`. */
async function mutate(
  query: string,
  variables: Record<string, unknown>,
  payloadKey: string,
): Promise<{ payload?: Record<string, unknown>; error?: string }> {
  const res = await shopifyQuery<Record<string, unknown>>(query, variables);
  if (!res.ok) return { error: res.error };
  const payload = res.data[payloadKey] as Record<string, unknown> | undefined;
  const err = userErrorText(get(payload, "userErrors"));
  if (err) return { error: err };
  if (!payload) return { error: "Shopify returned no mutation payload." };
  return { payload };
}

// --- products -----------------------------------------------------------------

/** Variant fields (price / SKU / cost) live on the default variant. */
async function setVariantFields(
  productGid: string,
  variantGid: string | undefined,
  values: Record<string, unknown>,
): Promise<string | undefined> {
  const hasAny = "price" in values || "sku" in values || "cost" in values;
  if (!hasAny || !variantGid) return undefined;
  const variant: Record<string, unknown> = { id: variantGid };
  if ("price" in values) variant.price = String(num(values.price));
  const inventoryItem: Record<string, unknown> = {};
  if ("sku" in values) inventoryItem.sku = str(values.sku);
  if ("cost" in values) inventoryItem.cost = num(values.cost);
  if (Object.keys(inventoryItem).length) variant.inventoryItem = inventoryItem;

  const { error } = await mutate(
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }`,
    { productId: productGid, variants: [variant] },
    "productVariantsBulkUpdate",
  );
  return error;
}

function productInput(values: Record<string, unknown>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if ("name" in values) input.title = str(values.name);
  if ("vendor" in values) input.vendor = str(values.vendor);
  if ("category" in values) input.productType = str(values.category);
  if ("status" in values) input.status = str(values.status).toUpperCase();
  if ("description" in values) input.descriptionHtml = str(values.description);
  return input;
}

const products: ShopifyWriter = {
  async create(values) {
    const { payload, error } = await mutate(
      `mutation($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product { id variants(first: 1) { nodes { id } } }
          userErrors { field message }
        }
      }`,
      { product: productInput(values) },
      "productCreate",
    );
    if (error) return { error };
    const productGid = str(get(payload, "product", "id"));
    const variantGid = str(
      (get(payload, "product", "variants", "nodes") as Row[] | undefined)?.[0]?.id,
    );
    const variantError = await setVariantFields(productGid, variantGid, values);
    if (variantError) return { error: `Product created, but variant update failed: ${variantError}` };
    return {
      row: {
        id: fromGid(productGid),
        name: str(values.name),
        sku: str(values.sku),
        category: str(values.category) || "Uncategorized",
        vendor: str(values.vendor),
        price: num(values.price),
        cost: num(values.cost),
        stock: num(values.stock),
        status: str(values.status) || "active",
        description: str(values.description),
      },
    };
  },

  async update(id, patch) {
    const gid = toGid("Product", id);
    const { payload, error } = await mutate(
      `mutation($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id variants(first: 1) { nodes { id } } }
          userErrors { field message }
        }
      }`,
      { product: { id: gid, ...productInput(patch) } },
      "productUpdate",
    );
    if (error) return { error };
    const variantGid = str(
      (get(payload, "product", "variants", "nodes") as Row[] | undefined)?.[0]?.id,
    );
    const variantError = await setVariantFields(gid, variantGid, patch);
    if (variantError) return { error: `Product saved, but variant update failed: ${variantError}` };
    return {};
  },

  async remove(id) {
    const { error } = await mutate(
      `mutation($input: ProductDeleteInput!) {
        productDelete(input: $input) { deletedProductId userErrors { field message } }
      }`,
      { input: { id: toGid("Product", id) } },
      "productDelete",
    );
    return { error };
  },
};

// --- customers ------------------------------------------------------------------

function customerInput(values: Record<string, unknown>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if ("name" in values) {
    const name = str(values.name).trim();
    const i = name.lastIndexOf(" ");
    input.firstName = i === -1 ? name : name.slice(0, i);
    input.lastName = i === -1 ? "" : name.slice(i + 1);
  }
  if ("email" in values) input.email = str(values.email);
  if ("notes" in values) input.note = str(values.notes);
  return input;
}

const customers: ShopifyWriter = {
  async create(values) {
    const { payload, error } = await mutate(
      `mutation($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id displayName }
          userErrors { field message }
        }
      }`,
      { input: customerInput(values) },
      "customerCreate",
    );
    if (error) return { error };
    return {
      row: {
        id: fromGid(get(payload, "customer", "id")),
        name: str(get(payload, "customer", "displayName")) || str(values.name),
        email: str(values.email),
        status: "active",
        location: str(values.location),
        orders: 0,
        spent: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        notes: str(values.notes),
      },
    };
  },

  async update(id, patch) {
    const { error } = await mutate(
      `mutation($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }`,
      { input: { id: toGid("Customer", id), ...customerInput(patch) } },
      "customerUpdate",
    );
    return { error };
  },

  async remove(id) {
    const { error } = await mutate(
      `mutation($input: CustomerDeleteInput!) {
        customerDelete(input: $input) { deletedCustomerId userErrors { field message } }
      }`,
      { input: { id: toGid("Customer", id) } },
      "customerDelete",
    );
    return { error };
  },
};

// --- collections -----------------------------------------------------------------

const collections: ShopifyWriter = {
  async create(values) {
    if (str(values.type) === "automated") {
      return {
        error:
          "Automated collections need product rules — create those in Shopify admin. Manual collections can be created here.",
      };
    }
    const { payload, error } = await mutate(
      `mutation($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection { id }
          userErrors { field message }
        }
      }`,
      { input: { title: str(values.name), descriptionHtml: str(values.description) } },
      "collectionCreate",
    );
    if (error) return { error };
    return {
      row: {
        id: fromGid(get(payload, "collection", "id")),
        name: str(values.name),
        type: "manual",
        products: 0,
        status: "active",
        description: str(values.description),
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    };
  },

  async update(id, patch) {
    const input: Record<string, unknown> = { id: toGid("Collection", id) };
    if ("name" in patch) input.title = str(patch.name);
    if ("description" in patch) input.descriptionHtml = str(patch.description);
    const { error } = await mutate(
      `mutation($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection { id }
          userErrors { field message }
        }
      }`,
      { input },
      "collectionUpdate",
    );
    return { error };
  },

  async remove(id) {
    const { error } = await mutate(
      `mutation($input: CollectionDeleteInput!) {
        collectionDelete(input: $input) { deletedCollectionId userErrors { field message } }
      }`,
      { input: { id: toGid("Collection", id) } },
      "collectionDelete",
    );
    return { error };
  },
};

// --- draft orders -----------------------------------------------------------------

const draftOrders: ShopifyWriter = {
  async create(values) {
    const total = num(values.total);
    if (total <= 0) return { error: "Enter a total — the draft is created as one custom line item." };
    const { payload, error } = await mutate(
      `mutation($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder { id name }
          userErrors { field message }
        }
      }`,
      {
        input: {
          note: str(values.notes),
          lineItems: [
            { title: "Custom sale", originalUnitPrice: String(total), quantity: 1 },
          ],
        },
      },
      "draftOrderCreate",
    );
    if (error) return { error };
    return {
      row: {
        id: fromGid(get(payload, "draftOrder", "id")),
        number: str(get(payload, "draftOrder", "name")),
        customer: str(values.customer) || "—",
        total,
        status: "open",
        createdAt: new Date().toISOString().slice(0, 10),
        notes: str(values.notes),
      },
    };
  },

  async update(id, patch) {
    const { error } = await mutate(
      `mutation($id: ID!, $input: DraftOrderInput!) {
        draftOrderUpdate(id: $id, input: $input) {
          draftOrder { id }
          userErrors { field message }
        }
      }`,
      { id: toGid("DraftOrder", id), input: { note: str(patch.notes) } },
      "draftOrderUpdate",
    );
    return { error };
  },

  async remove(id) {
    const { error } = await mutate(
      `mutation($input: DraftOrderDeleteInput!) {
        draftOrderDelete(input: $input) { deletedId userErrors { field message } }
      }`,
      { input: { id: toGid("DraftOrder", id) } },
      "draftOrderDelete",
    );
    return { error };
  },
};

// --- discounts --------------------------------------------------------------------

/** "20%" → percentage 0.2 · "$10" / "10" → fixed amount. */
function discountValue(values: Record<string, unknown>):
  | { customerGets: Record<string, unknown> }
  | { error: string } {
  const type = str(values.type);
  const raw = str(values.value).replace(/[^0-9.]/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { error: 'Enter a numeric value, e.g. "20%" or "$10".' };
  }
  if (type === "percentage" || (!type && str(values.value).includes("%"))) {
    return {
      customerGets: { value: { percentage: n / 100 }, items: { all: true } },
    };
  }
  if (type === "fixed" || !type) {
    return {
      customerGets: {
        value: { discountAmount: { amount: String(n), appliesOnEachItem: false } },
        items: { all: true },
      },
    };
  }
  return {
    error:
      "Buy-X-get-Y and shipping discounts have extra configuration — create those in Shopify admin. Percentage and fixed-amount codes work here.",
  };
}

const discounts: ShopifyWriter = {
  async create(values) {
    const v = discountValue(values);
    if ("error" in v) return { error: v.error };
    const code = str(values.code).trim();
    if (!code) return { error: "A discount code is required." };
    const startsAt = str(values.startsAt)
      ? new Date(str(values.startsAt)).toISOString()
      : new Date().toISOString();
    const input: Record<string, unknown> = {
      title: code,
      code,
      startsAt,
      customerSelection: { all: true },
      customerGets: v.customerGets,
    };
    if (str(values.endsAt)) input.endsAt = new Date(str(values.endsAt)).toISOString();

    const { payload, error } = await mutate(
      `mutation($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode { id }
          userErrors { field message }
        }
      }`,
      { basicCodeDiscount: input },
      "discountCodeBasicCreate",
    );
    if (error) return { error };
    return {
      row: {
        id: fromGid(get(payload, "codeDiscountNode", "id")),
        code,
        type: str(values.type) || "percentage",
        value: str(values.value),
        status: "active",
        used: 0,
        startsAt: startsAt.slice(0, 10),
        endsAt: str(values.endsAt),
      },
    };
  },

  async update(id, patch) {
    const input: Record<string, unknown> = {};
    if ("code" in patch && str(patch.code)) {
      input.title = str(patch.code);
      input.code = str(patch.code);
    }
    if ("startsAt" in patch && str(patch.startsAt)) {
      input.startsAt = new Date(str(patch.startsAt)).toISOString();
    }
    if ("endsAt" in patch && str(patch.endsAt)) {
      input.endsAt = new Date(str(patch.endsAt)).toISOString();
    }
    if ("value" in patch || "type" in patch) {
      const v = discountValue(patch);
      if ("error" in v) return { error: v.error };
      input.customerGets = v.customerGets;
    }
    const { error } = await mutate(
      `mutation($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode { id }
          userErrors { field message }
        }
      }`,
      { id: toGid("DiscountCodeNode", id), basicCodeDiscount: input },
      "discountCodeBasicUpdate",
    );
    return { error };
  },

  async remove(id) {
    const { error } = await mutate(
      `mutation($id: ID!) {
        discountCodeDelete(id: $id) { deletedCodeDiscountId userErrors { field message } }
      }`,
      { id: toGid("DiscountCodeNode", id) },
      "discountCodeDelete",
    );
    return { error };
  },
};

// --- orders (update-only: note) ----------------------------------------------------

const orders: ShopifyWriter = {
  async update(id, patch) {
    const { error } = await mutate(
      `mutation($input: OrderInput!) {
        orderUpdate(input: $input) {
          order { id }
          userErrors { field message }
        }
      }`,
      { input: { id: toGid("Order", id), note: str(patch.notes) } },
      "orderUpdate",
    );
    return { error };
  },
  notes: {
    create:
      "Orders can't be created directly — create a draft order and complete it, or ring it up at the register.",
    remove:
      "Orders can't be deleted from here — cancel or archive them in Shopify admin to keep financial records intact.",
  },
};

// --- registry -----------------------------------------------------------------------

/**
 * Resources without an entry stay read-only: `categories` (derived from
 * product types), `transactions` / `abandoned` (immutable financial data),
 * `inventory` (quantities move via stock adjustments, not row edits), and
 * `locations` (managed in Shopify admin — deleting one strands inventory).
 */
export const SHOPIFY_WRITERS: Record<string, ShopifyWriter> = {
  products,
  customers,
  collections,
  "draft-orders": draftOrders,
  discounts,
  orders,
};
