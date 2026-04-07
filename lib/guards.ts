import 'server-only'
import { requireUser, requireAdmin } from "@/lib/auth"

export async function requireAuth() {
  return requireUser()
}

export async function requireAdminAuth() {
  return requireAdmin()
}
``