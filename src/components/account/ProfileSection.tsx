"use client";

import { useState } from "react";

type Profile = {
  full_name?: string | null;
  official_email?: string | null;
  business_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
};

type FormState = {
  full_name: string;
  business_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  country: string;
};

export default function ProfileSection({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: profile.full_name ?? "",
    business_phone: profile.business_phone ?? "",
    address_line1: profile.address_line1 ?? "",
    address_line2: profile.address_line2 ?? "",
    city: profile.city ?? "",
    postcode: profile.postcode ?? "",
    country: profile.country ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof FormState; label: string }[] = [
    { key: "full_name", label: "Full Name" },
    { key: "business_phone", label: "Phone" },
    { key: "address_line1", label: "Address Line 1" },
    { key: "address_line2", label: "Address Line 2" },
    { key: "city", label: "City" },
    { key: "postcode", label: "Postcode" },
    { key: "country", label: "Country" },
  ];

  return (
    <section id="profile" className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Profile</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Edit
          </button>
        )}
      </div>

      {saved && (
        <p className="mb-4 text-sm text-emerald-600">Saved successfully.</p>
      )}

      {!editing ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Full Name", value: profile.full_name },
            { label: "Email", value: profile.official_email ?? email },
            { label: "Phone", value: profile.business_phone },
            { label: "Address", value: profile.address_line1 },
            { label: "City", value: profile.city },
            { label: "Postcode", value: profile.postcode },
            { label: "Country", value: profile.country },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-gray-900">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(({ key, label }) => (
            <label
              key={key}
              className="grid gap-1 text-xs font-semibold uppercase text-gray-500"
            >
              {label}
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 normal-case font-normal outline-none ring-blue-600 focus:ring-2"
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </label>
          ))}

          {error && (
            <p className="col-span-2 text-sm text-red-600">{error}</p>
          )}

          <div className="col-span-2 flex gap-3 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}