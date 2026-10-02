import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { can } from "@/config/permissions";
import { createScannedLoadSheet } from "@/lib/load-sheet-scan";

export const dynamic = "force-dynamic";

/** Create a posted load sheet from scanned consignment QR codes (`{ courier, location, consignmentIds }`). */
export async function POST(req: NextRequest) {
  const g = await apiGuard((u) => can(u, "dispatch", "manage"));
  if (g.fail) return g.fail;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const result = await createScannedLoadSheet(body);
  if (result.error) return NextResponse.json(result, { status: 422 });
  return NextResponse.json({ ok: true, ...result });
}
