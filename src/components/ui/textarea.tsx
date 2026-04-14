// components/ui/textarea.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 5, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          // Base
          "w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted/70",
          // Resize + spacing
          "min-h-[120px] resize-y leading-relaxed",
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

Textarea.displayName = "Textarea";