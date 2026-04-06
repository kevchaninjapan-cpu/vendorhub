// app/admin/listings/[id]/EditListingForm.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

export default function EditListingForm({ listingId }: { listingId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    price_display: "",
    suburb: "",
    city: "",
    region: "",
    postcode: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json();

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

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    // ✅ This compiles + gives you a clean UI now.
    // Wire the update endpoint later (PATCH route).
    setSaving(true);
    setError(null);

    try {
      // Placeholder: implement PATCH /api/admin/listings/[id] when ready
      // await fetch(`/api/admin/listings/${listingId}`, { method: "PATCH", ... })
      console.log("Save (mock):", listingId, form);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted">Loading details…</div>;

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600">{error}</div>
        <Button variant="outline" size="sm" onClick={load}>
          Retry
        </Button>
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
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Price (display)</label>
          <Input
            value={form.price_display}
            onChange={(e) => update("price_display", e.target.value)}
            placeholder="e.g. $1,250,000"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Postcode</label>
          <Input
            value={form.postcode}
            onChange={(e) => update("postcode", e.target.value)}
            placeholder="e.g. 1023"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Suburb</label>
          <Input value={form.suburb} onChange={(e) => update("suburb", e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Region</label>
          <Input value={form.region} onChange={(e) => update("region", e.target.value)} />
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={load}>
          Reload
        </Button>
      </div>
    </form>
  );
}