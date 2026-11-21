import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Staff roles are read from profiles.role with the server-only key.
// Never use user_metadata for this: users can edit their own user_metadata.

export type StaffRole = "admin" | "moderator";

export async function getStaffRole(userId: string): Promise<StaffRole | null> {
  const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = (data as { role?: string | null } | null)?.role;
  return role === "admin" || role === "moderator" ? role : null;
}

export async function isAdminUser(user: { id: string } | null): Promise<boolean> {
  if (!user) return false;
  return (await getStaffRole(user.id)) === "admin";
}