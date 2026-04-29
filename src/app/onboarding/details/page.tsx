"use client";

import Link from "next/link";
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
  const [dob, setDob] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("NZ");

  const canContinue =
    fullName.trim().length >= 2 &&
    email.trim().length >= 5 &&
    dob.length === 10;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userErr || !user) {
        router.replace("/signin");
        return;
      }

      setEmail(user.email ?? "");

      const res = await fetch("/api/account/profile");
      const data = await res.json().catch(() => null);

      if (data?.profile) {
        setFullName(data.profile.full_name ?? "");
        setPhone(data.profile.business_phone ?? "");
        setEmail(data.profile.official_email ?? user.email ?? "");
        setAddressLine1(data.profile.address_line1 ?? "");
        setAddressLine2(data.profile.address_line2 ?? "");
        setCity(data.profile.city ?? "");
        setPostcode(data.profile.postcode ?? "");
        setCountry(data.profile.country ?? "NZ");
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;

    setSaveState({ status: "saving" });

    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        business_phone: phone.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
        city: city.trim(),
        postcode: postcode.trim(),
        country: country.trim(),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setSaveState({
        status: "error",
        message: data?.error ?? "Save failed. Please try again.",
      });
      return;
    }

    router.push("/onboarding/verification-documents");
  };

  const backHref = "/onboarding";

  return (
    <main className="min-h-screen bg-slate-50">
      

      <section className="mx-auto max-w-2xl px-6 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              Step 2 of 5
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Personal details
            </h1>
            <p className="mt-1 text-sm text-slate-900">
              Tell us a bit about yourself. This information is used for
              verification and communication.
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-900">
              Loading your saved details…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Info Section */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Personal Information
                </h2>

                <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                  Full name
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2 normal-case"
                    placeholder="e.g. Kevin Chan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                  Email address
                  <input
                    type="email"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2 normal-case"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                    Phone number
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2 normal-case"
                      placeholder="021 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                    Date of birth
                    <input
                      type="date"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                    />
                  </label>
                </div>
              </div>

              {/* Address Section */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Residential Address
                </h2>

                <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                  Address line 1
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2 normal-case"
                    placeholder="Street address"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    autoComplete="address-line1"
                  />
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                  Address line 2
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2 normal-case"
                    placeholder="Apartment, suite, unit (optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    autoComplete="address-line2"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                    City
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2 normal-case"
                      placeholder="Auckland"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      autoComplete="address-level2"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                    Postcode
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2 normal-case"
                      placeholder="1010"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      autoComplete="postal-code"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-semibold uppercase text-slate-900">
                    Country
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      autoComplete="country"
                    >
                      <option value="NZ">New Zealand</option>
                      <option value="AU">Australia</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Signed in info */}
              <div className="text-xs text-slate-900">
                Signed in as{" "}
                <span className="font-medium text-slate-700">
                  {email || "—"}
                </span>
              </div>

              {/* Error */}
              {saveState.status === "error" && (
                <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {saveState.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={!canContinue || saveState.status === "saving"}
                  className={[
                    "inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold",
                    canContinue
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "cursor-not-allowed bg-slate-200 text-slate-900",
                  ].join(" ")}
                >
                  {saveState.status === "saving" ? "Saving…" : "Continue"}
                </button>

                <p className="text-xs text-slate-900">
                  Your details are saved automatically when you continue.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}