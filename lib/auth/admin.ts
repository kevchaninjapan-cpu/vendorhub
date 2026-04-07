import type { User } from "@supabase/supabase-js";

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;

  // Supports both common Supabase role locations
  const role =
    user.user_metadata?.role ??
    user.app_metadata?.role;

  return role === "admin";
}
