"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser"; // or "../../../lib/supabaseBrowser"

export default function SignUpPage() {
  const supabase = supabaseBrowser();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setMsg(error.message || "Sign-up failed. Please try again.");
      return;
    }

    // Keep it simple for now: instruct the user to sign in
    setMsg("✅ Account created. You can sign in now.");
  }

  return (
    <div className="max-w-md mx-auto px-6 pt-24 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Create your account
      </h1>

      <p className="mt-2 text-gray-600">
        Join VendorHub to start creating your listings.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMsg(null);
            }}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setMsg(null);
            }}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-lg p-3 text-white font-medium transition ${
            loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Creating…" : "Create account"}
        </button>

        {msg && <p className="text-sm mt-2 text-gray-700">{msg}</p>}
      </form>

      {/* Correct Link syntax below */}
      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="text-indigo-600 hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
``