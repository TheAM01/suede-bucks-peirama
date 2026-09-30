import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createScannedLoadSheet } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

/** Create a posted load sheet from scanned consignment QR codes (`{ courier, location, consignmentIds }`). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const result = await createScannedLoadSheet(body);
  if (result.error) return NextResponse.json(result, { status: 422 });
  return NextResponse.json({ ok: true, ...result });
}
