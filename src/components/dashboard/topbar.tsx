"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu as MenuIcon,
  Search,
  Settings2,
  ChevronRight,
  RefreshCw,
  Download,
  SlidersHorizontal,
  BookOpen,
  User,
  LogOut,
  ChevronDown,
} from "@/components/icons";
import { navItemForPath } from "@/config/nav";
import type { CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { useDashboardUI } from "./ui-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuLink,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";

export function Topbar({
  user,
  onOpenMobile,
}: {
  user: CurrentUser;
  onOpenMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { search, setSearch } = useDashboardUI();
  const nav = navItemForPath(pathname);

  const title = nav?.title ?? "Dashboard";
  const subtitle = nav?.subtitle ?? "Your store at a glance";
  const category = nav?.category;

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:px-8">
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon className="size-[18px]" />
        </button>

        {/* Heading + breadcrumbs */}
        <div className="min-w-0 flex-1">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            {category && title !== "Dashboard" ? (
              <>
                <ChevronRight className="size-3" />
                <span>{category}</span>
                <ChevronRight className="size-3" />
                <span className="truncate font-medium text-foreground">
                  {title}
                </span>
              </>
            ) : null}
          </nav>
          <div className="flex items-baseline gap-2">
            <h1 className="truncate font-heading text-lg font-semibold tracking-tight md:text-xl">
              {title}
            </h1>
            <span className="hidden truncate text-sm text-muted-foreground md:inline">
              — {subtitle}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden w-64 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this page…"
            className="pl-9"
          />
        </div>

        {/* Page settings */}
        <Menu>
          <MenuTrigger>
            <Button variant="outline" size="icon" aria-label="Page settings">
              <Settings2 />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>Page</MenuLabel>
            <MenuItem onSelect={() => router.refresh()}>
              <RefreshCw />
              Refresh data
            </MenuItem>
            <MenuItem>
              <Download />
              Export CSV
            </MenuItem>
            <MenuItem>
              <SlidersHorizontal />
              Column settings
            </MenuItem>
            <MenuSeparator />
            <MenuLink href={`/dashboard/guide#${nav?.guide ?? "overview"}`}>
              <BookOpen />
              How this page works
            </MenuLink>
          </MenuContent>
        </Menu>

        {/* User menu */}
        <Menu>
          <MenuTrigger>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-input bg-card px-1.5 py-1 shadow-xs transition-colors hover:bg-accent"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {user.initials}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </MenuTrigger>
          <MenuContent>
            <div className="flex items-center gap-3 px-2.5 py-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                {user.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <Badge variant="primary" className="mt-0.5">
                  {user.role}
                </Badge>
              </div>
            </div>
            <MenuSeparator />
            <MenuLink href="/dashboard/settings">
              <User />
              Profile &amp; account
            </MenuLink>
            <MenuLink href="/dashboard/settings">
              <Settings2 />
              Store settings
            </MenuLink>
            <MenuSeparator />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 [&_svg]:size-4"
              >
                <LogOut />
                Sign out
              </button>
            </form>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
