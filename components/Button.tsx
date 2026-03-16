"use client";

import Link from "next/link";
import clsx from "clsx";
import * as React from "react";

type BaseProps = {
  className?: string;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
};

type AnchorProps = BaseProps & {
  href: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href">;

type ButtonProps = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;

type Props = AnchorProps | ButtonProps;

export default function Button(props: Props) {
  const { variant = "primary", className, children, ...rest } = props as any;

  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : "bg-gray-200 text-gray-900 hover:bg-gray-300";

  // If props include `href`, render a Next.js Link-styled <a>
  if ("href" in props && typeof props.href === "string") {
    const { href, ...anchorRest } = rest as Omit<AnchorProps, "children" | "variant" | "className">;
    return (
      <Link
        href={href}
        className={clsx(base, styles, className)}
        {...anchorRest}
      >
        {children}
      </Link>
    );
  }

  // Otherwise render a native <button>
  const buttonRest = rest as Omit<ButtonProps, "children" | "variant" | "className">;
  return (
    <button className={clsx(base, styles, className)} {...buttonRest}>
      {children}
    </button>
  );
}