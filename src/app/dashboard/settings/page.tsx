import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readAppSettings } from "@/lib/app-settings";
import { SettingsView } from "@/components/dashboard/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await readAppSettings();
  return <SettingsView user={user} consignmentTemplate={settings.consignmentTemplate} />;
}
