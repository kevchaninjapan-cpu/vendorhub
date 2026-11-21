import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import NegotiationsBoard, { type Negotiation } from "@/components/offers/NegotiationsBoard";

export const metadata: Metadata = { title: "Offers | VendorHub", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/account/offers");

  const { data, error } = await supabase.rpc("my_negotiations");
  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-rose-700">
        Couldn&apos;t load your offers right now. Please try again shortly.
      </div>
    );
  }

  const all = (data ?? []) as Negotiation[];
  const selling = all.filter((n) => n.role === "seller");
  const buying = all.filter((n) => n.role === "buyer");
  const waiting = all.filter((n) => n.my_turn).length;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Offers</h1>
        <p className="mt-1 text-sm text-slate-500">
          {waiting > 0
            ? `${waiting} offer${waiting === 1 ? " is" : "s are"} waiting for your response.`
            : "Every offer, counter-offer and response, in order."}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Offers on my listings</h2>
        <NegotiationsBoard items={selling} emptyText="No offers on your listings yet." />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">My offers</h2>
        <NegotiationsBoard items={buying} emptyText="You haven't made any offers yet." />
      </section>
    </div>
  );
}