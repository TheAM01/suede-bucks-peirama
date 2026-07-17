"use client";

import * as React from "react";
import type { CurrentUser } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { DashboardUIProvider } from "./ui-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomBar } from "./bottom-bar";
import { cn } from "@/lib/utils";

export function DashboardShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <StoreProvider>
      <DashboardUIProvider>
        <div className="min-h-screen bg-background">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <div
            className={cn(
              "flex min-h-screen flex-col transition-all duration-300",
              collapsed ? "lg:pl-[72px]" : "lg:pl-64",
            )}
          >
            <Topbar user={user} onOpenMobile={() => setMobileOpen(true)} />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
                {children}
              </div>
            </main>
            <BottomBar />
          </div>
        </div>
      </DashboardUIProvider>
    </StoreProvider>
  );
}
