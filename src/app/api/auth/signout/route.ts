import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Clears a session that's no longer valid (account disabled, password reset,
 * permissions revoked) and sends the browser to the login page. Pages can't
 * delete cookies while rendering, so they redirect here instead — which also
 * stops the proxy bouncing a still-signed cookie from /login back to /dashboard.
 */
export function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  const next = req.nextUrl.searchParams.get("next") ?? "";
  url.pathname = "/login";
  url.search = "";
  if (/^\/(?![/\\])/.test(next)) url.searchParams.set("next", next);
  if (req.nextUrl.searchParams.get("reason") === "revoked") url.searchParams.set("revoked", "1");
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
