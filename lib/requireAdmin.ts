// lib/requireAdmin.ts
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

type RequireAdminResult = {
  user: { id: string; email?: string | null; [k: string]: any };
  // This resolves to a SupabaseClient because supabaseServer() is async
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
};

/**
 * Ensures the requester is signed in AND has user_metadata.is_admin === true.
 * - If not signed in: redirects to /auth/sign-in
 * - If signed in but not admin: redirects to /
 *
 * Usage:
 *   const { user, supabase } = await requireAdmin();
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  // ✅ IMPORTANT: await the async helper
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in");
  }

  const isAdmin = user.user_metadata?.is_admin === true;
  if (!isAdmin) {
    redirect("/"); // or redirect("/403") if you prefer
  }

  return { user, supabase };
}