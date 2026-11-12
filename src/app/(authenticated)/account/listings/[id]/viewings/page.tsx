import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { listSessionsForOwner } from "@/lib/viewings/actions";
import { listRequestsForOwner } from "@/lib/viewings/requests";
import ViewingsManager from "@/components/listings/viewings/ViewingsManager";
import RequestsManager from "@/components/listings/viewings/RequestsManager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ListingViewingsPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?redirect=${encodeURIComponent(`/account/listings/${id}/viewings`)}`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, member_id, headline, formatted_address, status, accepts_viewing_requests")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      member_id: string;
      headline: string | null;
      formatted_address: string | null;
      status: string;
      accepts_viewing_requests: boolean | null;
    }>();

  if (!listing || listing.member_id !== user.id) notFound();

  const [sessions, requests] = await Promise.all([listSessionsForOwner(id), listRequestsForOwner(id)]);
  const title = listing.headline ?? listing.formatted_address ?? "Your listing";
  const isVisible = listing.status === "live" || listing.status === "under_offer";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/account/listings" className="text-slate-500 hover:text-slate-800">
          &larr; Back to my listings
        </Link>
        <Link href={`/account/listings/${id}/documents`} className="text-slate-500 hover:text-slate-800">
          Documents &rarr;
        </Link>
      </div>

      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Open homes &amp; viewings</h1>
      <p className="mt-1 text-sm text-slate-500">{title}</p>

      {!isVisible ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Buyers can book and send requests once your listing is live.
        </p>
      ) : null}

      <div className="mt-6 space-y-8">
        <RequestsManager
          listingId={listing.id}
          sellerId={user.id}
          accepts={listing.accepts_viewing_requests !== false}
          requests={requests}
        />
        <ViewingsManager listingId={listing.id} sessions={sessions} />
      </div>
    </div>
  );
}