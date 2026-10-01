"use server";

import { getCurrentUser } from "./auth";
import { writeAppSettings } from "./app-settings";
import { isConsignmentTemplate } from "@/config/consignment-schema";

/** Save the consignment ID schema picked on the Settings page. */
export async function saveConsignmentTemplateAction(
  template: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };
  if (!isConsignmentTemplate(template)) return { ok: false, message: "Pick one of the listed schemas." };
  try {
    await writeAppSettings({ consignmentTemplate: template });
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save the setting." };
  }
}
