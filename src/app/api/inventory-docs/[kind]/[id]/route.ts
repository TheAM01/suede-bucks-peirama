import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDoc, runDocAction } from "@/lib/inventory-docs";
import { isInventoryDocKind } from "@/config/inventory-docs";

export const dynamic = "force-dynamic";

/**
 * One inventory document (purchase order, transfer, stocktake).
 * GET → the document with its lines. POST `{ action, ...payload }` runs one
 * step — lines, place, ship, send, receive, post, close, cancel — see
 * runDocAction() in src/lib/inventory-docs.ts and DOC_ACTION_FROM in
 * src/config/inventory-docs.ts.
 */
async function guard(ctx: { params: Promise<{ kind: string; id: string }> }) {
  if (!(await getCurrentUser())) return { fail: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const { kind, id } = await ctx.params;
  if (!isInventoryDocKind(kind)) return { fail: NextResponse.json({ error: "unknown document type" }, { status: 404 }) };
  return { kind, id };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const g = await guard(ctx);
  if ("fail" in g) return g.fail;
  const { row, error } = await getDoc(g.kind, g.id);
  if (error) return NextResponse.json({ error }, { status: 404 });
  return NextResponse.json({ row });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const g = await guard(ctx);
  if ("fail" in g) return g.fail;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const result = await runDocAction(g.kind, g.id, body.action, body);
  if (result.error) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result);
}
