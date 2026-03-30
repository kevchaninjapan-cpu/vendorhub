// lib/supabaseServer.ts
import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Returns a Supabase server client configured for Next.js App Router.
 * Works in Route Handlers + Server Actions + Server Components.
 *
 * IMPORTANT: returns the client directly — do NOT destructure.
 */
export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail fast: prevents "Cannot read properties of undefined (reading 'auth')"
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Some server contexts can't set cookies; safe to ignore.
        }
      },
    },
  });
}

// Optional: allow default import too (prevents import-style mismatch bugs)
export default supabaseServer;
``