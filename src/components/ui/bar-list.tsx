import * as React from "react";
import { chartColor } from "@/lib/tone";
import { cn } from "@/lib/utils";

export interface BarListItem {
  label: string;
  value: number;
  /** formatted value shown on the right */
  display?: string;
  sub?: string;
  color?: string;
}

/** The workhorse horizontal-bar / ranked-list from the design guide. */
export function BarList({
  items,
  className,
}: {
  items: BarListItem[];
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={cn("space-y-3.5", className)}>
      {items.map((item, i) => {
        const color = item.color ?? chartColor(i);
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label + i} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate font-medium text-foreground">
                  {item.label}
                </span>
                {item.sub ? (
                  <span className="shrink-0 text-muted-foreground">
                    · {item.sub}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {item.display ?? item.value}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
