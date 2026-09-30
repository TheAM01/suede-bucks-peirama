import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runOrderAction } from "@/lib/order-workflow";

export const dynamic = "force-dynamic";

/**
 * Run one Orders control-panel action (`{ action, ...payload }`) — see
 * runOrderAction() in src/lib/order-workflow.ts for the allowed transitions.
 * A 409 with `needsConfirmation` means "ask the user, then resend with
 * `confirmed: true`".
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const result = await runOrderAction(id, body.action, body);
  if (result.needsConfirmation) return NextResponse.json(result, { status: 409 });
  if (result.error) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result);
}
