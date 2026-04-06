// components/ui/badge.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "default"
  | "subtle"
  | "success"
  | "warning"
  | "purple"
  | "neutral";

export function Badge({
  variant = "subtle",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        variant === "default" &&
          "bg-primary/10 text-foreground ring-primary/20",
        variant === "subtle" &&
          "bg-surface-2 text-foreground/80 ring-border/50",
        variant === "success" &&
          "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
        variant === "warning" &&
          "bg-amber-50 text-amber-700 ring-amber-200/70",
        variant === "purple" &&
          "bg-purple-50 text-purple-700 ring-purple-200/70",
        variant === "neutral" &&
          "bg-zinc-50 text-zinc-700 ring-zinc-200/70",
        className
      )}
      {...props}
    />
  );
}