// lib/auth.ts
import "server-only";
import { createSupabaseServerClient } from "@/utils/supabase/server"; // your async factory
import type { Database } from "@/types/supabase";
import type { User } from "@supabase/supabase-js";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Returns the currently authenticated user (or null).
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/**
 * Returns the current user's profile (id, email, is_admin...) or null if not signed in.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return null;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email, is_admin, created_at") // include any extra columns you need
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileErr) return null;
  return profile ?? null;
}