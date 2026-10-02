import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { can } from "@/config/permissions";
import { searchCustomers } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** `?q=` → up to 8 Shopify customers matching a name, phone, or email. */
export async function GET(req: NextRequest) {
  const g = await apiGuard((u) => can(u, "till", "manage"));
  if (g.fail) return g.fail;
  const res = await searchCustomers(req.nextUrl.searchParams.get("q") ?? "");
  if (!res.customers) return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json({ customers: res.customers });
}
