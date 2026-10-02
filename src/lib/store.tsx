"use client";

import * as React from "react";
import type { Row } from "@/config/resource-types";

/**
 * Client data store. Fetches real rows from `/api/resources/[resource]` —
 * live Shopify data when a store is connected, MongoDB for app-owned
 * resources, and EMPTY otherwise. There is no seed/placeholder data.
 *
 * Writes are optimistic: create / update / remove (and `patchRows` for
 * workflow actions) change the cached rows immediately and roll back if the
 * server refuses. A created row is a `_pending` placeholder until the server
 * returns the real one.
 */

export interface ResourceState {
  rows: Row[];
  loading: boolean;
  /** "shopify" (live), "db" (app-owned), "empty" (no store connected) */
  source: "shopify" | "db" | "empty";
  /** true for Shopify-synced resources until write mutations land */
  readOnly: boolean;
  error: string | null;
}

const INITIAL: ResourceState = {
  rows: [],
  loading: true,
  source: "empty",
  readOnly: true,
  error: null,
};

export interface MutationResult {
  ok: boolean;
  error?: string;
}

interface StoreContextValue {
  get: (resource: string) => ResourceState;
  /** kick off a fetch if this resource hasn't loaded yet */
  ensure: (resource: string) => void;
  refresh: (resource: string) => void;
  create: (resource: string, data: Record<string, unknown>) => Promise<MutationResult>;
  update: (resource: string, id: string, patch: Record<string, unknown>) => Promise<MutationResult>;
  remove: (resource: string, id: string) => Promise<MutationResult>;
  /** optimistic local patch for custom writes; returns a rollback (optionally for some ids only) */
  patchRows: (
    resource: string,
    ids: string[],
    patch: Record<string, unknown> | ((row: Row) => Record<string, unknown>),
  ) => (only?: string[]) => void;
}

