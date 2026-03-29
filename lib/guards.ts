import 'server-only'
import { redirect } from 'next/navigation'
import { requireUser, requireAdmin } from '@/lib/auth'

export async function requireAuth() {
  const user = await requireUser()
  if (!user) redirect('/login')
  return user
}

export async function requireAdminAuth() {
  const user = await requireAdmin()
  if (!user) redirect('/login')
  return user
}
``