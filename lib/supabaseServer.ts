// lib/supabaseServer.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Next.js 15: cookies() is async, so this helper must be async.
 * Always `await supabaseServer()` where you use it (route handlers, server components, server actions).
 */
export async function supabaseServer() {
  const cookieStore = await cookies() // <-- await is required on Next.js 15

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies for Supabase to parse session
        getAll() {
          return cookieStore.getAll()
        },
        /**
         * Supabase will try to write/refresh auth cookies.
         * In Route Handlers this works. In Server Components,
         * writes may no-op (middleware can persist them if you wire it later).
         */
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a non-mutable context (e.g., some Server Components):
            // It's safe to ignore; auth middleware can refresh tokens if needed.
          }
        },
      },
    }
  )
}