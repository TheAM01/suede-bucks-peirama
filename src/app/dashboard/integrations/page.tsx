import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { readIntegrations, toView } from "@/lib/integrations";
import { readGrantedScopes } from "@/lib/shopify-client";
import { IntegrationsView } from "@/components/dashboard/integrations-view";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  await requirePage("/dashboard/integrations");

  const config = await readIntegrations();
  const grantedScopes = config.shopify ? await readGrantedScopes() : null;
  return <IntegrationsView shopify={toView(config.shopify)} grantedScopes={grantedScopes} />;
}
