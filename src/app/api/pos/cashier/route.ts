import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyCashier } from "@/lib/pos";

export const dynamic = "force-dynamic";

/** Till sign-in: `{ pin }` → the active staff member it belongs to. */
export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { pin?: unknown } | null;
  const { cashier, error } = await verifyCashier(body?.pin);
  if (!cashier) return NextResponse.json({ error }, { status: 403 });
  return NextResponse.json({ cashier });
}
