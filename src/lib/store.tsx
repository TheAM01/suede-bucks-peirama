"use client";

import * as React from "react";
import type { Row } from "@/config/resource-types";

/**
 * Client data store. Fetches real rows from `/api/resources/[resource]` —
 * live Shopify data when a store is connected, MongoDB for app-owned
 * resources, and EMPTY otherwise. There is no seed/placeholder data.
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

  const create = React.useCallback(
    async (resource: string, data: Record<string, unknown>): Promise<MutationResult> => {
      try {
        const res = await fetch(`/api/resources/${resource}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = (await res.json().catch(() => null)) as
          | { row?: Row; error?: string }
          | null;
        if (!res.ok || !body?.row) {
          return { ok: false, error: body?.error ?? "Create failed." };
        }
        const row = body.row;
        setCache((prev) => {
          const cur = prev[resource];
          if (!cur) return prev;
          return { ...prev, [resource]: { ...cur, rows: [row, ...cur.rows] } };
        });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while saving." };
      }
    },
    [],
  );

  const update = React.useCallback(
    async (
      resource: string,
      id: string,
      patch: Record<string, unknown>,
    ): Promise<MutationResult> => {
      try {
        const res = await fetch(`/api/resources/${resource}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const body = (await res.json().catch(() => null)) as
          | { row?: Row; error?: string }
          | null;
        if (!res.ok) {
          return { ok: false, error: body?.error ?? "Update failed." };
        }
        // Prefer the server's row when returned — it carries server-generated
        // fields (timestamps, resolved names) the optimistic merge can't know.
        const serverRow = body?.row;
        setCache((prev) => {
          const cur = prev[resource];
          if (!cur) return prev;
          return {
            ...prev,
            [resource]: {
              ...cur,
              rows: cur.rows.map((r) =>
                r.id === id ? (serverRow ?? { ...r, ...patch, id }) : r,
              ),
            },
          };
        });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while saving." };
      }
    },
    [],
  );

  const remove = React.useCallback(
    async (resource: string, id: string): Promise<MutationResult> => {
      try {
        const res = await fetch(`/api/resources/${resource}/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          return { ok: false, error: body?.error ?? "Delete failed." };
        }
        setCache((prev) => {
          const cur = prev[resource];
          if (!cur) return prev;
          return {
            ...prev,
            [resource]: { ...cur, rows: cur.rows.filter((r) => r.id !== id) },
          };
        });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while deleting." };
      }
    },
    [],
  );

  const value = React.useMemo(
    () => ({ get, ensure, refresh, create, update, remove }),
    [get, ensure, refresh, create, update, remove],
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
