import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import VerifyForm from "./VerifyForm";

export const metadata: Metadata = { title: "Verify identity — VendorHub" };
export const dynamic = "force-dynamic";

type VerificationRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  verified_at: string | null;
  notes: string | null;
};

export default async function VerifyPage() {
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
  if (!user) redirect("/auth/sign-in?next=/account/verify");

  const { data: v } = await supabase
    .from("verifications")
    .select("id, status, submitted_at, verified_at, notes")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const verification = v as VerificationRow | null;

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Verify your identity</h1>
        <p className="mt-1 text-sm text-slate-600">
          Verification unlocks offer submission. We use NZ AML/CFT-standard
          documents. Free, one-time, and usually reviewed within 1 business day.
        </p>
      </header>

      {verification && (
        <div
          className={`mb-6 rounded-md border p-4 text-sm ${
            verification.status === "approved"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : verification.status === "rejected"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          <p className="font-semibold capitalize">Status: {verification.status}</p>
          {verification.status === "pending" && (
            <p className="mt-1 text-xs">
              Submitted {new Date(verification.submitted_at!).toLocaleString("en-NZ")}.
              We&apos;ll email you when review is complete.
            </p>
          )}
          {verification.status === "rejected" && verification.notes && (
            <p className="mt-1 text-xs">Reason: {verification.notes}</p>
          )}
          {verification.status === "approved" && verification.verified_at && (
            <p className="mt-1 text-xs">
              Verified {new Date(verification.verified_at).toLocaleDateString("en-NZ")}.
            </p>
          )}
        </div>
      )}

      {(!verification || verification.status === "rejected") && (
        <VerifyForm userId={user.id} />
      )}
    </div>
  );
}
