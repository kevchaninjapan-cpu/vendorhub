// components/ui/input.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          // Base
          "w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted/70",
          // Focus
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
          // Disabled
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";