import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { can } from "@/config/permissions";
import { verifyCashier } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** Till sign-in: `{ pin }` → the active staff member it belongs to. */
export async function POST(req: NextRequest) {
  const g = await apiGuard((u) => can(u, "till", "manage"));
  if (g.fail) return g.fail;
  const body = (await req.json().catch(() => null)) as { pin?: unknown } | null;
  const { cashier, error } = await verifyCashier(body?.pin);
  if (!cashier) return NextResponse.json({ error }, { status: 403 });
  return NextResponse.json({ cashier });
}
