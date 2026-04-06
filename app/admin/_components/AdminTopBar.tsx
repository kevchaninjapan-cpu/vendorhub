// app/admin/_components/AdminTopBar.tsx
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function AdminTopBar({
  crumbs,
}: {
  crumbs: { label: string; href?: string }[];
}) {
  async function signOut() {
    "use server";
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) =>
            cs.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    );

    await supabase.auth.signOut();
  }

  return (
    <div className="mb-6">
      <div className="rounded-2xl border border-border/40 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex flex-wrap items-center gap-2 text-sm">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;

                return (
                  <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-2">
                    {c.href && !isLast ? (
                      <Link
                        href={c.href}
                        className="truncate text-muted hover:text-foreground"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span className="truncate font-medium text-foreground">
                        {c.label}
                      </span>
                    )}

                    {!isLast && (
                      <span className="select-none text-muted">/</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Logout */}
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-muted hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}