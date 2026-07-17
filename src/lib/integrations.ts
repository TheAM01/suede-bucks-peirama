import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getDb, isDbConfigured } from "./db";

/**
 * Integration settings persistence + Shopify auth.
 *
 * Auth strategy: Shopify has phased out admin-created custom apps with
 * permanent `shpat_` tokens. The primary method here is the OAuth
 * **client credentials grant** — the app (created in the Shopify Dev
 * Dashboard) holds a Client ID + Client Secret and exchanges them
 * server-side for short-lived Admin API access tokens, which we cache
 * until just before expiry and refresh automatically. A legacy
 * admin-token method is kept for stores that still have one.
 *
 * Storage: when `MONGODB_URI` is set, config lives in the MongoDB
 * `integrations` collection (single doc, `_id: "config"`); otherwise it
 * falls back to `.data/integrations.json` (gitignored) so local dev needs
 * no database. Secrets are masked before anything reaches the client.
 */

export type ShopifyAuthMethod = "client_credentials" | "admin_token";

export interface ShopifyIntegration {
  storeDomain: string;
  apiVersion: string;
  authMethod: ShopifyAuthMethod;
  /** client-credentials grant (primary) */
  clientId?: string;
  clientSecret?: string;
  /** legacy custom-app token (fallback) */
  adminToken?: string;
  /** cached short-lived access token (client_credentials only) */
  cachedToken?: { accessToken: string; expiresAt: number } | null;
  connectedAt: string | null;
  lastCheck: { ok: boolean; message: string; at: string } | null;
}

export interface IntegrationsConfig {
  shopify: ShopifyIntegration | null;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "integrations.json");

const EMPTY: IntegrationsConfig = { shopify: null };

interface ConfigDoc {
  _id: string;
  shopify: ShopifyIntegration | null;
}

export async function readIntegrations(): Promise<IntegrationsConfig> {
  if (isDbConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        const doc = await db
          .collection<ConfigDoc>("integrations")
          .findOne({ _id: "config" });
        return { shopify: doc?.shopify ?? null };
      }
    } catch (err) {
      console.warn("[integrations] MongoDB read failed, using file fallback:", err);
    }
  }
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return { ...EMPTY, ...(JSON.parse(raw) as IntegrationsConfig) };
  } catch {
    return EMPTY;
  }
}

export async function writeIntegrations(
  config: IntegrationsConfig,
): Promise<void> {
  if (isDbConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db
          .collection<ConfigDoc>("integrations")
          .updateOne(
            { _id: "config" },
            { $set: { shopify: config.shopify } },
            { upsert: true },
          );
        return;
      }
    } catch (err) {
      console.warn("[integrations] MongoDB write failed, using file fallback:", err);
    }
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(config, null, 2), "utf8");
}

