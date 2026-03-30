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
    <div className="mb-6 flex items-center justify-between border-b pb-3">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-600">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {c.href ? (
              <Link href={c.href} className="hover:text-slate-900">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-900">{c.label}</span>
            )}
            {i < crumbs.length - 1 && <span>/</span>}
          </span>
        ))}
      </nav>

      {/* Logout */}
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Log out
        </button>
      </form>
    </div>
  );
}