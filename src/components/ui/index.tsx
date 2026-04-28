// src/components/ui/index.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Minimal, dependency-light UI primitives.
 * Safe "barrel" to satisfy imports like: `import { Card, Button } from "@/components/ui"`.
 */

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" }
) {
  const { className, variant = "default", ...rest } = props;

  const variantClass =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      : variant === "ghost"
      ? "bg-transparent text-slate-900 hover:bg-slate-100"
      : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition",
        variantClass,
        className
      )}
    />
  );
}

export function Badge(props: React.HTMLAttributes<HTMLSpanElement>) {
  const { className, ...rest } = props;
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700",
        className
      )}
    />
  );
}

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn("rounded-2xl border border-slate-200 bg-white", className)} />;
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn("p-6 pb-3", className)} />;
}

export function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props;
  return <h3 {...rest} className={cn("text-lg font-semibold", className)} />;
}

export function CardDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const { className, ...rest } = props;
  return <p {...rest} className={cn("text-sm text-slate-900", className)} />;
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn("px-6 pb-6", className)} />;
}

export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div {...rest} className={cn("px-6 pb-6 pt-0", className)} />;
}