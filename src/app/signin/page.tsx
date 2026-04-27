"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Sign in failed. Please check your credentials.");
        return;
      }

      // ✅ Redirect to onboarding router — it will send to correct page
      window.location.href = "/onboarding";
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
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <span className="text-sm font-medium text-blue-600">Sign In</span>
        </nav>
        <div className="w-8" />
      </header>

      <section className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to your VendorHub account to continue.
          </p>

          <form onSubmit={handleSignIn} className="mt-8 grid gap-5">
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

            <label className="grid gap-2 text-xs font-semibold uppercase text-slate-500">
              Password
              <input
                type="password"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {/* Forgot password link */}
            <div className="flex justify-end -mt-2">
              <Link
                href="/signin/forgot-password"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

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
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="text-center text-sm text-slate-600">
              Don't have an account?{" "}
              <Link
                href="/onboarding/create"
                className="font-semibold text-blue-600 hover:underline"
              >
                Create one
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}