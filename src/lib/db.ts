import "server-only";
import { MongoClient, type Db } from "mongodb";

/**
 * MongoDB access. Opt-in via env: set `MONGODB_URI` (and optionally
 * `MONGODB_DB`, default "suedebucks") and the app stores persistent data in
 * Mongo; without it, file-based fallbacks are used so local dev needs no DB.
 * The client promise is cached on globalThis so dev hot-reloads don't leak
 * connections.
 */

const globalCache = globalThis as unknown as {
  __sbMongoClient?: Promise<MongoClient>;
};

export function isDbConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!globalCache.__sbMongoClient) {
    globalCache.__sbMongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }).connect();
    // A failed connect must not poison the cache forever.
    globalCache.__sbMongoClient.catch(() => {
      globalCache.__sbMongoClient = undefined;
    });
  }
  const client = await globalCache.__sbMongoClient;
  return client.db(process.env.MONGODB_DB || "suedebucks");
}

/** Health check used by the connectivity status API. */
export async function pingDb(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
