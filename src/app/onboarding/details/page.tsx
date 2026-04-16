"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string };

export default function OnboardingDetailsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState(""); // HTML date input: YYYY-MM-DD

  const redirectToSignIn = (path: string) => {
    router.replace(`/auth/sign-in?redirect=${encodeURIComponent(path)}`);
  };

  const canContinue =
    fullName.trim().length >= 2 &&
    email.trim().length >= 5 &&
    dob.length === 10; // yyyy-mm-dd

  // Load auth session + existing profile (populate fields)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      // ✅ Fix for testers: if session is missing, force re-auth
      if (userErr || !user) {
        redirectToSignIn("/onboarding/details");
        return;
      }

      // Prefill email from auth first (can be overwritten by stored profile.email)
      setEmail(user.email ?? "");

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("full_name, phone, email, date_of_birth")
        .eq("id", user.id)
        .single();

      // If no profile row exists yet, ignore (PGRST116 = "no rows" from .single())
      if (profileErr && profileErr.code !== "PGRST116") {
        setSaveState({ status: "error", message: profileErr.message });
        setLoading(false);
        return;
      }

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
        setEmail(profile.email ?? user.email ?? "");
        setDob(profile.date_of_birth ?? "");
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Onboarding Details</h1>

      {loading ? (
        <div className="text-sm text-gray-600">Loading your saved details…</div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canContinue) return;

            setSaveState({ status: "saving" });

            const {
              data: { user },
              error: userErr,
            } = await supabase.auth.getUser();

            // ✅ If session disappeared mid-flow, force re-auth
            if (userErr || !user) {
              redirectToSignIn("/onboarding/details");
              return;
            }

            const { error: upsertErr } = await supabase.from("profiles").upsert(
              {
                id: user.id,
                email: email.trim(),
                full_name: fullName.trim(),
                phone: phone.trim() || null,
                date_of_birth: dob, // YYYY-MM-DD -> Postgres date
                onboarding_status: "details_completed",
              },
              { onConflict: "id" }
            );

            if (upsertErr) {
              setSaveState({ status: "error", message: upsertErr.message });
              return;
            }

            router.push("/onboarding/verification-documents");
          }}
        >
          <input
            className="w-full border rounded p-2"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />

          <input
            type="email"
            className="w-full border rounded p-2"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            className="w-full border rounded p-2"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date of birth
            </label>
            <input
              type="date"
              className="w-full border rounded p-2"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div className="text-xs text-gray-500">
            Signed in as <span className="font-medium">{email || "—"}</span>
          </div>

          {saveState.status === "error" && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {saveState.message}
            </div>
          )}

          <button
            type="submit"
            disabled={!canContinue || saveState.status === "saving"}
            className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
          >
            {saveState.status === "saving" ? "Saving…" : "Continue"}
          </button>
        </form>
      )}
    </div>
  );
}
