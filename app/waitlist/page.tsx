"use client";

import { useState } from "react";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      setMessage("🎉 You're on the waitlist!");
      setEmail("");

      // Auto‑clear after 4 seconds
      setTimeout(() => setMessage(""), 4000);
    } else {
      setMessage("❌ Please enter a valid email.");
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 pt-24 pb-32">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Join the Waitlist
      </h1>

      <p className="mt-4 text-gray-600">
        Be the first to know when VendorHub launches publicly.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMessage(""); // Clear errors when typing
          }}
          placeholder="you@example.com"
          className="w-full border rounded-lg p-3 text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-lg font-medium py-3 rounded-lg transition
            ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"}
          `}
        >
          {loading ? "Joining..." : "Join Waitlist"}
        </button>

        {message && (
          <p
            className={`text-center text-lg mt-4 transition-opacity duration-500 ${
              message ? "opacity-100" : "opacity-0"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}