import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type IconType } from "@/components/icons";
import { Card, CardContent } from "./card";
import { TONE_CHIP, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  icon: IconType;
  tone?: Tone;
  /** signed percentage delta, e.g. +4.2 or -1.8 */
  delta?: number;
  caption?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  delta,
  caption,
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card interactive className="group/card">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              TONE_CHIP[tone],
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <div>
          <div className="font-heading text-2xl font-semibold leading-none tabular-nums md:text-3xl">
            {value}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {delta !== undefined ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium tabular-nums",
                  positive ? "text-success" : "text-destructive",
                )}
              >
                {positive ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {positive ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            ) : null}
            {caption ? <span>{caption}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
