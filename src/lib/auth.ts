import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

/**
 * Server-side auth helpers that touch `next/headers`. Import from server
 * components and server actions only (never middleware).
 */

export type CurrentUser = {
  username: string;
  role: string;
  name: string;
  initials: string;
};

function toUser(payload: SessionPayload): CurrentUser {
  const username = payload.u;
  const name = username.charAt(0).toUpperCase() + username.slice(1);
  return {
    username,
    role: payload.r || "Owner",
    name,
    initials: username.slice(0, 2).toUpperCase(),
  };
}

/** Returns the logged-in admin, or null if the session cookie is missing/invalid. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  return payload ? toUser(payload) : null;
}

/** Validate a username/password against the configured admin credentials. */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}
