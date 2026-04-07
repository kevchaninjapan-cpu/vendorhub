// proxy.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ✅ Single source of truth for protected areas
// Your app lives under /app, not /dashboard
const PROTECTED_PREFIXES = ["/app", "/admin"];

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();

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

  // ✅ Always refresh the session (Supabase requirement)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ Determine whether this path requires authentication
  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );

  // ✅ Redirect unauthenticated users
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return response;
}

// ✅ Only run proxy on relevant paths
export const config = {
  matcher: [
    "/app",
    "/app/:path*",
    "/admin",
    "/admin/:path*",
  ],
};