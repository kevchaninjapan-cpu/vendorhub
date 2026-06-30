"use client";

import { useState } from "react";
import type { ListingDraft } from "@/types/marketplace";

type Props = {
  draft: ListingDraft;
  busy: boolean;
  onNext: (v: Partial<ListingDraft>) => void;
};

type Suggestion = {
  formatted_address: string;
  address_norm: string;
  street_address?: string;
  suburb?: string;
  region?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  dvr_record_id?: string;
  auckland_rate_assessment_id?: string;
};

export function Step1Address({ draft, busy, onNext }: Props) {
  const [q, setQ] = useState(draft.formatted_address ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(value: string) {
    setQ(value);
    setSelected(null);
    if (value.length < 4) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const r = await fetch(
        `/api/valuation/resolve-address?q=${encodeURIComponent(value)}`,
        { cache: "no-store" });
      const json = await r.json();
      setSuggestions(json.results ?? []);
    } finally { setLoading(false); }
  }

  function proceed() {
    if (!selected) return;
    onNext({
      formatted_address: selected.formatted_address,
      address_norm: selected.address_norm,
      street_address: selected.street_address,
      suburb: selected.suburb,
      region: selected.region ?? "Auckland",
      postcode: selected.postcode,
      lat: selected.lat,
      lng: selected.lng,
      dvr_record_id: selected.dvr_record_id ?? null,
      auckland_rate_assessment_id: selected.auckland_rate_assessment_id ?? null,
    });
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Step 1 — Address</h2>
        <p className="text-sm text-muted-foreground">
          Search the property address. We&apos;ll match it to council records to
          pre-fill details and your independent VendorHub estimate.
        </p>
      </header>

      <div className="relative">
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Start typing the street address…"
          value={q}
          onChange={(e) => search(e.target.value)}
        />
        {loading && (
          <p className="absolute right-3 top-2.5 text-xs text-muted-foreground">…</p>
        )}
        {suggestions.length > 0 && !selected && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow">
            {suggestions.slice(0, 8).map((s) => (
              <li key={s.address_norm}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => { setSelected(s); setQ(s.formatted_address); setSuggestions([]); }}
                >
                  {s.formatted_address}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{selected.formatted_address}</p>
          <p className="text-muted-foreground">
            {selected.suburb} · {selected.region} {selected.postcode}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selected || busy}
          onClick={proceed}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </section>
  );
}