import { NextResponse, type NextRequest } from "next/server";
import { apiGuard } from "@/lib/guard";
import { can, type Access } from "@/config/permissions";

/** Orders managers can run any action; Dispatch and Shipments managers only the ones their pages run. */
const SHEET_ACTIONS = ["dispatch", "add_to_load_sheet", "remove_from_sheet", "move_to_sheet"];
const TRACKING_ACTIONS = ["mark_delivered", "mark_returned", "mark_fulfilled"];
function canRunOrderAction(u: Access, action: unknown): boolean {
  if (can(u, "orders", "manage")) return true;
  const a = String(action);
  return (SHEET_ACTIONS.includes(a) && can(u, "dispatch", "manage")) || (TRACKING_ACTIONS.includes(a) && can(u, "shipments", "manage"));
}
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
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const g = await apiGuard((u) => canRunOrderAction(u, body.action));
  if (g.fail) return g.fail;

  const result = await runOrderAction(id, body.action, body);
  if (result.needsConfirmation) return NextResponse.json(result, { status: 409 });
  if (result.error) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result);
}
