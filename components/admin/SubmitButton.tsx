// components/admin/SubmitButton.tsx
"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui";

type SubmitButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "disabled"
> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pendingText?: string;
};

/**
 * Thin wrapper around UI kit Button for server actions/forms.
 * - Disables while pending
 * - Keeps styling consistent across admin screens
 */
export default function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  pendingText = "Working…",
  className,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      {...props}
    >
      {pending ? pendingText : children}
    </Button>
  );
}