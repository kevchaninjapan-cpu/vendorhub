import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default async function PreviewRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (!profile || !["moderator", "admin"].includes(profile.role)) {
    redirect("/");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("slug, region, suburb")
    .eq("id", id)
    .single<{
      slug: string | null;
      region: string | null;
      suburb: string | null;
    }>();

  if (!listing || !listing.slug) notFound();

  const regionSlug = listing.region?.toLowerCase() ?? "auckland";
  const suburbSlug =
    listing.suburb?.toLowerCase().replace(/\s+/g, "-") ?? "unknown";

  redirect(`/listings/${regionSlug}/${suburbSlug}/${listing.slug}?preview=1`);
}
``