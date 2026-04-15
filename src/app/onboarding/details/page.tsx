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

  const canContinue = fullName.trim().length >= 2;

  /**
   * Load:
   * 1. Auth user (for email + id)
   * 2. Existing profile data (so form is populated, not hard-coded)
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authErr) {
        setSaveState({ status: "error", message: authErr.message });
        setLoading(false);
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      // Ignore "no rows" error (first-time users)
      if (profileErr && profileErr.code !== "PGRST116") {
        setSaveState({ status: "error", message: profileErr.message });
        setLoading(false);
        return;
      }

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="w-full max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Onboarding Details</h1>

      {loading ? (
        <div className="text-sm text-gray-600">
          Loading your saved details…
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canContinue) return;

            setSaveState({ status: "saving" });

            const {
              data: { user },
              error: authErr,
            } = await supabase.auth.getUser();

            if (authErr) {
              setSaveState({ status: "error", message: authErr.message });
              return;
            }

            if (!user) {
              router.replace("/login");
              return;
            }

            /**
             * ✅ CRITICAL
             * Persist onboarding details into public.profiles
             * Review page reads ONLY from DB
             */
            const { error: upsertErr } = await supabase.from("profiles").upsert(
              {
                id: user.id,
                email: user.email ?? email ?? null,
                full_name: fullName.trim(),
                phone: phone.trim() || null,
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
            className="w-full rounded border p-2"
            placeholder="Full name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            className="w-full rounded border p-2"
            placeholder="Phone (optional)"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

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
            className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
          >
            {saveState.status === "saving" ? "Saving…" : "Continue"}
          </button>
        </form>
      )}
    </div>
  );
}
``