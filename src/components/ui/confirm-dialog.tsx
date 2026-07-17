"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "@/components/icons";
import { useMounted } from "@/lib/hooks";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  const mounted = useMounted();

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-popover animate-scale-in"
      >
        <div className="flex gap-3.5">
          {destructive ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive">
              <AlertTriangle className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
