// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Protected route prefixes. Add more as needed.
 * We’ll perform a cheap auth check for these paths and redirect unauthenticated users.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

export async function middleware(request: NextRequest) {
  // Always prepare a mutable response we can attach refreshed cookies to
  const response = NextResponse.next();

  // Create an SSR-enabled Supabase client that reads from request cookies
  // and writes any refreshed tokens to the response cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 1) Always trigger a refresh so tokens stay current (low-cost call).
  //    This also ensures any cookie updates are written to the response above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2) Edge-protect specific paths: if unauthenticated and requesting a protected route, redirect
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtected && !user) {
    const signinUrl = request.nextUrl.clone();
    signinUrl.pathname = "/auth/sign-in";
    signinUrl.searchParams.set("redirect", pathname); // preserve return path
    return NextResponse.redirect(signinUrl);
  }

  // 3) Let the request continue (with refreshed cookies on `response`)
  return response;
}

/**
 * Matcher: run middleware on everything EXCEPT Next internals and common static assets.
 * You can keep it broad, or restrict it to just your protected routes for even less overhead.
 */

// middleware.ts (only the config block)
export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/admin',
    '/admin/:path*',
  ],
}

