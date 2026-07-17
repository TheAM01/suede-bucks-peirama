import * as React from "react";
import { Info, AlertTriangle, CheckCircle2 } from "@/components/icons";
import type { Block } from "@/content/guide-types";
import { cn } from "@/lib/utils";

/** Parse a tiny markdown subset: **bold** and `code`. */
export function renderInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.82em] text-foreground"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

const CALLOUT_STYLE = {
  info: {
    icon: Info,
    className: "border-[hsl(var(--chart-3)/0.3)] bg-[hsl(var(--chart-3)/0.08)]",
    iconClass: "text-[hsl(var(--chart-3))]",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning/30 bg-warning/10",
    iconClass: "text-warning",
  },
  success: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/10",
    iconClass: "text-success",
  },
};

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.t) {
    case "p":
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {renderInline(block.text)}
        </p>
      );
    case "h":
      return (
        <h3 className="mt-6 font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="space-y-1.5">
          {block.items.map((it, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold tabular-nums text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5">{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
    case "dl":
      return (
        <dl className="space-y-2.5">
          {block.items.map((it, i) => (
            <div
              key={i}
              className="grid gap-1 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"
            >
              <dt className="text-sm font-medium text-foreground">
                {renderInline(it.term)}
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {renderInline(it.def)}
              </dd>
            </div>
          ))}
        </dl>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs leading-relaxed text-foreground">
          <code>{block.text}</code>
        </pre>
      );
    case "callout": {
      const style = CALLOUT_STYLE[block.tone ?? "info"];
      const Icon = style.icon;
      return (
        <div className={cn("flex gap-3 rounded-lg border p-3.5", style.className)}>
          <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconClass)} />
          <div className="min-w-0">
            {block.title ? (
              <p className="text-sm font-semibold text-foreground">
                {block.title}
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {renderInline(block.text)}
            </p>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3.5">
      {blocks.map((b, i) => (
        <BlockRenderer key={i} block={b} />
      ))}
    </div>
  );
}
