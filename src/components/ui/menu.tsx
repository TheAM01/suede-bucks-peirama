"use client";

import * as React from "react";
import Link from "next/link";
import { useDismiss } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface MenuContextValue {
  open: boolean;
  setOpen: (o: boolean) => void;
}
const MenuContext = React.createContext<MenuContextValue | null>(null);

export function Menu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative">
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export function MenuTrigger({ children }: { children: React.ReactElement }) {
  const ctx = React.useContext(MenuContext)!;
  return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      ctx.setOpen(!ctx.open);
    },
    "aria-expanded": ctx.open,
    "aria-haspopup": "menu",
  });
}

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
  const ctx = React.useContext(MenuContext)!;
  if (!ctx.open) return null;
  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 mt-2 origin-top overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-popover animate-scale-in",
        align === "end" ? "right-0" : "left-0",
        width,
        className,
      )}
    >
      {children}
    </div>
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
  const ctx = React.useContext(MenuContext)!;
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
  const ctx = React.useContext(MenuContext)!;
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
