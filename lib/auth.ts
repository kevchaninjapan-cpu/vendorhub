import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('[AUTH_REQUIRE_USER_ERROR]', error)
    return null
  }

  return data?.user ?? null
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!user) return null

  const role =
    user.user_metadata?.role ??
    user.app_metadata?.role

  if (role !== 'admin') return null

  return user
}
