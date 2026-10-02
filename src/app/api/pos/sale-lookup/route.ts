import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { lookupSale } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** `?number=PF1032K` → the sale's lines with how many of each can still be returned. */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = await lookupSale(req.nextUrl.searchParams.get("number") ?? "");
  if (!res.sale) return NextResponse.json({ error: res.error }, { status: 404 });
  return NextResponse.json({ sale: res.sale });
}
