import "server-only";
import {
  readIntegrations,
  writeIntegrations,
  resolveAccessToken,
} from "./integrations";

/**
 * Reusable Admin GraphQL client. Resolves (and auto-refreshes) the access
 * token from the stored integration, persists refreshed token caches, and
 * normalizes errors. This is the single seam the data-migration phases build
 * on: every future Shopify read/write goes through `shopifyQuery()`.
 */

export type ShopifyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

/** `123` → `gid://shopify/Product/123` (readers strip the prefix off ids). */
export const toGid = (type: string, id: string): string =>
  id.startsWith("gid://") ? id : `gid://shopify/${type}/${id}`;

/** `gid://shopify/Product/123` → `123`. */
export const fromGid = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  const i = s.lastIndexOf("/");
  return i === -1 ? s : s.slice(i + 1);
};

export async function shopifyQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<ShopifyResult<T>> {
  const config = await readIntegrations();
  const s = config.shopify;
  if (!s) {
    return {
      ok: false,
      error: "Shopify is not connected — configure it on the Integrations page.",
    };
  }

  const token = await resolveAccessToken(s);
  if (!token.ok || !token.accessToken) {
    return { ok: false, error: token.message };
  }
  // Persist a freshly minted token so subsequent calls reuse it.
  if (token.newCache) {
    s.cachedToken = token.newCache;
    config.shopify = s;
    await writeIntegrations(config);
  }

  const url = `https://${s.storeDomain}/admin/api/${s.apiVersion}/graphql.json`;
  try {
    let res: Response;
    // GraphQL cost-based throttling: retry a 429 twice with backoff.
    for (let attempt = 0; ; attempt++) {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token.accessToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (res.status !== 429 || attempt >= 2) break;
      const retryAfter = Number(res.headers.get("Retry-After"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * (attempt + 1);
      await new Promise((r) => setTimeout(r, delayMs));
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        status: res.status,
        error: "Shopify rejected the credentials — re-check scopes on the Integrations page.",
      };
    }
    if (res.status === 402) {
      return {
        ok: false,
        status: 402,
        error:
          "Shopify store is frozen — its trial ended or a payment is outstanding. Reactivate it in Shopify admin.",
      };
    }
    if (res.status === 429) {
      return { ok: false, status: 429, error: "Shopify rate limit hit — retry shortly." };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: `Shopify responded ${res.status}.` };
    }

    const json = (await res.json()) as {
      data?: T;
      errors?: { message?: string }[];
    };
    if (json.errors?.length) {
      return {
        ok: false,
        error: json.errors.map((e) => e.message).filter(Boolean).join("; ") || "GraphQL error.",
      };
    }
    if (json.data === undefined) {
      return { ok: false, error: "Shopify returned no data." };
    }
    return { ok: true, data: json.data };
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "Timed out reaching Shopify."
        : "Could not reach Shopify.";
    return { ok: false, error: msg };
  }
}
