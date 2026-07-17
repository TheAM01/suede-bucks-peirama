import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-primary/10 text-primary dark:bg-primary/20",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        success:
          "border-transparent bg-success/12 text-success dark:bg-success/20",
        warning:
          "border-transparent bg-warning/15 text-warning dark:bg-warning/25",
        destructive:
          "border-transparent bg-destructive/12 text-destructive dark:bg-destructive/20",
        info: "border-transparent bg-[hsl(var(--chart-3)/0.14)] text-[hsl(var(--chart-3))]",
        outline: "border-border text-muted-foreground",
        solid: "border-transparent bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
