import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", user.id)
    .single<{ role: string; email: string | null; full_name: string | null }>();

  if (!profile || !["moderator", "admin"].includes(profile.role)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              VendorHub
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/moderation/queue"
                className="text-muted-foreground hover:text-foreground"
              >
                Moderation
              </Link>
            </nav>
          </div>
          <div className="text-xs text-muted-foreground">
            Signed in as <strong>{profile.full_name ?? profile.email}</strong> ·{" "}
            <span className="uppercase">{profile.role}</span>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}