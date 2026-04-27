// src/lib/supabase/auth.ts
import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/**
 * Returns the signed-in user or redirects to /Sign In.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/Sign In");
  return user;
}

/**
 * Returns user or null (no redirect).
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
``