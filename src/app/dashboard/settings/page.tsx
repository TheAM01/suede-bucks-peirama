import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { readAppSettings } from "@/lib/app-settings";
import { SettingsView } from "@/components/dashboard/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePage("/dashboard/settings");
  const settings = await readAppSettings();
  return (
    <SettingsView
      user={user}
      consignmentTemplate={settings.consignmentTemplate}
      posAllowOutOfStock={settings.posAllowOutOfStock}
    />
  );
}
