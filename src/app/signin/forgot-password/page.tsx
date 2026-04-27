"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          // ✅ Uses current origin — localhost:3000 in dev, vercel URL in prod
          redirectTo: `${window.location.origin}/auth/callback?next=/signin/reset-password`,
        }
      );

      if (error) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-900"
        >
          VendorHub
        </Link>
        <div className="w-8" />
      </header>

      <section className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Password Reset
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="mt-8 rounded-xl bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              ✅ Password reset email sent. Check your inbox and follow the
              link to reset your password.
              <div className="mt-4">
                <Link
                  href="/signin"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <label className="grid gap-2 text-xs font-semibold uppercase text-slate-500">
                Email address
                <input
                  type="email"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>

              {error && (
                <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>

              <div className="text-center text-sm text-slate-600">
                Remembered it?{" "}
                <Link
                  href="/signin"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}