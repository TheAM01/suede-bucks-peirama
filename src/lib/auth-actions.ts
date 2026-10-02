"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkOwnerCredentials, getCurrentUser } from "./auth";
import { authenticateUser, changeOwnPassword } from "./users";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, type SessionPayload } from "./session";

export type LoginState = { error?: string };

async function setSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter both a username and password." };
  }

  let mustChange = false;
  if (checkOwnerCredentials(username, password)) {
    await setSession({ u: username, r: "Owner", iat: Date.now() });
  } else {
    const { user, error } = await authenticateUser(username, password);
    if (!user) return { error: error ?? "Incorrect username or password." };
    await setSession({ u: user.username, r: "User", iat: Date.now(), uid: user._id.toHexString(), v: user.sessionVersion });
    mustChange = user.mustChangePassword;
  }

  // A temporary password has to be replaced before anything else.
  if (mustChange) redirect("/dashboard/account?first=1");

  // Return to the page that bounced them here (e.g. a scanned label's /scan link).
  // Same-site paths only — never an absolute or protocol-relative URL.
  const next = String(formData.get("next") ?? "");
  redirect(/^\/(?![/\\])/.test(next) ? next : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export type PasswordState = { error?: string; ok?: boolean };

/** Change your own password. The session is re-issued, so other devices are signed out but this one isn't. */
export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You're signed out — sign in again." };
  if (user.isOwner || !user.id) {
    return { error: "The Owner's password is set in the server's environment (ADMIN_PASSWORD), not here." };
  }
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The new passwords don't match." };
  const { sessionVersion, error } = await changeOwnPassword(user.id, current, next);
  if (sessionVersion === undefined) return { error };
  await setSession({ u: user.username, r: "User", iat: Date.now(), uid: user.id, v: sessionVersion });
  if (user.mustChangePassword) redirect("/dashboard");
  return { ok: true };
}
