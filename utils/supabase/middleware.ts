// utils/supabase/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Next.js 15: cookies in middleware are accessed via `request.cookies` and
 * written to `response.cookies`. We let Supabase refresh tokens by calling
 * auth.getUser(), and persist any cookie updates onto the response.
 */
export async function supabaseMiddleware(request: NextRequest) {
  // Prepare a response we can mutate
  const response = NextResponse.next()

  // Wire Supabase SSR client using request/response cookie bridges
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This triggers a token refresh if needed and syncs cookies onto `response`
  await supabase.auth.getUser()

  return response
}