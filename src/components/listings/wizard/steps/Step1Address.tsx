"use client";

import { useEffect, useState } from "react";
import type { ListingDraft } from "@/types/marketplace";

type Props = {
  draft: ListingDraft;
  busy: boolean;
  onNext: (v: Partial<ListingDraft>) => void;
};

type ResolveResponse = {
  address: string;
  unit_of_property_id?: string | null;
  akl_key?: string | null;
  match_type?: string | null;
  lat?: number | null;
  lng?: number | null;
  suburb?: string | null;
  region?: string | null;
  postcode?: string | null;
  street_address?: string | null;
};

type ResolvedAddress = {
  formatted_address: string;
  street_address?: string;
  suburb?: string;
  region?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  dvr_record_id?: string;
  auckland_rate_assessment_id?: string;
};

function parseAddress(input: string) {
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    street: parts[0] ?? input.trim(),
    suburb: parts[1],
    region: parts[2] ?? "Auckland",
  };
}

export function Step1Address({ draft, busy, onNext }: Props) {
  const [q, setQ] = useState(draft.formatted_address ?? "");
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable overrides so users can fill in what the resolver missed
  const [suburbOverride, setSuburbOverride] = useState("");
  const [regionOverride, setRegionOverride] = useState("Auckland");

  useEffect(() => {
    if (draft.formatted_address) {
      setResolved({
        formatted_address: draft.formatted_address,
        street_address: draft.street_address ?? undefined,
        suburb: draft.suburb ?? undefined,
        region: draft.region ?? "Auckland",
        postcode: draft.postcode ?? undefined,
        lat: draft.lat ?? undefined,
        lng: draft.lng ?? undefined,
        dvr_record_id: draft.dvr_record_id ?? undefined,
        auckland_rate_assessment_id: draft.auckland_rate_assessment_id ?? undefined,
      });
      setSuburbOverride(draft.suburb ?? "");
      setRegionOverride(draft.region ?? "Auckland");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function lookup() {
    setError(null);
    setResolved(null);
    const value = q.trim();
    if (value.length < 4) {
      setError("Please enter a full street address.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(
        `/api/valuation/resolve-address?address=${encodeURIComponent(value)}`,
        { cache: "no-store" }
      );
      const json = (await r.json()) as ResolveResponse | { error?: string };
      if (!r.ok) {
        setError(
          (json as { error?: string }).error ??
            `Lookup failed (${r.status}). Try a different format.`
        );
        return;
      }
      const data = json as ResolveResponse;
      const parsed = parseAddress(data.address ?? value);

      const next: ResolvedAddress = {
        formatted_address: data.address ?? value,
        street_address: data.street_address ?? parsed.street,
        suburb: data.suburb ?? parsed.suburb,
        region: data.region ?? parsed.region ?? "Auckland",
        postcode: data.postcode ?? undefined,
        lat: typeof data.lat === "number" ? data.lat : undefined,
        lng: typeof data.lng === "number" ? data.lng : undefined,
        dvr_record_id: data.unit_of_property_id ?? undefined,
        auckland_rate_assessment_id: data.akl_key ?? undefined,
      };

      setResolved(next);
      setSuburbOverride(next.suburb ?? "");
      setRegionOverride(next.region ?? "Auckland");
    } catch (e: any) {
      setError(e?.message ?? "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  function proceed() {
    if (!resolved) return;
    const finalSuburb = suburbOverride.trim() || resolved.suburb;
    const finalRegion = regionOverride.trim() || resolved.region || "Auckland";

    if (!finalSuburb) {
      setError("Please enter the suburb before continuing.");
      return;
    }

    onNext({
      formatted_address: resolved.formatted_address,
      street_address: resolved.street_address,
      suburb: finalSuburb,
      region: finalRegion,
      postcode: resolved.postcode,
      lat: resolved.lat,
      lng: resolved.lng,
      dvr_record_id: resolved.dvr_record_id ?? null,
      auckland_rate_assessment_id: resolved.auckland_rate_assessment_id ?? null,
    });
  }

  const hasCoords = resolved?.lat != null && resolved?.lng != null;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Step 1 — Address</h2>
        <p className="text-sm text-muted-foreground">
          Enter the full property address (e.g. <em>1 Jopard Place, Ellerslie, Auckland</em>).
          We&apos;ll match it to council records to pre-fill details and your
          independent VendorHub estimate.
        </p>
      </header>

      <div className="flex gap-2">
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="1 Jopard Place, Ellerslie, Auckland"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lookup();
            }
          }}
          autoFocus
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading || q.trim().length < 4}
          className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <p className="text-xs text-amber-700">{error}</p>}

      {resolved && (
        <div className="space-y-3 rounded-md border bg-muted/40 p-3">
          <div className="text-sm">
            <p className="font-medium">{resolved.formatted_address}</p>
            {resolved.dvr_record_id && (
              <p className="text-[10px] text-muted-foreground">
                DVR ref {resolved.dvr_record_id}
              </p>
            )}
            {resolved.auckland_rate_assessment_id && (
              <p className="text-[10px] text-muted-foreground">
                AKL ref {resolved.auckland_rate_assessment_id}
              </p>
            )}
          </div>

          {/* Editable suburb + region — required for submission */}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block font-medium">Suburb *</span>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm"
                placeholder="e.g. Ellerslie"
                value={suburbOverride}
                onChange={(e) => setSuburbOverride(e.target.value)}
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium">Region</span>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Auckland"
                value={regionOverride}
                onChange={(e) => setRegionOverride(e.target.value)}
              />
            </label>
          </div>

          {!hasCoords && (
            <p className="text-xs text-amber-700">
              ⚠ Council match found but coordinates aren&apos;t available. You can
              still continue — the listing won&apos;t appear on the map until we
              add lat/lng.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!resolved || busy || !suburbOverride.trim()}
          onClick={proceed}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </section>
  );
}