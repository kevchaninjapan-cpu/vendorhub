"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
        setError(data?.error ?? "Sign-in failed.");
        setLoading(false);
        return;
      }

      window.location.href = redirectTo;
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error");
      setLoading(false);
    }
  };

  const sendMagicLink = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otpType: "magic_link" }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not send magic link.");
      } else {
        // Optional: inform user
        alert(data?.message ?? "Magic link sent. Check your email.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 40, maxWidth: 420, margin: "0 auto" }}>
      <h1>Sign in</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ fontWeight: 600 }}>
          Email
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            required
          />
        </label>

        <label style={{ fontWeight: 600 }}>
          Password
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            required
          />
        </label>

        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, background: "black", color: "white", borderRadius: 8 }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <button
          type="button"
          disabled={loading || !email}
          onClick={sendMagicLink}
          style={{ padding: 10, background: "#f3f4f6", borderRadius: 8 }}
          title="Send a one-time magic link to your email"
        >
          {loading ? "Sending…" : "Send magic link"}
        </button>
      </form>
    </main>
  );
}
