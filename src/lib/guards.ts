import "server-only";

import { createRouteHandlerClient } from "@/lib/supabase/route";
import { isAdminUser } from "@/lib/auth/admin";

/**
 * Require any authenticated user.
 * Returns the user for downstream use.
 */
export async function requireAuth() {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new Error("Unauthorized");
  }

  return data.user;
}

/**
 * Require an authenticated admin user.
 * Returns the user if authorised.
 */
export async function requireAdminAuth() {
  const user = await requireAuth();

  if (!isAdminUser(user)) {
    throw new Error("Forbidden");
  }

  return user;
}
