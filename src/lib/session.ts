/**
 * Edge-safe session helpers. Pure functions built on the Web Crypto API so they
 * run in both the Node.js runtime (server actions / server components) and the
 * Edge runtime (middleware). Do NOT import `next/headers` here — middleware
 * reads the cookie off the request directly.
 *
 * A session token is `base64url(payload).base64url(hmac)` where the payload is
 * a small JSON blob and the signature is HMAC-SHA256 over the payload.
 */

export const SESSION_COOKIE = "sb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  /** username */
  u: string;
  /** role */
  r: string;
  /** issued-at (ms) */
  iat: number;
};

const encoder = new TextEncoder();

function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

function strToB64url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlToStr(b64: string): string {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(s)));
}

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = strToB64url(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(b64urlToStr(body)) as SessionPayload;
    if (typeof payload.u !== "string") return null;
    // Reject expired tokens.
    if (Date.now() - payload.iat > SESSION_MAX_AGE * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
