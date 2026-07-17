import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured, pingDb } from "@/lib/db";
import { readIntegrations } from "@/lib/integrations";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export interface ServiceStatus {
  ok: boolean;
  detail: string;
}

export interface StatusResponse {
  app: ServiceStatus;
  db: ServiceStatus;
  shopify: ServiceStatus;
}

/** Live connectivity for the bottom-bar status dots. Auth-gated. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [dbOk, config] = await Promise.all([pingDb(), readIntegrations()]);

  const db: ServiceStatus = isDbConfigured()
    ? {
        ok: dbOk,
        detail: dbOk ? "MongoDB connected" : "MongoDB unreachable — check MONGODB_URI",
      }
    : { ok: true, detail: "File storage (no database configured)" };

  const s = config.shopify;
  const shopify: ServiceStatus = !s
    ? { ok: true, detail: "Not connected — demo data" }
    : s.lastCheck
      ? {
          ok: s.lastCheck.ok,
          detail: `${s.lastCheck.ok ? "Connected" : "Failing"} · checked ${relativeTime(s.lastCheck.at)}`,
        }
      : { ok: true, detail: "Configured — not yet checked" };

  const body: StatusResponse = {
    app: { ok: true, detail: "All systems operational" },
    db,
    shopify,
  };
  return NextResponse.json(body);
}
