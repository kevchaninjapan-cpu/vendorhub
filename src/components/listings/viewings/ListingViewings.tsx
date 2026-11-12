import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getViewingAvailability, getMyBookings, getBookingPrefill } from "@/lib/viewings/actions";
import type { MyBooking } from "@/lib/viewings/schema";
import BookViewings from "./BookViewings";

export default async function ListingViewings({ listingId }: { listingId: string }) {
  const sessions = await getViewingAvailability(listingId);
  if (sessions.length === 0) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: listing } = await supabase
      .from("listings")
      .select("member_id")
      .eq("id", listingId)
      .maybeSingle<{ member_id: string }>();
    isOwner = listing?.member_id === user.id;
  }

  let myBookings: MyBooking[] = [];
  let prefill = { name: "", phone: "" };
  if (user && !isOwner) {
    [myBookings, prefill] = await Promise.all([getMyBookings(listingId), getBookingPrefill()]);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Open homes &amp; viewings</h2>
      <p className="mt-1 text-sm text-slate-500">All times are New Zealand time.</p>

      <div className="mt-4">
        <BookViewings
          sessions={sessions}
          myBookings={myBookings}
          signedIn={Boolean(user)}
          isOwner={isOwner}
          prefill={prefill}
        />
      </div>

      {isOwner ? (
        <p className="mt-4 text-xs text-slate-500">
          This is your listing.{" "}
          <Link href={`/account/listings/${listingId}/viewings`} className="underline">
            Manage open homes &amp; viewings
          </Link>
        </p>
      ) : null}
    </section>
  );
}