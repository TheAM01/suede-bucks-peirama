import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readIntegrations, toView } from "@/lib/integrations";
import { IntegrationsView } from "@/components/dashboard/integrations-view";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const config = await readIntegrations();
  return <IntegrationsView shopify={toView(config.shopify)} />;
}
