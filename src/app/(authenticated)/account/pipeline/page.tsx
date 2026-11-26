import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import PipelineView, { type PipelineData } from "@/components/crm/PipelineView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buyer pipeline | VendorHub", robots: { index: false, follow: false } };

export default async function PipelinePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/account/pipeline");

  const { data, error } = await supabase.rpc("seller_pipeline");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/account" className="text-sm text-slate-500 hover:text-slate-800">
        &larr; Back to my account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Buyer pipeline</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every buyer who has enquired, booked a viewing or made an offer on your listings. Stages update automatically.
      </p>
      <div className="mt-6">
        {error || !data ? (
          <p className="text-sm text-rose-700">Couldn&apos;t load your pipeline right now. Please try again shortly.</p>
        ) : (
          <PipelineView data={data as PipelineData} />
        )}
      </div>
    </div>
  );
}