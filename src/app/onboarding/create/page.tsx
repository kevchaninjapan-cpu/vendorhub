"use client";

import Link from "next/link";
import { useState } from "react";

export default function OnboardingCreateAccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // After signup, continue onboarding
        body: JSON.stringify({ email, password, redirectTo: "/onboarding/details" }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Account creation failed.");
        return;
      }

      // If session exists, we can redirect immediately.
      if (data?.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }

      // Otherwise, Supabase might require email confirmation.
      setMessage(data?.message ?? "Account created. Check your email to confirm, then continue onboarding.");
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      

      <section className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-900">
            Step 1 of 5
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-900">
            Use an email and password to secure your VendorHub access.
          </p>

          <form onSubmit={handleCreate} className="mt-8 grid gap-5">
            <label className="grid gap-2 text-xs font-semibold uppercase text-slate-900">
              Email address
              <input
                type="email"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-xs font-semibold uppercase text-slate-900">
              Password
              <input
                type="password"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <span className="text-[12px] normal-case font-normal text-slate-900">
                Minimum 8 characters recommended.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Continue"}
            </button>

            <div className="text-center text-sm text-slate-900">
              Already have an account?{" "}
              <Link href="/signin?redirect=/app" className="font-semibold text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}