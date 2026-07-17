import "server-only";
import { ObjectId } from "mongodb";
import { getDb, isDbConfigured } from "./db";
import type { Row } from "@/config/resource-types";

/**
 * App-owned resources — data with no Shopify home. Stored in MongoDB, one
 * collection per resource. Without a configured database these read as empty
 * and writes fail with a clear error (never silently held in memory).
 */

export const APP_OWNED_COLLECTIONS: Record<string, string> = {
  registers: "app_registers",
  "pos-staff": "app_pos_staff",
  segments: "app_segments",
};

export function isAppOwned(resource: string): boolean {
  return resource in APP_OWNED_COLLECTIONS;
}

export const DB_UNAVAILABLE =
  "MongoDB is not reachable — records can't be loaded or saved. Check MONGODB_URI.";

type Doc = { _id: ObjectId } & Record<string, unknown>;

function toRow(doc: Doc): Row {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() } as Row;
}

export async function listAppRows(
  resource: string,
): Promise<{ rows: Row[]; error?: string }> {
  if (!isDbConfigured()) {
    return { rows: [], error: "No database configured — connect MongoDB to store records." };
  }
  try {
    const db = await getDb();
    if (!db) return { rows: [], error: DB_UNAVAILABLE };
    const docs = await db
      .collection<Doc>(APP_OWNED_COLLECTIONS[resource])
      .find()
      .sort({ _id: -1 })
      .limit(500)
      .toArray();
    return { rows: docs.map(toRow) };
  } catch {
    return { rows: [], error: DB_UNAVAILABLE };
  }
}

export async function createAppRow(
  resource: string,
  data: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const { id: _ignored, ...clean } = data;
    void _ignored;
    const res = await db
      .collection(APP_OWNED_COLLECTIONS[resource])
      .insertOne(clean);
    return { row: { ...clean, id: res.insertedId.toHexString() } as Row };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function updateAppRow(
  resource: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const { id: _ignored, ...clean } = patch;
    void _ignored;
    await db
      .collection(APP_OWNED_COLLECTIONS[resource])
      .updateOne({ _id: new ObjectId(id) }, { $set: clean });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function deleteAppRow(
  resource: string,
  id: string,
): Promise<{ error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    await db
      .collection(APP_OWNED_COLLECTIONS[resource])
      .deleteOne({ _id: new ObjectId(id) });
    return {};
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}
