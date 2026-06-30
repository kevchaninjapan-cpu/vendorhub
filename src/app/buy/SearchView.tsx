"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import ListingCard from "./ListingCard";
import MapCanvas from "./MapCanvas";
import type { SearchListing } from "@/types/marketplace-public";
import {
  filtersToSearchParams,
  type SearchFilters,
} from "@/lib/marketplace/url";

type Initial = {
  results: SearchListing[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

type View = "list" | "map" | "split";

export default function SearchView({
  initialFilters,
  initialResults,
}: {
  initialFilters: SearchFilters;
  initialResults: Initial;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [view, setView] = useState<View>("split");
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [data, setData] = useState<Initial>(initialResults);
  const [pending, startTransition] = useTransition();

  const queryString = useMemo(
    () => filtersToSearchParams(filters).toString(),
    [filters]
  );

  // Sync URL when filters change (shareable links)
  useEffect(() => {
    startTransition(() => {
      router.replace(`${pathname}?${queryString}`, { scroll: false });
    });
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function refetch() {
    const r = await fetch(`/api/marketplace/search?${queryString}`);
    const j = await r.json();
    setData(j);
  }

  function patch(p: Partial<SearchFilters>) {
    setFilters((f) => ({ ...f, ...p, page: 1 }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {data.total.toLocaleString()} property
            {data.total === 1 ? "" : "ies"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Independent listings across New Zealand
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </header>

      <Filters filters={filters} onChange={patch} />

      <div
        className={
          view === "split"
            ? "mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]"
            : "mt-3"
        }
      >
        {(view === "list" || view === "split") && (
          <div className="space-y-3">
            {data.results.length === 0 && (
              <div className="rounded border bg-muted/30 p-6 text-center text-sm">
                No properties match these filters. Try widening your search.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {data.results.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              onChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            />
          </div>
        )}

        {(view === "map" || view === "split") && (
          <div className="sticky top-2 h-[70vh] overflow-hidden rounded-md border">
            <MapCanvas
              listings={data.results}
              onBboxChange={(bbox) =>
                setFilters((f) => ({ ...f, bbox, page: 1 }))
              }
            />
          </div>
        )}
      </div>

      {pending && (
        <div className="fixed bottom-3 right-3 rounded bg-black/80 px-3 py-1 text-xs text-white">
          Updating…
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border text-xs">
      {(["list", "split", "map"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 ${
            view === v ? "bg-primary text-primary-foreground" : "bg-background"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function Filters({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (p: Partial<SearchFilters>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2 text-xs">
      <input
        defaultValue={filters.q ?? ""}
        placeholder="Search address, suburb, keyword…"
        onChange={(e) => onChange({ q: e.target.value || undefined })}
        className="min-w-[200px] flex-1 rounded border px-2 py-1"
      />
      <select
        value={filters.beds ?? ""}
        onChange={(e) =>
          onChange({ beds: e.target.value ? Number(e.target.value) : undefined })
        }
        className="rounded border px-2 py-1"
      >
        <option value="">Any beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}+ beds</option>
        ))}
      </select>
      <select
        value={filters.baths ?? ""}
        onChange={(e) =>
          onChange({
            baths: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="rounded border px-2 py-1"
      >
        <option value="">Any baths</option>
        {[1, 2, 3].map((n) => (
          <option key={n} value={n}>{n}+ baths</option>
        ))}
      </select>
      <input
        type="number"
        defaultValue={filters.minPrice ?? ""}
        placeholder="Min $"
        onChange={(e) =>
          onChange({
            minPrice: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="w-24 rounded border px-2 py-1"
      />
      <input
        type="number"
        defaultValue={filters.maxPrice ?? ""}
        placeholder="Max $"
        onChange={(e) =>
          onChange({
            maxPrice: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="w-24 rounded border px-2 py-1"
      />
      <select
        value={filters.propertyType ?? ""}
        onChange={(e) =>
          onChange({ propertyType: e.target.value || undefined })
        }
        className="rounded border px-2 py-1"
      >
        <option value="">Any type</option>
        {[
          "house",
          "apartment",
          "townhouse",
          "unit",
          "section",
          "lifestyle",
        ].map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={!!filters.readyToBuy}
          onChange={(e) =>
            onChange({ readyToBuy: e.target.checked || undefined })
          }
        />
        Ready to Buy
      </label>
      <select
        value={filters.sort ?? "best"}
        onChange={(e) =>
          onChange({ sort: e.target.value as SearchFilters["sort"] })
        }
        className="ml-auto rounded border px-2 py-1"
      >
        <option value="best">Best match</option>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-3 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded border px-2 py-1 disabled:opacity-40"
      >
        Prev
      </button>
      <span>
        Page {page} of {pageCount}
      </span>
      <button
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="rounded border px-2 py-1 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}