/** Semantic tones → tinted icon-chip classes (tint recolors automatically). */
export type Tone =
  | "primary"
  | "info"
  | "highlight"
  | "success"
  | "warning"
  | "destructive";

export const TONE_CHIP: Record<Tone, string> = {
  primary: "bg-accent text-primary",
  info: "bg-[hsl(var(--chart-3)/0.14)] text-[hsl(var(--chart-3))]",
  highlight: "bg-highlight/15 text-highlight",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
};

/** Categorical data-viz palette, cycled by index. */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function chartColor(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}
