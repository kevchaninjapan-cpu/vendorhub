// components/ui/button.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export function Button({
  variant = "outline",
  size = "md",
  className,
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        // Base
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:pointer-events-none disabled:opacity-50",

        // Sizes
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-9 px-4",
        size === "lg" && "h-10 px-5",
        size === "icon" && "h-9 w-9 px-0",

        // Variants
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" &&
          "border border-border bg-background hover:bg-surface",
        variant === "danger" &&
          "border border-red-200/60 bg-red-50 text-red-700 hover:bg-red-100",
        variant === "ghost" &&
          "bg-transparent text-foreground hover:bg-surface",

        className
      )}
      {...props}
    />
  );
}
