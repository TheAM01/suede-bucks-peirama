import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { can } from "@/config/permissions";
import { createReturn } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** Return items from a sale — refund, or credit for an exchange. See createReturn() in src/lib/pos.ts. */
export async function POST(req: NextRequest) {
  const g = await apiGuard((u) => can(u, "till", "manage"));
  if (g.fail) return g.fail;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const res = await createReturn(body);
  if (res.error) return NextResponse.json(res, { status: 422 });
  return NextResponse.json(res);
}
