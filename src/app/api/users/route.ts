import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { createUser, listUsers } from "@/lib/users";
import { can } from "@/config/permissions";
import type { CurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const actorOf = (u: CurrentUser) => ({ id: u.id, username: u.username, isOwner: u.isOwner, permissions: u.permissions });

/** List users (View on Users) — never returns password hashes. */
export async function GET() {
  const g = await apiGuard((u) => can(u, "users", "view"));
  if (g.fail) return g.fail;
  const res = await listUsers(actorOf(g.user));
  if (!res.users) return NextResponse.json({ error: res.error }, { status: 503 });
  return NextResponse.json({ users: res.users });
}

/** Create a user with a temporary password (Manage on Users; can't grant more than you have). */
export async function POST(req: NextRequest) {
  const g = await apiGuard((u) => can(u, "users", "manage"));
  if (g.fail) return g.fail;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const res = await createUser(actorOf(g.user), body);
  if (!res.user) return NextResponse.json({ error: res.error }, { status: 422 });
  return NextResponse.json({ user: res.user });
}
