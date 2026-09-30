import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  const isAuthed = Boolean(session);

  // /print/* (shipping labels) and /scan/* (where a label's QR points) are
  // chrome-less pages outside the dashboard — same gate.
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/print") ||
    pathname.startsWith("/scan");
  const isLogin = pathname === "/login";

  // Gate the dashboard behind a valid session.
  if (isDashboard && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Don't show the login page to someone already signed in.
  if (isLogin && isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/print/:path*", "/scan/:path*", "/login"],
};
