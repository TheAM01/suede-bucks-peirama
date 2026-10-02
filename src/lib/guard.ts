import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "./auth";
import { areaKeyOf, can, type Level } from "@/config/permissions";

/**
 * Access checks for pages and route handlers (see src/config/permissions.ts).
 * The proxy only checks that a session cookie is validly signed; these check
 * that the account is still active and allowed to do the thing.
 */

const signOut = (path: string) => `/api/auth/signout?reason=revoked&next=${encodeURIComponent(path)}`;

/**
 * Gate a dashboard page: signed in, not stuck on a temporary password, and
 * at least `level` on the page's area. Returns the user.
 */
export async function requirePage(path: string, level: Level = "view"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signOut(path));
  if (user.mustChangePassword && !path.startsWith("/dashboard/account")) redirect("/dashboard/account?first=1");
  if (!can(user, areaKeyOf(path), level)) redirect(`/dashboard?denied=${encodeURIComponent(path)}`);
  return user;
}

/** Gate a page outside the dashboard (print, scan) with a custom permission check. */
export async function requireAccess(path: string, allowed: (u: CurrentUser) => boolean): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signOut(path));
  if (user.mustChangePassword) redirect("/dashboard/account?first=1");
  if (!allowed(user)) redirect(`/dashboard?denied=${encodeURIComponent(path)}`);
  return user;
}

/** Gate a route handler. `{ fail }` is the 401 / 403 response to return. */
export async function apiGuard(
  allowed: (u: CurrentUser) => boolean,
): Promise<{ user: CurrentUser; fail?: undefined } | { user?: undefined; fail: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { fail: NextResponse.json({ error: "Your session has ended — sign in again." }, { status: 401 }) };
  if (user.mustChangePassword) {
    return { fail: NextResponse.json({ error: "Change your temporary password first." }, { status: 403 }) };
  }
  if (!allowed(user)) {
    return { fail: NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 }) };
  }
  return { user };
}

/** For server actions: the user if allowed, else an error message. */
export async function actionGuard(
  allowed: (u: CurrentUser) => boolean,
): Promise<{ user: CurrentUser; error?: undefined } | { user?: undefined; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "You're signed out — sign in again." };
  if (user.mustChangePassword) return { error: "Change your temporary password first." };
  if (!allowed(user)) return { error: "You don't have permission to do that." };
  return { user };
}
