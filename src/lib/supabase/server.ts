// src/lib/supabase/server.ts
import "server-only";
import supabaseServer from "@/lib/supabaseServer";

/**
 * Backwards-compatible wrapper.
 * Some modules import { createServerClient } from "@/lib/supabase/server".
 *
 * Returns the same Supabase server client as supabaseServer(),
 * wired with cookies + env vars correctly.
 */
export async function createServerClient() {
  return await supabaseServer();
}