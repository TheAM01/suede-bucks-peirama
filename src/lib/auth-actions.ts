"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkCredentials } from "./auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "./session";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter both a username and password." };
  }
  if (!checkCredentials(username, password)) {
    return { error: "Incorrect username or password." };
  }

  const token = await signSession({ u: username, r: "Owner", iat: Date.now() });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

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
