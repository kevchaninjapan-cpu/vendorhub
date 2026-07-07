"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "success";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]";

  const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 " +
      "focus-visible:ring-emerald-600",
    secondary:
      "border border-slate-300 bg-white text-slate-900 shadow-sm " +
      "hover:bg-slate-50 focus-visible:ring-slate-400",
    ghost:
      "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
    destructive:
      "bg-red-600 text-white shadow-sm hover:bg-red-700 " +
      "focus-visible:ring-red-600",
    success:
      "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 " +
      "focus-visible:ring-emerald-600",
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        base,
        sizes[size],
        variants[variant],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
});