"use server";

import { revalidatePath } from "next/cache";
import { actionGuard } from "./guard";
import { can } from "@/config/permissions";
import { shopifyQuery } from "./shopify-client";
import {
  checkShopify,
  readIntegrations,
  writeIntegrations,
  type ShopifyAuthMethod,
  type ShopifyIntegration,
} from "./integrations";

export interface IntegrationActionState {
  ok?: boolean;
  message?: string;
}

const DEFAULT_API_VERSION = "2026-01";

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain);
}

/** Save (or replace) the Shopify connection, then test it. */
export async function connectShopifyAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const g = await actionGuard((u) => can(u, "integrations", "manage"));
  if (g.error) return { ok: false, message: g.error };

  const storeDomain = String(formData.get("storeDomain") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const apiVersion =
    String(formData.get("apiVersion") ?? "").trim() || DEFAULT_API_VERSION;
  const authMethod = (
    formData.get("authMethod") === "admin_token"
      ? "admin_token"
      : "client_credentials"
  ) as ShopifyAuthMethod;

  if (!isValidDomain(storeDomain)) {
    return { ok: false, message: "Enter the *.myshopify.com domain (not your custom domain)." };
  }

  const integration: ShopifyIntegration = {
    storeDomain,
    apiVersion,
    authMethod,
    cachedToken: null,
    connectedAt: null,
    lastCheck: null,
  };

  if (authMethod === "client_credentials") {
    const clientId = String(formData.get("clientId") ?? "").trim();
    const clientSecret = String(formData.get("clientSecret") ?? "").trim();
    if (!clientId || clientId.length < 10) {
      return { ok: false, message: "Enter the app's Client ID from the Dev Dashboard." };
    }
    if (!clientSecret || clientSecret.length < 10) {
      return { ok: false, message: "Enter the app's Client Secret from the Dev Dashboard." };
    }
    integration.clientId = clientId;
    integration.clientSecret = clientSecret;
  } else {
    const adminToken = String(formData.get("adminToken") ?? "").trim();
    if (!adminToken.startsWith("shpat_") && !adminToken.startsWith("shpca_")) {
      return { ok: false, message: "That doesn't look like a legacy Admin API token (expected shpat_…)." };
    }
    integration.adminToken = adminToken;
  }

  const check = await checkShopify(integration);
  if (check.newCache) integration.cachedToken = check.newCache;
  integration.connectedAt = check.ok ? new Date().toISOString() : null;
  integration.lastCheck = {
    ok: check.ok,
    message: check.message,
    at: new Date().toISOString(),
  };

  const config = await readIntegrations();
  config.shopify = integration;
  await writeIntegrations(config);
  revalidatePath("/dashboard/integrations");
  return check.ok
    ? { ok: true, message: check.message }
    : { ok: false, message: `Saved, but the test failed: ${check.message}` };
}

/** Re-run the connection test against the stored credentials. */
export async function testShopifyAction(): Promise<IntegrationActionState> {
  const g = await actionGuard((u) => can(u, "integrations", "manage"));
  if (g.error) return { ok: false, message: g.error };

  const config = await readIntegrations();
  if (!config.shopify) return { ok: false, message: "Nothing configured yet." };

  const check = await checkShopify(config.shopify);
  if (check.newCache) config.shopify.cachedToken = check.newCache;
  config.shopify.lastCheck = {
    ok: check.ok,
    message: check.message,
    at: new Date().toISOString(),
  };
  if (check.ok && !config.shopify.connectedAt) {
    config.shopify.connectedAt = new Date().toISOString();
  }
  await writeIntegrations(config);
  revalidatePath("/dashboard/integrations");
  return { ok: check.ok, message: check.message };
}

/** Remove the stored Shopify connection. */
export async function disconnectShopifyAction(): Promise<IntegrationActionState> {
  const g = await actionGuard((u) => can(u, "integrations", "manage"));
  if (g.error) return { ok: false, message: g.error };

  const config = await readIntegrations();
  config.shopify = null;
  await writeIntegrations(config);
  revalidatePath("/dashboard/integrations");
  return { ok: true, message: "Shopify disconnected." };
}

const ORDERS_CREATE_WEBHOOK_PATH = "/api/webhooks/orders-create";

/**
 * Subscribe the store's `orders/create` webhook to this deployment's intake
 * endpoint (order address check + tab routing). Shopify only delivers to a
 * public HTTPS URL, so `baseUrl` must be the app's public origin — localhost
 * won't work. Idempotent: an existing subscription to the same URL is reused.
 */
export async function registerOrderWebhookAction(
  baseUrl: string,
): Promise<IntegrationActionState> {
  const g = await actionGuard((u) => can(u, "integrations", "manage"));
  if (g.error) return { ok: false, message: g.error };

  let origin: string;
  try {
    const u = new URL(baseUrl.trim());
    if (u.protocol !== "https:") throw new Error();
    if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname)) {
      return { ok: false, message: "Shopify can't reach localhost — use the app's public HTTPS address." };
    }
    origin = u.origin;
  } catch {
    return { ok: false, message: "Enter the app's public address, starting with https://." };
  }

  const config = await readIntegrations();
  if (!config.shopify?.clientSecret) {
    return {
      ok: false,
      message: "Webhooks are verified with the app's Client Secret — connect with client credentials first.",
    };
  }

  const uri = `${origin}${ORDERS_CREATE_WEBHOOK_PATH}`;
  const existing = await shopifyQuery<{ webhookSubscriptions: { nodes: { uri: string }[] } }>(
    `{ webhookSubscriptions(first: 50, topics: [ORDERS_CREATE]) { nodes { id uri } } }`,
  );
  if (!existing.ok) return { ok: false, message: existing.error };
  if (existing.data.webhookSubscriptions.nodes.some((n) => n.uri === uri)) {
    return { ok: true, message: `Already subscribed — new orders are sent to ${uri}.` };
  }

  const res = await shopifyQuery<{
    webhookSubscriptionCreate: { userErrors: { message: string }[] };
  }>(
    `mutation($uri: String!) {
      webhookSubscriptionCreate(topic: ORDERS_CREATE, webhookSubscription: { uri: $uri }) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }`,
    { uri },
  );
  if (!res.ok) return { ok: false, message: res.error };
  const errs = res.data.webhookSubscriptionCreate.userErrors;
  if (errs.length) return { ok: false, message: errs.map((e) => e.message).join("; ") };
  return { ok: true, message: `Subscribed — new orders are sent to ${uri}.` };
}
