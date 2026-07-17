"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Home, LogOut, X } from "@/components/icons";
import { NAV } from "@/config/nav";
import { Logo, Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
          {collapsed ? (
            <Link href="/dashboard" className="mx-auto">
              <Logo />
            </Link>
          ) : (
            <Wordmark href="/dashboard" />
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            title="Close"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV.map((cat) => (
            <div key={cat.label}>
              {!collapsed ? (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {cat.label}
                </p>
              ) : (
                <div className="mx-3 mb-2 h-px bg-sidebar-border" />
              )}
              <ul className="space-y-0.5">
                {cat.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="relative">
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-highlight" />
                      ) : null}
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        title={collapsed ? item.title : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0",
                            active && "text-sidebar-primary",
                          )}
                        />
                        {!collapsed ? (
                          <span className="truncate">{item.title}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 border-t border-sidebar-border p-3",
            collapsed ? "flex-col" : "justify-between",
          )}
        >
          <Link
            href="/"
            title="Back to home"
            className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-[18px]"
          >
            <Home />
          </Link>
          <ThemeToggle variant="sidebar" />
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-destructive/20 hover:text-destructive [&_svg]:size-[18px]"
            >
              <LogOut />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
