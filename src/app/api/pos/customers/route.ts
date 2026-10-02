import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchCustomers } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** `?q=` → up to 8 Shopify customers matching a name, phone, or email. */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = await searchCustomers(req.nextUrl.searchParams.get("q") ?? "");
  if (!res.customers) return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json({ customers: res.customers });
}
