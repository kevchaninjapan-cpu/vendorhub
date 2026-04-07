// src/lib/guards.ts
import "server-only";
import { redirect } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function getAdminEmailAllowlist(): Set<string> {
  // Optional: ADMIN_EMAILS="kevin@domain.com,admin@domain.com"
  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((s) => normalizeEmail(s))
    .filter(Boolean);

  return new Set(emails);
}

export async function requireAuth() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/auth/sign-in");
  }

  return data.user;
}

export async function requireAdminAuth() {
  const user = await requireAuth();

  const allowlist = getAdminEmailAllowlist();
  if (allowlist.size === 0) {
    // No allowlist configured yet: don't block development
    return user;
  }

  const email = user.email ? normalizeEmail(user.email) : "";
  if (!email || !allowlist.has(email)) {
    redirect("/unauthorized");
  }

  return user;
}
