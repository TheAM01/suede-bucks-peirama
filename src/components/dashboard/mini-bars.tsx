"use client";

import { cn } from "@/lib/utils";

/** Lightweight vertical-bar chart — no chart library. */
export function MiniBars({
  data,
  labels,
  className,
  formatValue,
  tone = "primary",
}: {
  data: number[];
  labels?: string[];
  className?: string;
  formatValue?: (n: number) => string;
  tone?: "primary" | "inverted";
}) {
  const max = Math.max(1, ...data);
  return (
    <div className={cn("flex h-40 items-end gap-1.5", className)}>
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <div
            key={i}
            className="group/bar flex flex-1 flex-col items-center justify-end gap-1.5"
            title={formatValue ? formatValue(v) : String(v)}
          >
            <div className="flex w-full items-end justify-center">
              <div
                className={cn(
                  "w-full max-w-[22px] rounded-t-md transition-all duration-700",
                  tone === "inverted"
                    ? "bg-primary-foreground/25 group-hover/bar:bg-primary-foreground"
                    : "bg-primary/25 group-hover/bar:bg-primary",
                )}
                style={{ height: `${Math.max(4, pct)}%` }}
              />
            </div>
            {labels ? (
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  tone === "inverted"
                    ? "text-primary-foreground/60"
                    : "text-muted-foreground",
                )}
              >
                {labels[i]}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
