"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ✅ Keep these relative imports INSIDE src/
// Current file: src/app/admin/listings/[id]/EditListingForm.tsx
// Target:       src/components/ui/*
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";

type Listing = {
  id: string;
  title?: string | null;
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
  postcode?: string | null;
  price?: number | string | null;
  status?: "draft" | "published" | "archived" | string | null;
  description?: string | null;
  [key: string]: any;
};

type Props = {
  listingId: string;
  returnTo?: string;
};

export default function EditListingForm({ listingId, returnTo = "/admin/listings" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("draft");
  const [description, setDescription] = useState("");

  // Load listing on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSaved(null);

      try {
        const res = await fetch(`/api/admin/listings/${listingId}`, {
          method: "GET",
          headers: { "Accept": "application/json" },
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to load listing.");
        }

        // Support either:
        // 1) API returns the listing directly
        // 2) API returns { listing: {...} }
        const l: Listing | null = (data?.listing ?? data) ?? null;
        if (!l?.id) throw new Error("Listing not found.");

        if (cancelled) return;

        setListing(l);

        // hydrate fields
        setTitle(l.title ?? "");
        setAddress(l.address ?? "");
        setSuburb(l.suburb ?? "");
        setCity(l.city ?? "");
        setPostcode(l.postcode ?? "");
        setPrice(l.price === null || l.price === undefined ? "" : String(l.price));
        setStatus((l.status ?? "draft") as string);
        setDescription(l.description ?? "");
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unexpected error while loading.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const disabled = isPending || loading;

  function onCancel() {
    router.push(returnTo);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);

    if (!listingId) {
      setError("Missing listing id.");
      return;
    }

    const payload = {
      title: title.trim(),
      address: address.trim(),
      suburb: suburb.trim(),
      city: city.trim(),
      postcode: postcode.trim(),
      price: price === "" ? null : Number(price),
      status,
      description: description.trim(),
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/listings/${listingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Failed to save listing.");
          return;
        }

        setSaved("Saved.");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error while saving.");
      }
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm text-slate-900">Loading listing…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Edit listing</div>
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // listing should be present here, but keep safe fallback
  const heading = useMemo(() => listing?.title || "Edit listing", [listing?.title]);

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
            <p className="text-sm text-slate-900">
              Update details for this listing and save changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={disabled}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        {saved && !error && (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-100">
            {saved}
          </div>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunny 3-bed in Grey Lynn"
              disabled={disabled}
            />
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={disabled}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>

          <Field label="Address" className="md:col-span-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              disabled={disabled}
            />
          </Field>

          <Field label="Suburb">
            <Input
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="Suburb"
              disabled={disabled}
            />
          </Field>

          <Field label="City">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              disabled={disabled}
            />
          </Field>

          <Field label="Postcode">
            <Input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Postcode"
              disabled={disabled}
            />
          </Field>

          <Field label="Price (NZD)">
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 950000"
              inputMode="numeric"
              disabled={disabled}
            />
          </Field>

          <Field label="Description" className="md:col-span-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the property…"
              disabled={disabled}
              rows={6}
            />
          </Field>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-900">
        {label}
      </span>
      {children}
    </label>
  );
}