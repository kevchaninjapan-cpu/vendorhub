"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/account");
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-slate-900">
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
            Set new password
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose a strong password for your VendorHub account.
          </p>

          {error && !ready && (
            <div className="mt-8 rounded-xl bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}{" "}
              <Link
                href="/signin/forgot-password"
                className="font-semibold underline"
              >
                Request a new link.
              </Link>
            </div>
          )}

          {!ready && !error && (
            <div className="mt-8 rounded-xl bg-amber-50 px-5 py-4 text-sm text-amber-800">
              ⏳ Verifying your reset link...
            </div>
          )}

          {ready && (
            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <label className="grid gap-2 text-xs font-semibold uppercase text-slate-500">
                New password
                <input
                  type="password"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <span className="text-[12px] normal-case font-normal text-slate-500">
                  Minimum 8 characters.
                </span>
              </label>

              <label className="grid gap-2 text-xs font-semibold uppercase text-slate-500">
                Confirm new password
                <input
                  type="password"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                {loading ? "Saving…" : "Set new password"}
              </button>

              <div className="text-center text-sm text-slate-600">
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