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

const asIdList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * Segment membership is the stored `customerIds` list; `members` is always
 * derived from it on read so the count can never drift from the list, and is
 * stripped on write so a stale value can't be persisted.
 */
function normalizeRow(resource: string, row: Row): Row {
  if (resource !== "segments") return row;
  const customerIds = asIdList(row.customerIds);
  return { ...row, customerIds, members: customerIds.length };
}

function sanitizeWrite(
  resource: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const { id: _ignored, ...clean } = data;
  void _ignored;
  if (resource !== "segments") return clean;
  const { members: _derived, ...rest } = clean;
  void _derived;
  if ("customerIds" in rest) rest.customerIds = asIdList(rest.customerIds);
  return rest;
}

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
    return { rows: docs.map((d) => normalizeRow(resource, toRow(d))) };
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
    const clean = sanitizeWrite(resource, data);
    const res = await db
      .collection(APP_OWNED_COLLECTIONS[resource])
      .insertOne(clean);
    return {
      row: normalizeRow(resource, {
        ...clean,
        id: res.insertedId.toHexString(),
      } as Row),
    };
  } catch {
    return { error: DB_UNAVAILABLE };
  }
}

export async function updateAppRow(
  resource: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ row?: Row; error?: string }> {
  if (!ObjectId.isValid(id)) return { error: "Invalid record id." };
  try {
    const db = await getDb();
    if (!db) return { error: DB_UNAVAILABLE };
    const clean = sanitizeWrite(resource, patch);
    // Return the saved document so the client picks up derived fields
    // (a segment's `members`) instead of merging the patch optimistically.
    const doc = await db
      .collection<Doc>(APP_OWNED_COLLECTIONS[resource])
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: clean },
        { returnDocument: "after" },
      );
    if (!doc) return { error: "Record not found." };
    return { row: normalizeRow(resource, toRow(doc)) };
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
