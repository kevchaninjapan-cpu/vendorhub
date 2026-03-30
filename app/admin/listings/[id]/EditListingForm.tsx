// app/admin/listings/[id]/EditListingForm.tsx
"use client";

import { useState } from "react";
import { z } from "zod";
import type { Database } from "@/types/supabase";

type Listing = Database["public"]["Tables"]["listings"]["Row"];
type DbUpdate = Database["public"]["Tables"]["listings"]["Update"];

// ----- UI status (superset; includes "withdrawn") -----
const StatusValues = ["draft", "active", "under_offer", "sold", "withdrawn"] as const;
type UiStatus = (typeof StatusValues)[number];

// Build the request body type we POST to /api/listings/update:
// Take everything from the DB Update shape EXCEPT 'status', and re-add status as UiStatus.
type UpdateBody = Omit<DbUpdate, "status"> & { id: string; status?: UiStatus | null };

const FormSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  status: z.enum(StatusValues).optional().nullable(), // UI-level status
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),

  // Keep numeric inputs as strings in the UI to avoid string↔number comparison warnings
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  car_spaces: z.string().optional(),
  land_area_m2: z.string().optional(),
  floor_area_m2: z.string().optional(),
});

type Props = { initial: Listing };

export default function EditListingForm({ initial }: Props) {
  const [form, setForm] = useState(() => ({
    id: initial.id,
    title: initial.title ?? "",
    description: initial.description ?? "",
    // initial.status is the DB enum; it's a subset of UiStatus
    status: ((initial as any).status ?? "draft") as UiStatus,
    address_line1: (initial as any).address_line1 ?? "",
    address_line2: (initial as any).address_line2 ?? "",
    city: (initial as any).city ?? "",
    bedrooms: valueToStr((initial as any).bedrooms),
    bathrooms: valueToStr((initial as any).bathrooms),
    car_spaces: valueToStr((initial as any).car_spaces),
    land_area_m2: valueToStr((initial as any).land_area_m2),
    floor_area_m2: valueToStr((initial as any).floor_area_m2),
  }));

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    setServerError(null);
    setErrors({});

    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = (issue.path?.[0] ?? "form").toString();
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setSubmitting(false);
      return;
    }

    // Build client payload; convert numeric strings to numbers/null/undefined
    const payload: UpdateBody = {
      id: parsed.data.id,
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      status: (parsed.data.status as UiStatus) ?? "draft", // server will map to DB enum
      address_line1: emptyToNull(parsed.data.address_line1),
      address_line2: emptyToNull(parsed.data.address_line2),
      city: emptyToNull(parsed.data.city),
      bedrooms: strToNum(parsed.data.bedrooms),
      bathrooms: strToNum(parsed.data.bathrooms),
      car_spaces: strToNum(parsed.data.car_spaces),
      land_area_m2: strToNum(parsed.data.land_area_m2),
      floor_area_m2: strToNum(parsed.data.floor_area_m2),
    };

    const res = await fetch("/api/listings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(json?.error ?? "Failed to save");
      setSubmitting(false);
      return;
    }

    setSaved(true);
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {serverError}
        </div>
      )}
      {saved && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-800">
          Saved
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2"
          rows={4}
          value={form.description ?? ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Address line 1</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.address_line1 ?? ""}
            onChange={(e) => update("address_line1", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Address line 2</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.address_line2 ?? ""}
            onChange={(e) => update("address_line2", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">City</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.city ?? ""}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Bedrooms</label>
          <input
            inputMode="numeric"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.bedrooms ?? ""}
            onChange={(e) => update("bedrooms", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Bathrooms</label>
          <input
            inputMode="numeric"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.bathrooms ?? ""}
            onChange={(e) => update("bathrooms", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Car spaces</label>
          <input
            inputMode="numeric"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.car_spaces ?? ""}
            onChange={(e) => update("car_spaces", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Land area (m²)</label>
          <input
            inputMode="numeric"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.land_area_m2 ?? ""}
            onChange={(e) => update("land_area_m2", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Floor area (m²)</label>
          <input
            inputMode="numeric"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.floor_area_m2 ?? ""}
            onChange={(e) => update("floor_area_m2", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Status</label>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={form.status ?? "draft"}
          onChange={(e) => update("status", e.target.value as UiStatus)}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="under_offer">Under offer</option>
          <option value="sold">Sold</option>
          <option value="withdrawn">Withdrawn</option>
         
          
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function valueToStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "string") return v;
  return "";
}

function emptyToNull<T extends string | undefined | null>(v: T): string | null | undefined {
  return v === "" ? null : v;
}

function strToNum(s?: string): number | null | undefined {
  if (s === undefined) return undefined;
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}