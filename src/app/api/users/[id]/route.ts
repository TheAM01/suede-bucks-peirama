import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { deleteUser, updateUser } from "@/lib/users";
import { can } from "@/config/permissions";
import type { CurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const actorOf = (u: CurrentUser) => ({ id: u.id, username: u.username, isOwner: u.isOwner, permissions: u.permissions });

/** Edit a user: name, permissions, status, or a new temporary password. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await apiGuard((u) => can(u, "users", "manage"));
  if (g.fail) return g.fail;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const res = await updateUser(actorOf(g.user), id, body);
  if (!res.user) return NextResponse.json({ error: res.error }, { status: 422 });
  return NextResponse.json({ user: res.user });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await apiGuard((u) => can(u, "users", "manage"));
  if (g.fail) return g.fail;
  const { id } = await ctx.params;
  const res = await deleteUser(actorOf(g.user), id);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 422 });
  return NextResponse.json({ ok: true });
}
