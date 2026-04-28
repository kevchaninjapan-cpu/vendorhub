import Link from "next/link";
import { redirect } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { submitForVerification } from "./actions";

type VerificationDoc = {
  doc_type: string;
  status: string;
};

export default async function OnboardingReviewPage() {
  console.log("[REVIEW_PAGE] Loading...");

  const supabase = await supabaseServer();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  console.log("[REVIEW_PAGE] user:", user?.id ?? "NULL");

  if (userErr || !user) {
    console.log("[REVIEW_PAGE] No user — redirecting to welcome");
    redirect("/onboarding/welcome");
  }

  const admin = supabaseAdmin();

  // ✅ Use limit(1) instead of single() — handles duplicate rows gracefully
  const { data: profiles, error: profileErr } = await admin
    .from("onboarding_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const profile = profiles?.[0] ?? null;

  console.log("[REVIEW_PAGE] profile:", profile?.user_id ?? "NULL", "err:", profileErr?.message ?? "none");

  if (profileErr || !profile) {
    console.log("[REVIEW_PAGE] No profile — redirecting to details");
    redirect("/onboarding/details");
  }

  const { data: docs, error: docsErr } = await admin
    .from("verification_documents")
    .select("doc_type, status")
    .eq("user_id", user.id);

  console.log("[REVIEW_PAGE] docs:", JSON.stringify(docs), "err:", docsErr?.message ?? "none");

  const documents: VerificationDoc[] = docs ?? [];

  const hasGovId = documents.some(
    (d) => d.doc_type === "government_id" && d.status === "uploaded"
  );
  const hasResidence = documents.some(
    (d) => d.doc_type === "proof_of_residence" && d.status === "uploaded"
  );

  console.log("[REVIEW_PAGE] hasGovId:", hasGovId, "hasResidence:", hasResidence, "canSubmit:", hasGovId && hasResidence);

  const canSubmit = hasGovId && hasResidence;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-sm font-semibold text-slate-900">VendorHub</div>
        <Link
          href="/onboarding/verification-documents"
          className="text-sm text-slate-900 hover:text-slate-900"
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
                <div className="text-xs font-semibold text-slate-900">STEP 5 OF 5</div>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">Review & Submit</h1>
                <p className="mt-1 text-sm text-slate-900">
                  Please ensure all information is accurate. This summary will be used for final verification.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Personal Information</h2>
                  <Link
                    href="/onboarding/details"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Link>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-slate-900">FULL NAME</dt>
                    <dd className="text-sm text-slate-900">{profile.full_name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-900">OFFICIAL EMAIL</dt>
                    <dd className="text-sm text-slate-900">
                      {profile.official_email ?? user.email ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-900">BUSINESS PHONE</dt>
                    <dd className="text-sm text-slate-900">{profile.business_phone ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 p-4">
                <h2 className="text-sm font-semibold text-slate-900">Final verification</h2>
                <p className="mt-2 text-sm text-slate-900">
                  Upon submission, your profile will enter a review cycle.
                  You'll be notified once verification is complete.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Docs + Submit */}
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Uploaded Documents</h2>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-sm text-slate-900">Government ID</div>
                  <div className={`text-xs font-semibold ${hasGovId ? "text-emerald-700" : "text-rose-700"}`}>
                    {hasGovId ? "Uploaded" : "Missing"}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-sm text-slate-900">Proof of residence</div>
                  <div className={`text-xs font-semibold ${hasResidence ? "text-emerald-700" : "text-rose-700"}`}>
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