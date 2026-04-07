// app/admin/listings/[id]/EditListingForm.tsx
"use client";

import * as React from "react";

// IMPORTANT: this file is at app/admin/listings/[id]/EditListingForm.tsx
// To reach root-level components/: go up 4 levels -> ../../../../components/...
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  price_display: string | null;
  price_numeric: number | null;
  suburb: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
};

type FormState = {
  title: string;
  description: string;
  price_display: string;
  suburb: string;
  city: string;
  region: string;
  postcode: string;
};

type Props = { listingId: string };

export default function EditListingForm({ listingId }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const [form, setForm] = React.useState<FormState>({
    title: "",
    description: "",
    price_display: "",
    suburb: "",
    city: "",
    region: "",
    postcode: "",
  });

  const update = (key: keyof FormState, value: string) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load listing");

      const listing = (json?.listing ?? null) as Listing | null;
      if (!listing) throw new Error("Listing not found");

      setForm({
        title: listing.title ?? "",
        description: listing.description ?? "",
        price_display: listing.price_display ?? "",
        suburb: listing.suburb ?? "",
        city: listing.city ?? "",
        region: listing.region ?? "",
        postcode: listing.postcode ?? "",
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load listing");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    // Basic validation (minimal, keeps UX clean)
    const titleTrimmed = form.title.trim();
    if (!titleTrimmed) {
      setSaving(false);
      setError("Title is required.");
      return;
    }

    try {
      // Send only fields you actually edit
      const payload = {
        title: titleTrimmed,
        description: form.description?.trim() || null,
        price_display: form.price_display?.trim() || null,
        suburb: form.suburb?.trim() || null,
        city: form.city?.trim() || null,
        region: form.region?.trim() || null,
        postcode: form.postcode?.trim() || null,
      };

      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error ?? "Save failed");

      setSaved(true);

      // Optional: refresh form with latest from server response if provided
      const updated = (json?.listing ?? null) as Listing | null;
      if (updated) {
        setForm({
          title: updated.title ?? "",
          description: updated.description ?? "",
          price_display: updated.price_display ?? "",
          suburb: updated.suburb ?? "",
          city: updated.city ?? "",
          region: updated.region ?? "",
          postcode: updated.postcode ?? "",
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-600">Loading details…</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600">{error}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
    >
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Changes saved.
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          value={form.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            update("title", e.target.value)
          }
          placeholder="e.g. Modern Villa in Herne Bay"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={form.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            update("description", e.target.value)
          }
          rows={6}
          placeholder="Add key features, upgrades, school zones, etc."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Price (display)</label>
          <Input
            value={form.price_display}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update("price_display", e.target.value)
            }
            placeholder="e.g. $1,250,000"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Postcode</label>
          <Input
            value={form.postcode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update("postcode", e.target.value)
            }
            placeholder="e.g. 1023"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Suburb</label>
          <Input
            value={form.suburb}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update("suburb", e.target.value)
            }
            placeholder="e.g. Herne Bay"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Input
            value={form.city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update("city", e.target.value)
            }
            placeholder="e.g. Auckland"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Region</label>
          <Input
            value={form.region}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update("region", e.target.value)
            }
            placeholder="e.g. Auckland Region"
          />
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Reload
        </Button>
      </div>
    </form>
  );
}