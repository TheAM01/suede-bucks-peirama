import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRegister, readCatalog } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** `?registerId=` → every sellable variant with price, SKU, barcode, and stock at that register's store. */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { register, error } = await getRegister(req.nextUrl.searchParams.get("registerId"));
  if (!register) return NextResponse.json({ error }, { status: 422 });
  const res = await readCatalog(register.locationId);
  if (!res.items) return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json({ register, items: res.items });
}
