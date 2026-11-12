import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getBuyerRequestState } from "@/lib/viewings/requests";
import { getBookingPrefill } from "@/lib/viewings/actions";
import RequestViewing from "./RequestViewing";

export default async function ListingViewingRequest({ listingId }: { listingId: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sellers manage requests from their Viewings page, not the listing page.
  if (user) {
    const { data: listing } = await supabase
      .from("listings")
      .select("member_id")
      .eq("id", listingId)
      .maybeSingle<{ member_id: string }>();
    if (listing?.member_id === user.id) return null;
  }

  const state = await getBuyerRequestState(listingId);
  if (!state.accepts && !state.request && !state.thread) return null;

  const prefill = user ? await getBookingPrefill() : { name: "", phone: "" };

  return <RequestViewing listingId={listingId} signedIn={Boolean(user)} state={state} prefill={prefill} />;
}