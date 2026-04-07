// src/app/app/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getOrCreateRole } from "@/lib/profile";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const role = await getOrCreateRole();

  // If role is null, either not logged in or profiles RLS is blocking.
  if (!role) redirect("/auth/sign-in");

  return <div className="min-h-screen">{children}</div>;
}
``