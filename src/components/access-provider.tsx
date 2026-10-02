"use client";

import * as React from "react";
import { areaKeyOf, can, type Access, type Level } from "@/config/permissions";

/**
 * The signed-in account's permissions on the client — for hiding what they
 * can't use (sidebar links, action buttons). Purely cosmetic: every page and
 * API checks again on the server (src/lib/guard.ts).
 */

interface AccessValue extends Access {
  can: (area: string, level: Level) => boolean;
  canOpen: (href: string) => boolean;
}

const AccessContext = React.createContext<AccessValue | null>(null);

export function AccessProvider({ access, children }: { access: Access; children: React.ReactNode }) {
  const value = React.useMemo<AccessValue>(
    () => ({
      ...access,
      can: (area, level) => can(access, area, level),
      canOpen: (href) => can(access, areaKeyOf(href), "view"),
    }),
    [access],
  );
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

/** Outside a provider (e.g. the standalone /scan page) everything reads as allowed — the server still decides. */
export function useAccess(): AccessValue {
  return (
    React.useContext(AccessContext) ?? {
      isOwner: false,
      permissions: {},
      can: () => true,
      canOpen: () => true,
    }
  );
}
