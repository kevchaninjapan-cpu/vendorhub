// src/app/listings/create/CreateListingWizard.tsx
"use client";

import * as React from "react";

export default function CreateListingWizard() {
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onCreate = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error ?? "Create failed");

      // If your API returns id, redirect client-side
      const id = json?.listing?.id ?? json?.id;
      if (id) {
        window.location.href = `/admin/listings/${id}`;
      } else {
        window.location.href = "/admin/listings";
      }
    } catch (e: any) {
      setError(e?.message ?? "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h1 className="text-xl font-semibold">Create listing</h1>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <input
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Modern Villa in Herne Bay"
        />
      </div>

      <button
        type="button"
        onClick={onCreate}
        disabled={saving || !title.trim()}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
``