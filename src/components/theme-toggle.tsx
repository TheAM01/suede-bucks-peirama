"use client";

import { Moon, Sun } from "@/components/icons";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  variant = "surface",
}: {
  className?: string;
  variant?: "surface" | "sidebar";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title={isDark ? "Switch to light" : "Switch to dark"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg transition-colors [&_svg]:size-[18px]",
        variant === "sidebar"
          ? "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "border border-input bg-card text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {mounted && isDark ? <Sun /> : <Moon />}
    </button>
  );
}
