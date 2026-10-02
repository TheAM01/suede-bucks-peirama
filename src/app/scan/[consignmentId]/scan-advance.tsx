"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, QrCode } from "@/components/icons";
import { statusLabel } from "@/config/order-workflow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetPicker, type OpenSheet, type SheetChoice } from "@/components/dashboard/sheet-picker";
import { postScan, type ScanReply } from "@/components/dashboard/scanners";

type Result =
  | { state: "working" }
  | { state: "pick"; number: string; orderId: string; courier: string; sheets: OpenSheet[] }
  | { state: "done"; number: string; orderId: string; from: string; to: string; loadSheet?: string }
  | { state: "error"; message: string; number?: string; orderId?: string };

/**
 * Advances the scanned parcel's order once on load, then shows what happened.
 * Dispatching asks first: the server answers `needsSheet` with the courier's
 * open load sheets, and the order only moves once one is picked (or a new one).
 */
export function ScanAdvance({ consignmentId }: { consignmentId: string }) {
  const [result, setResult] = React.useState<Result>({ state: "working" });
  const [choice, setChoice] = React.useState<SheetChoice | null>(null);
  // Effects run twice in dev Strict Mode — a scan must move the order exactly once.
  const fired = React.useRef(false);

  const settle = React.useCallback(
    (ok: boolean, status: number, body: ScanReply) => {
      if (status === 409 && body.needsSheet) {
        setResult({
          state: "pick",
          number: body.number ?? consignmentId,
          orderId: body.orderId ?? "",
          courier: body.courier ?? "",
          sheets: body.sheets ?? [],
        });
      } else if (!ok || !body.status) {
        setResult({
          state: "error",
          message: body.error ?? `Server responded ${status}.`,
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
          loadSheet: body.loadSheet,
        });
      }
    },
    [consignmentId],
  );

  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void postScan(consignmentId, { advance: true }).then(({ ok, status, reply }) => settle(ok, status, reply));
  }, [consignmentId, settle]);

  async function dispatchOnto() {
    if (!choice) return;
    setResult({ state: "working" });
    const { ok, status, reply } = await postScan(consignmentId, {
      advance: true,
      target: choice.target,
      location: choice.location,
    });
    settle(ok, status, reply);
  }

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
        ) : result.state === "pick" ? (
          <div className="space-y-4 text-left">
            <div className="text-center">
              <p className="font-heading text-xl font-semibold">{result.number}</p>
              <p className="text-sm text-muted-foreground">
                Ready to dispatch with {result.courier} — which load sheet?
              </p>
            </div>
            <SheetPicker
              name="scan-sheet"
              courier={result.courier}
              sheets={result.sheets}
              value={choice}
              onChange={setChoice}
            />
            <Button className="w-full" disabled={!choice} onClick={() => void dispatchOnto()}>
              Dispatch onto sheet
            </Button>
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
            {result.loadSheet ? (
              <p className="text-sm text-muted-foreground">
                On load sheet <span className="font-mono">{result.loadSheet}</span>
              </p>
            ) : null}
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
