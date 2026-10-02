import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { can } from "@/config/permissions";
import { getRegister, readCatalog } from "@/lib/pos";
import { readAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

/** `?registerId=` → every sellable variant with price, SKU, barcode, and stock at that register's store. */
export async function GET(req: NextRequest) {
  const g = await apiGuard((u) => can(u, "till", "manage"));
  if (g.fail) return g.fail;
  const { register, error } = await getRegister(req.nextUrl.searchParams.get("registerId"));
  if (!register) return NextResponse.json({ error }, { status: 422 });
  const res = await readCatalog(register.locationId);
  if (!res.items) return NextResponse.json({ error: res.error }, { status: 502 });
  const { posAllowOutOfStock } = await readAppSettings();
  return NextResponse.json({ register, items: res.items, allowOutOfStock: posAllowOutOfStock });
}
