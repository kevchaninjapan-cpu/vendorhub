// src/lib/supabaseAdmin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Backwards-compatible admin client.
 * Prefer createAdminClient from '@/lib/supabase/admin' for new code.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}