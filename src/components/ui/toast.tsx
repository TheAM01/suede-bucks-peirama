"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "@/components/icons";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * App-wide toasts. `useToast()` anywhere under <ToastProvider> (mounted by the
 * dashboard shell) gives `success` / `error` / `info` / `toast` / `dismiss`.
 *
 * Each toast has a close button and a bar along its bottom that empties over
 * its lifetime — the bar's own CSS animation ending is what dismisses it, so
 * the bar is always truthful, and hovering pauses both together. Errors stay
 * longer than confirmations. At most MAX are shown; older ones drop off.
 */

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** ms before it disappears; defaults by tone */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastInput, "tone" | "title" | "duration">> {
  id: number;
  description?: string;
}

interface ToastApi {
  toast: (t: ToastInput) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
}

const DEFAULT_DURATION: Record<ToastTone, number> = { success: 4000, info: 5000, error: 8000 };
const MAX = 5;

const ToastContext = React.createContext<ToastApi | null>(null);

/** Toasts outside a provider are dropped silently rather than crashing (e.g. the standalone /scan page). */
const NOOP: ToastApi = { toast: () => 0, success: () => 0, error: () => 0, info: () => 0, dismiss: () => {} };

export function useToast(): ToastApi {
  return React.useContext(ToastContext) ?? NOOP;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(1);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((t: ToastInput) => {
    const id = nextId.current++;
    const tone = t.tone ?? "info";
    setItems((prev) =>
      [...prev, { id, tone, title: t.title, description: t.description, duration: t.duration ?? DEFAULT_DURATION[tone] }].slice(-MAX),
    );
    return id;
  }, []);

  const api = React.useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description }),
      info: (title, description) => toast({ tone: "info", title, description }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const TONE: Record<ToastTone, { icon: typeof Info; iconClass: string; bar: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-success", bar: "bg-success" },
  error: { icon: AlertCircle, iconClass: "text-destructive", bar: "bg-destructive" },
  info: { icon: Info, iconClass: "text-primary", bar: "bg-primary" },
};

function Toaster({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    // Top-right under the top bar, clear of the bottom selection bars.
    <div
      className="pointer-events-none fixed inset-x-4 top-20 z-[80] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-96"
      aria-live="polite"
    >
      {items.map((t) => {
        const tone = TONE[t.tone];
        const Icon = tone.icon;
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="group pointer-events-auto relative w-full overflow-hidden rounded-lg border border-border bg-card shadow-popover animate-toast-in"
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <Icon className={cn("mt-0.5 size-4 shrink-0", tone.iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 break-words text-sm text-muted-foreground">{t.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="-mr-1 -mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
            {/* Countdown: the animation's end removes the toast; hover pauses it. */}
            <div className="h-1 w-full bg-muted">
              <div
                className={cn("h-full origin-left animate-toast-progress group-hover:[animation-play-state:paused]", tone.bar)}
                style={{ animationDuration: `${t.duration}ms` }}
                onAnimationEnd={() => onDismiss(t.id)}
              />
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
