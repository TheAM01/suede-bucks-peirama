"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, QrCode } from "@/components/icons";
import { statusLabel } from "@/config/order-workflow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Result =
  | { state: "working" }
  | { state: "done"; number: string; orderId: string; from: string; to: string }
  | { state: "error"; message: string; number?: string; orderId?: string };

/** Advances the scanned parcel's order once on load, then shows what happened. */
export function ScanAdvance({ consignmentId }: { consignmentId: string }) {
  const [result, setResult] = React.useState<Result>({ state: "working" });
  // Effects run twice in dev Strict Mode — a scan must move the order exactly once.
  const fired = React.useRef(false);

  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/consignments/${encodeURIComponent(consignmentId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ advance: true }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          number?: string;
          orderId?: string;
          from?: string;
          status?: string;
        };
        if (!res.ok || !body.status) {
          setResult({
            state: "error",
            message: body.error ?? `Server responded ${res.status}.`,
            number: body.number,
            orderId: body.orderId,
          });
        } else {
          setResult({
            state: "done",
            number: body.number ?? consignmentId,
            orderId: body.orderId ?? "",
            from: body.from ?? "",
            to: body.status,
          });
        }
      } catch {
        setResult({ state: "error", message: "Couldn't reach the server." });
      }
    })();
  }, [consignmentId]);

  const orderId = result.state === "working" ? undefined : result.orderId;

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-5 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <QrCode className="size-4" />
          <span className="font-mono">{consignmentId}</span>
        </div>

        {result.state === "working" ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Updating order…</p>
          </div>
        ) : result.state === "done" ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="size-10 text-success" />
            <p className="font-heading text-xl font-semibold">{result.number}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{statusLabel(result.from)}</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="success">{statusLabel(result.to)}</Badge>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="size-10 text-destructive" />
            {result.number ? <p className="font-heading text-xl font-semibold">{result.number}</p> : null}
            <p className="text-sm text-destructive">{result.message}</p>
          </div>
        )}

        {orderId ? (
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/dashboard/orders/${orderId}`}>Open order</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
