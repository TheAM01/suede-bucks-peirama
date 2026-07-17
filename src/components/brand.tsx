import Link from "next/link";
import { cn } from "@/lib/utils";

/** The SuedeBucks coin mark — a gold coin on a suede tile. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <circle cx="12" cy="12" r="8" className="fill-highlight" />
        <path
          d="M12 8.2c-1.5 0-2.6.7-2.6 1.9 0 2.5 4.4 1.4 4.4 3.1 0 .8-.8 1.2-1.8 1.2-1 0-1.8-.4-1.9-1.2M12 8.2c1.2 0 2.1.5 2.4 1.3M12 8.2V7.2m0 8.5v-1"
          stroke="hsl(var(--highlight-foreground))"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Wordmark({
  className,
  href,
  subtle,
}: {
  className?: string;
  href?: string;
  subtle?: boolean;
}) {
  const inner = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <span className="flex flex-col leading-none">
        <span className="font-grotesk text-[15px] font-bold tracking-tight">
          SuedeBucks
        </span>
        <span
          className={cn(
            "text-[11px] font-medium tracking-wide",
            subtle ? "text-muted-foreground" : "text-highlight",
          )}
        >
          Peirama
        </span>
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="inline-flex">
      {inner}
    </Link>
  ) : (
    inner
  );
}
