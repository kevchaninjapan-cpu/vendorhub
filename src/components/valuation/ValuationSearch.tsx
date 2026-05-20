"use client";

import React, { useState, useEffect, useRef } from "react";
import ValuationResultCard from "./ValuationResultCard";

// ── Types ─────────────────────────────────────────────────────

type Suggestion = {
  unit_of_property_id: string | null;
  akl_key: string | null;
  situation_name: string;
  capital_value: number | null;
  source: string;
};

type ValuationApiResponse = {
  subject?: {
    unit_of_property_id: string;
    address?: string;
  };
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
  comparables?: {
    count: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
  };
  confidence: {
    level: string;
    score: number;
    reasons: string[];
  };
};

type ResultShape = {
  matchedAddress: string;
  dvrRecordId: string;
  valuation: ValuationApiResponse;
};

// ── Helpers ───────────────────────────────────────────────────

function cleanAddress(addr: string | null | undefined): string {
  if (!addr) return "";
  return addr.replace(/\r|\n/g, ", ").replace(/,\s*,/g, ",").trim();
}

// ── Component ─────────────────────────────────────────────────

export default function ValuationSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultShape | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Debounced address search ────────────────────────────────
  useEffect(() => {
    if (result && cleanAddress(result.matchedAddress) === query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const res = await fetch(
          `/api/valuation/search?q=${encodeURIComponent(query)}&limit=8`,
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, result]);

  // ── Close suggestions on outside click ─────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Keyboard navigation ────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (query.length >= 3) {
        runValuationByAddress(query);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // ── Run valuation from selected suggestion ─────────────────
  const handleSelect = async (item: Suggestion) => {
    setQuery(cleanAddress(item.situation_name));
    setSuggestions([]);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        options: { include_comps: true },
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

      if (!res.ok) throw new Error("Valuation failed");
      const data: ValuationApiResponse = await res.json();

      setResult({
        matchedAddress: cleanAddress(data.subject?.address ?? item.situation_name),
        dvrRecordId: data.subject?.unit_of_property_id ?? "",
        valuation: data,
      });
    } catch {
      setError("Valuation failed. Please try again.");
    } finally {
      setLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // ── Run valuation by free-text address ─────────────────────
  const runValuationByAddress = async (addr: string) => {
    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/valuation/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: addr,
          options: { include_comps: true },
        }),
      });

      if (!res.ok) throw new Error("Valuation failed");
      const data: ValuationApiResponse = await res.json();

      setResult({
        matchedAddress: cleanAddress(data.subject?.address ?? addr),
        dvrRecordId: data.subject?.unit_of_property_id ?? "",
        valuation: data,
      });
    } catch {
      setError("Valuation failed. Please try again.");
    } finally {
      setLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 3) return;
    runValuationByAddress(query);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="w-full max-w-lg space-y-6">
      {/* ── Search input ────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // Hide old valuation card when typing a new address
                if (result && e.target.value !== result.matchedAddress) {
                  setResult(null);
                }
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a property address, e.g. 12 Queen Street Auckland"
              autoComplete="off"
              className="w-full rounded-lg border border-border/60 bg-surface-1 px-4 py-3 pr-10
                         text-sm text-foreground shadow-sm transition placeholder:text-muted
                         focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted
                           hover:text-foreground transition text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || query.length < 3}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground
                       shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "Value"}
          </button>
        </div>

        {/* ── Autocomplete dropdown ──────────────────────────── */}
        {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
          <div
            className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-80 overflow-y-auto
                       rounded-lg border border-border/60 bg-white shadow-2xl ring-1 ring-black/5"
          >
            {loadingSuggestions && (
              <div className="p-3 text-xs text-muted">Searching...</div>
            )}

            {!loadingSuggestions &&
              suggestions.map((s, i) => {
                const isHighlighted = i === highlightedIndex;
                return (
                  <div
                    key={`${s.unit_of_property_id ?? s.akl_key ?? i}`}
                    onMouseDown={() => handleSelect(s)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={`cursor-pointer border-b border-border/30 px-4 py-3
                              text-xs last:border-0 ${
                                isHighlighted
                                  ? "bg-slate-100"
                                  : "hover:bg-slate-50"
                              }`}
                  >
                    <div className="font-medium text-slate-800">
                      {cleanAddress(s.situation_name)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {s.capital_value != null && (
                        <span className="text-[10px] text-slate-500">
                          CV ${s.capital_value.toLocaleString("en-NZ")}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          s.source === "AUCKLAND_COUNCIL"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {s.source === "AUCKLAND_COUNCIL"
                          ? "Auckland Council"
                          : "LINZ DVR"}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </form>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────── */}
      {loading && (
        <div className="text-center text-xs text-muted">
          Calculating valuation...
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────── */}
      {result && !loading && (
        <div className="border-t border-border/30 pt-6">
          <ValuationResultCard
            matchedAddress={result.matchedAddress}
            dvrRecordId={result.dvrRecordId}
            valuation={result.valuation}
          />
        </div>
      )}
    </div>
  );
}