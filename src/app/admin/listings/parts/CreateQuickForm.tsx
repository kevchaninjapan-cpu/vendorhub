"use client";

import { useState, FormEvent } from "react";

export default function CreateQuickForm() {
  const [title, setTitle] = useState("");
  const [priceDollars, setPriceDollars] = useState<string>(""); // dollars in UI
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const body: Record<string, unknown> = { title };
    if (priceDollars !== "") body.price = Number(priceDollars); // server converts → cents

    const res = await fetch("/api/listings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({} as any));
    setSaving(false);

    if (!res.ok) {
      setMsg(`Error: ${json.error ?? "Unknown"}`);
      return;
    }

    setTitle("");
    setPriceDollars("");
    setMsg("Created ✅");
    window.location.reload(); // refresh server data
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border rounded p-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-slate-600">Title *</label>
        <input
          className="border rounded px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Sunny 3BR in Mt Eden"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-slate-600">Price (NZD)</label>
        <input
          className="border rounded px-3 py-2"
          type="number"
          min={0}
          inputMode="numeric"
          value={priceDollars}
          onChange={(e) => setPriceDollars(e.target.value)}
          placeholder="e.g., 1250000"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
      >
        {saving ? "Creating…" : "Create"}
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}