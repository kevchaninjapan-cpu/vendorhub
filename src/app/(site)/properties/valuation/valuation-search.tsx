

"use client";

import { useState, useCallback } from "react";

type SearchResult = {
  unit_of_property_id: string;
  situation_name: string;
  capital_value: number | null;
};

type ValuationData = {
  subject: { unit_of_property_id: string; address?: string };
  baseline: {
    capital_value: number | null;
    land_value: number | null;
    improvements_value: number | null;
  };
  estimate: {
    point: number | null;
    low: number | null;
    high: number | null;
    method: string;
  };
  comparables: { count: number; p25: number | null; p50: number | null; p75: number | null };
  confidence: { level: string; score: number; reasons: string[] };
};

function formatNZD(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
}

function confidenceColor(level: string): string {
  if (level === "High") return "bg-green-100 text-green-800";
  if (level === "Medium") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function ValuationSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMethod, setShowMethod] = useState(false);

  // ── Address autocomplete ─────────────────────────────────
  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    setError(null);

    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/valuation/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setSuggestions(data.results ?? []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  // ── Get valuation for selected property ──────────────────
  const handleSelect = async (item: any) => {
    setSuggestions([]);
    setQuery(item.situation_name);
    setLoading(true);
    setError(null);
    setValuation(null);

    try {
      const body: Record<string, unknown> = {
        options: { include_comps: true, include_debug: false },
      };

      if (item.unit_of_property_id) {
        body.unit_of_property_id = item.unit_of_property_id;
      } else if (item.akl_key) {
        body.akl_key = item.akl_key;
      } else {
        body.address = item.situation_name;
      }

      const res = await fetch("/api/valuation/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Valuation request failed");
      const data = await res.json();
      setValuation(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  // ── Direct address submit ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 3) return;

    setSuggestions([]);
    setLoading(true);
    setError(null);
    setValuation(null);

    try {
      const res = await fetch("/api/valuation/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: query,
          options: { include_comps: true, include_debug: false },
        }),
      });

      const data = await res.json();
      setValuation(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ── Search Box ─────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Enter a property address, e.g. 12 Queen Street Auckland"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm
                       shadow-sm transition focus:border-blue-500 focus:outline-none
                       focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={loading || query.length < 3}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white
                       shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Value"}
          </button>
        </div>

        {/* ── Autocomplete Dropdown ────────────────────────── */}
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200
                         bg-white shadow-lg">
            {suggestions.map((s) => (
              <li
                key={s.unit_of_property_id}
                onClick={() => handleSelect(s)}
                className="cursor-pointer border-b border-slate-100 px-4 py-3
                           text-sm hover:bg-blue-50 last:border-0"
              >
                <span className="font-medium text-slate-800">
                  {s.situation_name}
                </span>
                {s.capital_value && (
                  <span className="ml-2 text-slate-400">
                    CV {formatNZD(s.capital_value)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────── */}
      {loading && (
        <div className="mt-8 text-center text-sm text-slate-400">
          Calculating valuation...
        </div>
      )}

      {/* ── Results ────────────────────────────────────────── */}
      {valuation && !loading && (
        <div className="mt-8 space-y-6">
          {/* Estimate Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Estimated Value
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${confidenceColor(valuation.confidence.level)}`}
              >
                {valuation.confidence.level} Confidence
              </span>
            </div>

            {valuation.estimate.point ? (
              <>
                <p className="mt-4 text-4xl font-bold text-blue-600">
                  {formatNZD(valuation.estimate.point)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Range: {formatNZD(valuation.estimate.low)} –{" "}
                  {formatNZD(valuation.estimate.high)}
                </p>

                {/* Visual range bar */}
                <div className="mt-4">
                  <div className="h-3 w-full rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                      style={{
                        marginLeft: "25%",
                        width: "50%",
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>{formatNZD(valuation.estimate.low)}</span>
                    <span>{formatNZD(valuation.estimate.point)}</span>
                    <span>{formatNZD(valuation.estimate.high)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Unable to generate an estimate for this property.
              </p>
            )}
          </div>

          {/* Baseline Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Rating Valuation (DVR Baseline)
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400">Capital Value</p>
                <p className="text-lg font-semibold text-slate-800">
                  {formatNZD(valuation.baseline.capital_value)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Land Value</p>
                <p className="text-lg font-semibold text-slate-800">
                  {formatNZD(valuation.baseline.land_value)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Improvements</p>
                <p className="text-lg font-semibold text-slate-800">
                  {formatNZD(valuation.baseline.improvements_value)}
                </p>
              </div>
            </div>
          </div>

          {/* Comparables Card */}
          {valuation.comparables.count > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Comparable Properties
              </h3>
              <div className="mt-3 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Count</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {valuation.comparables.count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">25th %ile</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {formatNZD(valuation.comparables.p25)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Median</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {formatNZD(valuation.comparables.p50)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">75th %ile</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {formatNZD(valuation.comparables.p75)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confidence Reasons */}
          {valuation.confidence.reasons.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Confidence Assessment
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${valuation.confidence.score * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {Math.round(valuation.confidence.score * 100)}%
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {valuation.confidence.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-slate-600">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How we estimated this */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => setShowMethod(!showMethod)}
              className="flex w-full items-center justify-between p-6 text-left"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                How We Estimated This
              </h3>
              <span className="text-slate-400">{showMethod ? "▲" : "▼"}</span>
            </button>
            {showMethod && (
              <div className="border-t border-slate-100 px-6 pb-6 pt-4 text-sm text-slate-600 space-y-2">
                <p>
                  <strong>Method:</strong>{" "}
                  {valuation.estimate.method.replace(/_/g, " ")}
                </p>
                <p>
                  <strong>Baseline:</strong> The capital value from the LINZ
                  District Valuation Roll (DVR) — a public dataset of
                  council rating valuations.
                </p>
                <p>
                  <strong>Comparables:</strong> We found{" "}
                  {valuation.comparables.count} similar properties in the same
                  territorial authority and property category. The estimate
                  range is the interquartile range (25th–75th percentile) of
                  those comparables.
                </p>
                <p>
                  <strong>Confidence:</strong> Scored based on data recency,
                  property attribute completeness, and comparable density.
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Data sourced from Land Information New Zealand (LINZ) under
                  Creative Commons Attribution 4.0. Rating valuations are not
                  market valuations — they are conducted by councils for rating
                  purposes and may differ from sale prices.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}