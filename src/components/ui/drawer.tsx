"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/icons";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Right-side slide-over used for create/edit forms and detail panels. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DrawerProps) {
  const mounted = useMounted();

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  // Portaled to <body> so no ancestor's transform/filter/contain can turn the
  // fixed overlay into a shrunken containing block — guarantees full height.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex h-[100dvh] justify-end">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-popover",
          className,
        )}
        style={{ animation: "drawer-in 0.28s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-1">
            <h2 className="font-heading text-base font-semibold leading-tight tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
      <style>{`@keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>,
    document.body,
  );
}
