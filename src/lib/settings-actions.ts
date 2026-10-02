"use server";

import { actionGuard } from "./guard";
import { writeAppSettings } from "./app-settings";
import { isConsignmentTemplate } from "@/config/consignment-schema";
import { can } from "@/config/permissions";

const canManageSettings = () => actionGuard((u) => can(u, "settings", "manage"));

/** Save the consignment ID schema picked on the Settings page. */
export async function saveConsignmentTemplateAction(
  template: string,
): Promise<{ ok: boolean; message?: string }> {
  const g = await canManageSettings();
  if (g.error) return { ok: false, message: g.error };
  if (!isConsignmentTemplate(template)) return { ok: false, message: "Pick one of the listed schemas." };
  try {
    await writeAppSettings({ consignmentTemplate: template });
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save the setting." };
  }
}

/** Whether the Till may sell items whose stock at its store is 0 or below. */
export async function savePosOutOfStockAction(allow: boolean): Promise<{ ok: boolean; message?: string }> {
  const g = await canManageSettings();
  if (g.error) return { ok: false, message: g.error };
  try {
    await writeAppSettings({ posAllowOutOfStock: allow === true });
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save the setting." };
  }
}