const StoreContext = React.createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = React.useState<Record<string, ResourceState>>({});
  const inFlight = React.useRef<Set<string>>(new Set());

  const load = React.useCallback(async (resource: string) => {
    if (inFlight.current.has(resource)) return;
    inFlight.current.add(resource);
    try {
      const res = await fetch(`/api/resources/${resource}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setCache((prev) => ({
          ...prev,
          [resource]: {
            ...INITIAL,
            loading: false,
            error: body?.error ?? `Failed to load (${res.status}).`,
          },
        }));
        return;
      }
      const body = (await res.json()) as Omit<ResourceState, "loading">;
      setCache((prev) => ({
        ...prev,
        [resource]: { ...body, loading: false, error: body.error ?? null },
      }));
    } catch {
      setCache((prev) => ({
        ...prev,
        [resource]: { ...INITIAL, loading: false, error: "Network error while loading data." },
      }));
    } finally {
      inFlight.current.delete(resource);
    }
  }, []);

  const ensure = React.useCallback(
    (resource: string) => {
      if (!(resource in cache)) void load(resource);
    },
    [cache, load],
  );

  const refresh = React.useCallback(
    (resource: string) => {
      void load(resource);
    },
    [load],
  );

  const get = React.useCallback(
    (resource: string): ResourceState => cache[resource] ?? INITIAL,
    [cache],
  );

  // --- optimistic mutations -----------------------------------------------------
  // Every write lands in the cache first, so the UI moves instantly; the server
  // answer then confirms it (and a server row replaces the guess), or the change
  // is rolled back and the caller gets the error to show.

  /** Apply `fn` to one resource's rows, if that resource is loaded. */
  const mutateRows = React.useCallback((resource: string, fn: (rows: Row[]) => Row[]) => {
    setCache((prev) => {
      const cur = prev[resource];
      if (!cur) return prev;
      return { ...prev, [resource]: { ...cur, rows: fn(cur.rows) } };
    });
  }, []);

  /** Read a resource's current rows without subscribing (for snapshots). */
  const cacheRef = React.useRef(cache);
  React.useLayoutEffect(() => {
    cacheRef.current = cache;
  }, [cache]);
  const rowsOf = (resource: string): Row[] => cacheRef.current[resource]?.rows ?? [];

  const tempId = React.useRef(0);

  const create = React.useCallback(
    async (resource: string, data: Record<string, unknown>): Promise<MutationResult> => {
      // A placeholder row shows straight away; it's marked pending (not clickable)
      // until the server returns the real one with its id and generated fields.
      const placeholderId = `pending-${++tempId.current}`;
      mutateRows(resource, (rows) => [{ ...data, id: placeholderId, _pending: true } as Row, ...rows]);
      const drop = () => mutateRows(resource, (rows) => rows.filter((r) => r.id !== placeholderId));
      try {
        const res = await fetch(`/api/resources/${resource}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = (await res.json().catch(() => null)) as { row?: Row; error?: string } | null;
        if (!res.ok || !body?.row) {
          drop();
          return { ok: false, error: body?.error ?? "Create failed." };
        }
        const row = body.row;
        mutateRows(resource, (rows) => rows.map((r) => (r.id === placeholderId ? row : r)));
        return { ok: true };
      } catch {
        drop();
        return { ok: false, error: "Network error while saving." };
      }
    },
    [mutateRows],
  );

  const update = React.useCallback(
    async (resource: string, id: string, patch: Record<string, unknown>): Promise<MutationResult> => {
      const before = rowsOf(resource).find((r) => r.id === id);
      mutateRows(resource, (rows) => rows.map((r) => (r.id === id ? { ...r, ...patch, id } : r)));
      const rollback = () => {
        if (before) mutateRows(resource, (rows) => rows.map((r) => (r.id === id ? before : r)));
      };
      try {
        const res = await fetch(`/api/resources/${resource}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const body = (await res.json().catch(() => null)) as { row?: Row; error?: string } | null;
        if (!res.ok) {
          rollback();
          return { ok: false, error: body?.error ?? "Update failed." };
        }
        // Prefer the server's row — it carries fields the optimistic merge can't
        // know (timestamps, resolved names, recomputed totals).
        if (body?.row) {
          const serverRow = body.row;
          mutateRows(resource, (rows) => rows.map((r) => (r.id === id ? serverRow : r)));
        }
        return { ok: true };
      } catch {
        rollback();
        return { ok: false, error: "Network error while saving." };
      }
    },
    [mutateRows],
  );

  const remove = React.useCallback(
    async (resource: string, id: string): Promise<MutationResult> => {
      const rows = rowsOf(resource);
      const index = rows.findIndex((r) => r.id === id);
      const before = index >= 0 ? rows[index] : undefined;
      mutateRows(resource, (rs) => rs.filter((r) => r.id !== id));
      const rollback = () => {
        if (!before) return;
        mutateRows(resource, (rs) =>
          rs.some((r) => r.id === id) ? rs : [...rs.slice(0, index), before, ...rs.slice(index)],
        );
      };
      try {
        const res = await fetch(`/api/resources/${resource}/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          rollback();
          return { ok: false, error: body?.error ?? "Delete failed." };
        }
        return { ok: true };
      } catch {
        rollback();
        return { ok: false, error: "Network error while deleting." };
      }
    },
    [mutateRows],
  );

  /**
   * Optimistically patch rows for a write that doesn't go through
   * create/update/remove (workflow actions, document steps). Returns a
   * rollback that restores exactly those rows as they were.
   */
  const patchRows = React.useCallback(
    (resource: string, ids: string[], patch: Record<string, unknown> | ((row: Row) => Record<string, unknown>)) => {
      const wanted = new Set(ids);
      const before = new Map(rowsOf(resource).filter((r) => wanted.has(r.id)).map((r) => [r.id, r]));
      mutateRows(resource, (rows) =>
        rows.map((r) => (wanted.has(r.id) ? { ...r, ...(typeof patch === "function" ? patch(r) : patch), id: r.id } : r)),
      );
      return (only?: string[]) => {
        const restore = only ? new Set(only) : wanted;
        mutateRows(resource, (rows) => rows.map((r) => (restore.has(r.id) && before.has(r.id) ? before.get(r.id)! : r)));
      };
    },
    [mutateRows],
  );

  const value = React.useMemo(
    () => ({ get, ensure, refresh, create, update, remove, patchRows }),
    [get, ensure, refresh, create, update, remove, patchRows],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}

/** Subscribe to one resource — triggers its fetch on first use. */
export function useResource(resource: string): ResourceState {
  const store = useStore();
  React.useEffect(() => {
    store.ensure(resource);
  }, [store, resource]);
  return store.get(resource);
}
