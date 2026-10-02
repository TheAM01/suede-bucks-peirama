import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getDb, isDbConfigured } from "./db";
import {
  DEFAULT_CONSIGNMENT_TEMPLATE,
  isConsignmentTemplate,
  type ConsignmentTemplate,
} from "@/config/consignment-schema";

/**
 * Store-wide settings the server acts on (unlike currency / dashboard view,
 * which are per-browser localStorage). MongoDB `app_settings` collection, one
 * `_id: "config"` doc; `.data/settings.json` when Mongo isn't configured —
 * the same fallback pattern as src/lib/integrations.ts.
 */

export interface AppSettings {
  consignmentTemplate: ConsignmentTemplate;
  /** Till: sell items whose stock at the register's store is 0 or below (default yes — they're in hand) */
  posAllowOutOfStock: boolean;
}

const DEFAULTS: AppSettings = { consignmentTemplate: DEFAULT_CONSIGNMENT_TEMPLATE, posAllowOutOfStock: true };

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "settings.json");

interface SettingsDoc extends Partial<AppSettings> {
  _id: string;
}

/** Drop anything stale or invalid (e.g. a template removed from the list) back to its default. */
function normalize(raw: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    consignmentTemplate: isConsignmentTemplate(raw?.consignmentTemplate)
      ? raw.consignmentTemplate
      : DEFAULTS.consignmentTemplate,
    posAllowOutOfStock:
      typeof raw?.posAllowOutOfStock === "boolean" ? raw.posAllowOutOfStock : DEFAULTS.posAllowOutOfStock,
  };
}

export async function readAppSettings(): Promise<AppSettings> {
  if (isDbConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        const doc = await db.collection<SettingsDoc>("app_settings").findOne({ _id: "config" });
        return normalize(doc);
      }
    } catch (err) {
      console.warn("[app-settings] MongoDB read failed, using file fallback:", err);
    }
  }
  try {
    return normalize(JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<AppSettings>);
  } catch {
    return DEFAULTS;
  }
}

export async function writeAppSettings(patch: Partial<AppSettings>): Promise<void> {
  const next = normalize({ ...(await readAppSettings()), ...patch });
  if (isDbConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        await db
          .collection<SettingsDoc>("app_settings")
          .updateOne({ _id: "config" }, { $set: next }, { upsert: true });
        return;
      }
    } catch (err) {
      console.warn("[app-settings] MongoDB write failed, using file fallback:", err);
    }
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf8");
}
