import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./session";
import { loadSessionUser } from "./users";
import { allAt, can, type Access, type Level, type Permissions } from "@/config/permissions";

/**
 * Server-side auth helpers that touch `next/headers`. Import from server
 * components, route handlers, and server actions only (never the proxy).
 *
 * Two kinds of account:
 * - the **Owner** — ADMIN_USERNAME / ADMIN_PASSWORD from the environment;
 *   always has every permission and can't be edited or locked out;
 * - **users** created on the Users page (src/lib/users.ts), with per-page
 *   permissions read live from MongoDB on every request.
 */

export type CurrentUser = Access & {
  /** database id; absent for the Owner */
  id?: string;
  username: string;
  role: string;
  name: string;
  initials: string;
  /** signed in with a temporary password — must change it before anything else */
  mustChangePassword: boolean;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "?";
}

/**
 * The signed-in account, or null if there's no valid session — including a
 * user who was disabled, deleted, had their password reset, or whose
 * session was otherwise revoked. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  if (!payload.uid) {
    // Owner sessions are only valid for the configured Owner username.
    const owner = process.env.ADMIN_USERNAME;
    if (!owner || payload.u !== owner) return null;
    const name = owner.charAt(0).toUpperCase() + owner.slice(1);
    return {
      username: owner,
      role: "Owner",
      name,
      initials: initialsOf(name),
      isOwner: true,
      permissions: allAt("manage") as Permissions,
      mustChangePassword: false,
    };
  }

  const d = await loadSessionUser(payload.uid, payload.v ?? 0);
  if (!d) return null;
  return {
    id: d._id.toHexString(),
    username: d.username,
    role: "User",
    name: d.name,
    initials: initialsOf(d.name),
    isOwner: false,
    permissions: d.permissions,
    mustChangePassword: d.mustChangePassword,
  };
});

/** True for the configured Owner credentials. */
export function checkOwnerCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

/** Shorthand for permission checks on the current user. */
export function userCan(user: CurrentUser | null, area: string, level: Level): boolean {
  return Boolean(user && !user.mustChangePassword && can(user, area, level));
}
