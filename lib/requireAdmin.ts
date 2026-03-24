import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

/**
 * Server-side guard: requires a logged-in user whose profile has is_admin = true.
 *
 * Compatible with Next.js 15/16 where `cookies()` is async.
 * Safe for Server Components/layouts/pages (no cookie mutation).
 */
export async function requireAdmin() {
  // Next.js 15/16: cookies() returns a Promise<ReadonlyRequestCookies>
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),

        /**
         * In Server Components/layouts, Next does not allow mutating cookies.
         * Supabase may attempt to set cookies during token refresh; for a guard
         * we can safely no-op. If you need refresh in a route handler, use the
         * alternative version (see below).
         */
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  // If the profile row can't be read (RLS) or doesn't exist or isn't admin → deny
  if (profileError || !profile?.is_admin) {
    redirect("/");
  }

  return { user };
}