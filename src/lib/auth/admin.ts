// src/lib/auth/admin.ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((s) => normalizeEmail(s))
    .filter(Boolean);

  return new Set(emails);
}

/**
 * Backwards-compatible admin check used by older route handlers.
 * - If ADMIN_EMAILS is set, checks user email against allowlist.
 * - If ADMIN_EMAILS is not set, allows access (MVP-safe, avoids locking you out).
 */
export async function isAdminUser(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return false;

  const allowlist = getAdminEmailAllowlist();
  if (allowlist.size === 0) return true;

  const email = data.user.email ? normalizeEmail(data.user.email) : "";
  return !!email && allowlist.has(email);
}
``