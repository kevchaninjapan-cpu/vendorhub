"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// The one sign-in page. Other sign-in addresses (/auth/sign-in, /sign-in)
// redirect here and keep their ?redirect= or ?next= value.

// Only allow addresses on VendorHub, so a crafted link can't send someone to
// another website after they sign in.
function safeNext(value: string | null): string {
  if (!value) return "/account";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/account";
  if (value.startsWith("/signin") || value.startsWith("/auth/sign-in") || value.startsWith("/sign-in")) {
    return "/account";
  }
  return value;
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("redirect") ?? params.get("next"));

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
        setError(data?.error ?? "Sign in failed. Please check your email and password.");
        return;
      }

      window.location.href = next;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-900">Sign in to your VendorHub account to continue.</p>

          <form onSubmit={handleSignIn} className="mt-8 grid gap-5">
            <label className="grid gap-2 text-xs font-semibold uppercase text-slate-900">
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

            <label className="grid gap-2 text-xs font-semibold uppercase text-slate-900">
              Password
              <input
                type="password"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-blue-600 focus:ring-2"
                placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <div className="-mt-2 flex justify-end">
              <Link href="/signin/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Signing in\u2026" : "Sign in"}
            </button>

            <div className="text-center text-sm text-slate-900">
              Don&apos;t have an account?{" "}
              <Link href="/auth/sign-up" className="font-semibold text-blue-600 hover:underline">
                Create one
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}