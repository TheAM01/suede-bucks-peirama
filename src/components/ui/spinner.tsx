import { Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-6 animate-spin text-muted-foreground", className)} />;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
