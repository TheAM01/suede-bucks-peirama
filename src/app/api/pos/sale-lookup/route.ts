import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { can } from "@/config/permissions";
import { lookupSale } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** `?number=PF1032K` → the sale's lines with how many of each can still be returned. */
export async function GET(req: NextRequest) {
  const g = await apiGuard((u) => can(u, "till", "manage"));
  if (g.fail) return g.fail;
  const res = await lookupSale(req.nextUrl.searchParams.get("number") ?? "");
  if (!res.sale) return NextResponse.json({ error: res.error }, { status: 404 });
  return NextResponse.json({ sale: res.sale });
}
