import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Returns the authenticated user or null.
 * Does NOT redirect.
 */
export async function requireUser(): Promise<User | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('[AUTH_REQUIRE_USER_ERROR]', error)
    return null
  }

  return data?.user ?? null
}

/**
 * Returns the authenticated admin user or null.
 * Does NOT redirect.
 */
export async function requireAdmin(): Promise<User | null> {
  const user = await requireUser()
  if (!user) return null

  const role =
    user.user_metadata?.role ??
    user.app_metadata?.role

  if (role !== 'admin') return null

  return user
}
``