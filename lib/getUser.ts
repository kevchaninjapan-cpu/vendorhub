// lib/getUser.ts
import type { User } from "@supabase/supabase-js";
import { supabaseServer } from "./supabaseServer";

/**
 * Fetch the currently signed-in user on the server.
 * Returns null if no session.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await supabaseServer(); // <-- await because the helper is async

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // Optional: console.error("getUser error:", error);
    return null;
  }

  return user ?? null;
}