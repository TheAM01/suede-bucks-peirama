import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createReturn } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** Return items from a sale — refund, or credit for an exchange. See createReturn() in src/lib/pos.ts. */
export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const res = await createReturn(body);
  if (res.error) return NextResponse.json(res, { status: 422 });
  return NextResponse.json(res);
}
