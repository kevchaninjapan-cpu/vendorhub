import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type VerificationDoc = {
  doc_type: string;
  status: string;
};

export default async function OnboardingReviewPage() {
  const supabase = await createClient();

  // --- Auth ---
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) redirect("/login");
  if (!user) redirect("/login");

  // --- Load profile (DB is source of truth) ---
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) redirect("/onboarding/details");
  if (!profile.full_name) redirect("/onboarding/details");

  // --- Load verification docs ---
  const { data: docs, error: docsErr } = await supabase
    .from("verification_documents")
    .select("doc_type, status")
    .eq("user_id", user.id);

  if (docsErr) redirect("/onboarding/verification-documents");

  const documents: VerificationDoc[] = docs ?? [];

  const hasGovId = documents.some(
    (d) => d.doc_type === "government_id" && d.status === "uploaded"
  );
  const hasResidence = documents.some(
    (d) => d.doc_type === "proof_of_residence" && d.status === "uploaded"
  );

  const canSubmit = hasGovId && hasResidence;

  // --- Server Action: Submit for verification ---
  async function submitForVerification() {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) redirect("/login");
    if (!user) redirect("/login");

    // Re-check docs server-side (never trust client)
    const { data: docs, error: docsErr } = await supabase
      .from("verification_documents")
      .select("doc_type, status")
      .eq("user_id", user.id);

    if (docsErr) redirect("/onboarding/verification-documents");

    const documents: VerificationDoc[] = docs ?? [];

    const hasGovId = documents.some(
      (d) => d.doc_type === "government_id" && d.status === "uploaded"
    );
    const hasResidence = documents.some(
      (d) => d.doc_type === "proof_of_residence" && d.status === "uploaded"
    );

    if (!hasGovId || !hasResidence) {
      redirect("/onboarding/verification-documents");
    }

    // ✅ 1) Insert into verification_reviews (queue entry)
    // Minimal insert: user_id + status. Add more fields later if your table has them.
    const { error: reviewErr } = await supabase
      .from("verification_reviews")
      .insert({
        user_id: user.id,
        status: "pending",
      });

    // If you later add a UNIQUE constraint (e.g., one pending review per user),
    // a duplicate will throw 23505. We'll ignore that and continue.
    if (reviewErr && reviewErr.code !== "23505") {
      redirect("/onboarding/review");
    }

    // ✅ 2) Mark profile as submitted
    // NOTE: submitted_at + onboarding_status columns must exist in profiles.
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        onboarding_status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateErr) {
      redirect("/onboarding/review");
    }

    // ✅ 3) Done
    redirect("/onboarding/submitted");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-sm font-semibold text-slate-900">VendorHub</div>
        <Link
          href="/onboarding/verification-documents"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Back
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Summary */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <div className="text-xs font-semibold text-slate-500">
                  STEP 5 OF 5
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                  Review &amp; Submit
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Please ensure all information is accurate. This summary will be
                  used for final verification.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Personal Information
                  </h2>
                  <Link
                    href="/onboarding/details"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Link>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      FULL NAME
                    </dt>
                    <dd className="text-sm text-slate-900">
                      {profile.full_name ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      OFFICIAL EMAIL
                    </dt>
                    <dd className="text-sm text-slate-900">
                      {profile.email ?? user.email ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      BUSINESS PHONE
                    </dt>
                    <dd className="text-sm text-slate-900">
                      {profile.phone ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 p-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Final verification
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Upon submission, your profile will enter a review cycle.
                  You’ll be notified once verification is complete.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Docs + Submit */}
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Uploaded Documents
              </h2>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-sm text-slate-900">Government ID</div>
                  <div
                    className={`text-xs font-semibold ${
                      hasGovId ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {hasGovId ? "Uploaded" : "Missing"}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-sm text-slate-900">Proof of residence</div>
                  <div
                    className={`text-xs font-semibold ${
                      hasResidence ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {hasResidence ? "Uploaded" : "Missing"}
                  </div>
                </div>

                {!canSubmit && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    You must upload both documents before you can submit.
                    <div className="mt-2">
                      <Link
                        href="/onboarding/verification-documents"
                        className="font-semibold text-rose-800 underline"
                      >
                        Go to verification documents
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <form action={submitForVerification} className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Submit for verification
                </button>

                <Link
                  href="/seller-studio"
                  className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Save draft and exit
                </Link>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
``