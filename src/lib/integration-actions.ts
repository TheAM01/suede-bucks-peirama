"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
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
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };

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
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };

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
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const config = await readIntegrations();
  config.shopify = null;
  await writeIntegrations(config);
  revalidatePath("/dashboard/integrations");
  return { ok: true, message: "Shopify disconnected." };
}
