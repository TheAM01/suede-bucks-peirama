"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** The trigger and content nodes are tracked as state rather than refs: the
 *  content is portalled, so both the dismiss handler and the positioning pass
 *  need the live nodes, and state re-runs that positioning once they mount. */
interface MenuContextValue {
  open: boolean;
  setOpen: (o: boolean) => void;
  triggerEl: HTMLElement | null;
  setTriggerEl: (el: HTMLElement | null) => void;
  contentEl: HTMLDivElement | null;
  setContentEl: (el: HTMLDivElement | null) => void;
}
const MenuContext = React.createContext<MenuContextValue | null>(null);

function useMenu(): MenuContextValue {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error("Menu parts must be used within <Menu>");
  return ctx;
}

export function Menu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [triggerEl, setTriggerEl] = React.useState<HTMLElement | null>(null);
  const [contentEl, setContentEl] = React.useState<HTMLDivElement | null>(null);

  // The content renders in a portal, so it isn't a DOM descendant of the
  // trigger — dismissal has to spare both subtrees explicitly.
  React.useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerEl?.contains(target)) return;
      if (contentEl?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, triggerEl, contentEl]);

  const value = React.useMemo(
    () => ({ open, setOpen, triggerEl, setTriggerEl, contentEl, setContentEl }),
    [open, triggerEl, contentEl],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function MenuTrigger({ children }: { children: React.ReactElement }) {
  const ctx = useMenu();
  const child = children as React.ReactElement<Record<string, unknown>>;

  return React.cloneElement(child, {
    ref: ctx.setTriggerEl,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      ctx.setOpen(!ctx.open);
    },
    "aria-expanded": ctx.open,
    "aria-haspopup": "menu",
  } as Record<string, unknown>);
}

/** Viewport-relative placement. Anchoring by edge rather than by computed
 *  width lets us position without measuring the menu horizontally. */
type Placement = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 8;

export function MenuContent({
  children,
  align = "end",
  className,
  width = "w-56",
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  width?: string;
}) {
  const ctx = useMenu();
  const mounted = useMounted();
  const { triggerEl, contentEl, setContentEl, open } = ctx;
  const [placement, setPlacement] = React.useState<Placement | null>(null);

  const reposition = React.useCallback(() => {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const next: Placement = {};

    if (align === "end") {
      next.right = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.right);
    } else {
      next.left = Math.max(VIEWPORT_MARGIN, rect.left);
    }

    // Flip above the trigger when the menu would run past the viewport bottom
    // and there is more room above than below.
    const height = contentEl?.offsetHeight ?? 0;
    const roomBelow = window.innerHeight - rect.bottom;
    const roomAbove = rect.top;
    if (height && roomBelow < height + TRIGGER_GAP && roomAbove > roomBelow) {
      next.bottom = window.innerHeight - rect.top + TRIGGER_GAP;
    } else {
      next.top = rect.bottom + TRIGGER_GAP;
    }
    setPlacement(next);
  }, [align, triggerEl, contentEl]);

  // Runs before paint, so the measured flip never shows at the wrong spot. A
  // stale placement from the previous open is recomputed here before it can
  // paint, so there's nothing to reset on close.
  React.useLayoutEffect(() => {
    if (!open) return;
    // Placement can only come from real DOM geometry (the trigger's rect and
    // the menu's measured height), so reading it back after mount is the point.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reposition();
  }, [open, reposition]);

  // A fixed menu doesn't travel with its trigger — recompute as things move.
  // Capture-phase scroll catches ancestor scroll containers, not just window.
  React.useEffect(() => {
    if (!open) return;
    const onChange = () => reposition();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, reposition]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={setContentEl}
      role="menu"
      style={
        placement ?? { top: 0, left: 0, visibility: "hidden" as const }
      }
      className={cn(
        "fixed z-50 max-h-[min(24rem,calc(100vh-2rem))] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-popover animate-scale-in",
        placement?.bottom !== undefined ? "origin-bottom" : "origin-top",
        width,
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

const itemClasses =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function MenuItem({
  children,
  onSelect,
  destructive,
  className,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  className?: string;
}) {
  const ctx = useMenu();
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        itemClasses,
        destructive &&
          "text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:text-destructive",
        className,
      )}
      onClick={() => {
        ctx.setOpen(false);
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

export function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const ctx = useMenu();
  return (
    <Link href={href} className={itemClasses} onClick={() => ctx.setOpen(false)}>
      {children}
    </Link>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
