"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

type SubmitButtonProps = {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

export default function SubmitButton({
  children,
  variant = "default",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
    >
      {pending ? "Saving…" : children}
    </Button>
  );
}