/** Mask a secret for display: keep prefix + last 4. */
export function maskToken(token: string): string {
  if (token.length <= 10) return "••••••••";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

/** Client-safe view of the config (no raw secrets). */
export interface ShopifyIntegrationView {
  storeDomain: string;
  apiVersion: string;
  authMethod: ShopifyAuthMethod;
  /** masked client ID or masked legacy token, depending on method */
  credentialMasked: string;
  clientIdMasked: string | null;
  /** whether a live short-lived token is currently cached */
  hasFreshToken: boolean;
  connectedAt: string | null;
  lastCheck: ShopifyIntegration["lastCheck"];
}

export function toView(
  s: ShopifyIntegration | null,
): ShopifyIntegrationView | null {
  if (!s) return null;
  return {
    storeDomain: s.storeDomain,
    apiVersion: s.apiVersion,
    authMethod: s.authMethod,
    credentialMasked:
      s.authMethod === "client_credentials"
        ? maskToken(s.clientSecret ?? "")
        : maskToken(s.adminToken ?? ""),
    clientIdMasked:
      s.authMethod === "client_credentials" && s.clientId
        ? maskToken(s.clientId)
        : null,
    hasFreshToken: Boolean(
      s.cachedToken && s.cachedToken.expiresAt > Date.now(),
    ),
    connectedAt: s.connectedAt,
    lastCheck: s.lastCheck,
  };
}

interface TokenResult {
  ok: boolean;
  message: string;
  accessToken?: string;
  /** set when a new token was minted and should be persisted */
  newCache?: { accessToken: string; expiresAt: number };
}

/** Refresh margin so we never use a token in its final minute. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Exchange client credentials for a short-lived Admin API access token.
 * POST /admin/oauth/access_token { grant_type: "client_credentials" }.
 */
async function fetchClientCredentialsToken(
  s: ShopifyIntegration,
): Promise<TokenResult> {
  const url = `https://${s.storeDomain}/admin/oauth/access_token`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: s.clientId,
        client_secret: s.clientSecret,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.status === 400 || res.status === 401) {
      return {
        ok: false,
        message:
          "Token exchange rejected — check the Client ID/Secret and that the app is installed on this store.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Token endpoint responded ${res.status}. Check the store domain.`,
      };
    }
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      return { ok: false, message: "Token exchange succeeded but returned no access token." };
    }
    const ttlMs = (json.expires_in ?? 86_400) * 1000;
    return {
      ok: true,
      message: "Token minted.",
      accessToken: json.access_token,
      newCache: {
        accessToken: json.access_token,
        expiresAt: Date.now() + ttlMs - EXPIRY_MARGIN_MS,
      },
    };
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "Timed out reaching Shopify's token endpoint — check the domain."
        : "Could not reach Shopify's token endpoint — check the domain and your network.";
    return { ok: false, message: msg };
  }
}

/**
 * Resolve a usable Admin API token for the integration: the legacy stored
 * token, a still-valid cached token, or a freshly minted one.
 */
export async function resolveAccessToken(
  s: ShopifyIntegration,
): Promise<TokenResult> {
  if (s.authMethod === "admin_token") {
    if (!s.adminToken) return { ok: false, message: "No admin token stored." };
    return { ok: true, message: "Using stored admin token.", accessToken: s.adminToken };
  }
  if (!s.clientId || !s.clientSecret) {
    return { ok: false, message: "Client ID/Secret not configured." };
  }
  if (s.cachedToken && s.cachedToken.expiresAt > Date.now()) {
    return {
      ok: true,
      message: "Using cached token.",
      accessToken: s.cachedToken.accessToken,
    };
  }
  return fetchClientCredentialsToken(s);
}

export interface CheckResult {
  ok: boolean;
  message: string;
  /** persist this if present — a fresh token was minted during the check */
  newCache?: { accessToken: string; expiresAt: number };
}

/**
 * Full connection check: resolve a token (minting one if needed), then run a
 * minimal `{ shop { name currencyCode } }` query to prove domain+auth+scopes.
 */
export async function checkShopify(
  s: ShopifyIntegration,
): Promise<CheckResult> {
  const token = await resolveAccessToken(s);
  if (!token.ok || !token.accessToken) {
    return { ok: false, message: token.message };
  }

  const url = `https://${s.storeDomain}/admin/api/${s.apiVersion}/graphql.json`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token.accessToken,
      },
      body: JSON.stringify({ query: "{ shop { name currencyCode } }" }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: "Authentication failed — the app may lack Admin API scopes for this store.",
        newCache: token.newCache,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Shopify responded ${res.status}. Check the store domain and API version.`,
        newCache: token.newCache,
      };
    }
    const json = (await res.json()) as {
      data?: { shop?: { name?: string; currencyCode?: string } };
      errors?: { message?: string }[];
    };
    if (json.errors?.length) {
      return {
        ok: false,
        message: json.errors[0]?.message ?? "GraphQL error from Shopify.",
        newCache: token.newCache,
      };
    }
    const shop = json.data?.shop;
    if (!shop?.name) {
      return {
        ok: false,
        message: "Connected, but the response was missing shop data.",
        newCache: token.newCache,
      };
    }
    return {
      ok: true,
      message: `Connected to “${shop.name}” (${shop.currencyCode ?? "?"}).`,
      newCache: token.newCache,
    };
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "Timed out reaching Shopify — check the domain."
        : "Could not reach Shopify — check the domain and your network.";
    return { ok: false, message: msg, newCache: token.newCache };
  }
}
