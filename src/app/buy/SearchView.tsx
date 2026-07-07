"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import ListingCard from "./ListingCard";
import MapCanvas from "./MapCanvas";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import { ListingCardSkeleton } from "@/components/ui/Skeleton";
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
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const isFirst = useRef(true);

  const queryString = useMemo(
    () => filtersToSearchParams(filters).toString(),
    [filters]
  );

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    startTransition(() => {
      router.replace(`${pathname}?${queryString}`, { scroll: false });
    });
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function refetch() {
    setLoading(true);
    try {
      const r = await fetch(`/api/marketplace/search?${queryString}`);
      if (!r.ok) throw new Error("Search failed");
      const j = await r.json();
      setData(j);
    } catch (e: any) {
      toast.error(e.message ?? "Could not update results");
    } finally {
      setLoading(false);
    }
  }

  function patch(p: Partial<SearchFilters>) {
    setFilters((f) => ({ ...f, ...p, page: 1 }));
  }

  function clearFilters() {
    setFilters({ sort: "best", page: 1 });
    toast.success("Filters cleared");
  }

  const activeFilterCount = [
    filters.q,
    filters.suburb,
    filters.beds,
    filters.baths,
    filters.minPrice,
    filters.maxPrice,
    filters.propertyType,
    filters.readyToBuy,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Searchingâ€¦
              </span>
            ) : (
              <>
                {data.total.toLocaleString()}{" "}
                {data.total === 1 ? "property" : "properties"}
              </>
            )}
          </h1>
          <p className="text-xs text-slate-600">
            Independent listings across New Zealand
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      <Filters
        filters={filters}
        onChange={patch}
        activeCount={activeFilterCount}
        onClear={clearFilters}
      />

      <div
        className={
          view === "split"
            ? "mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]"
            : "mt-3"
        }
      >
        {(view === "list" || view === "split") && (
          <div className="space-y-3">
            {loading && data.results.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : data.results.length === 0 ? (
              <EmptyState onClear={clearFilters} hasFilters={activeFilterCount > 0} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.results.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
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
    <div className="inline-flex overflow-hidden rounded-md border bg-white text-xs shadow-sm">
      {(["list", "split", "map"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 font-semibold capitalize transition ${
            view === v
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
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
  activeCount,
  onClear,
}: {
  filters: SearchFilters;
  onChange: (p: Partial<SearchFilters>) => void;
  activeCount: number;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-2 text-xs shadow-sm">
      <input
        defaultValue={filters.q ?? ""}
        placeholder="ðŸ” Search address, suburb, keywordâ€¦"
        onChange={(e) => onChange({ q: e.target.value || undefined })}
        className="min-w-[220px] flex-1 rounded border border-slate-300 px-2 py-1.5 focus:border-emerald-500 focus:outline-none"
      />
      <select
        value={filters.beds ?? ""}
        onChange={(e) =>
          onChange({ beds: e.target.value ? Number(e.target.value) : undefined })
        }
        className="rounded border border-slate-300 px-2 py-1.5"
      >
        <option value="">Any beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}+ beds
          </option>
        ))}
      </select>
      <select
        value={filters.baths ?? ""}
        onChange={(e) =>
          onChange({
            baths: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="rounded border border-slate-300 px-2 py-1.5"
      >
        <option value="">Any baths</option>
        {[1, 2, 3].map((n) => (
          <option key={n} value={n}>
            {n}+ baths
          </option>
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
        className="w-24 rounded border border-slate-300 px-2 py-1.5"
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
        className="w-24 rounded border border-slate-300 px-2 py-1.5"
      />
      <select
        value={filters.propertyType ?? ""}
        onChange={(e) =>
          onChange({ propertyType: e.target.value || undefined })
        }
        className="rounded border border-slate-300 px-2 py-1.5"
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
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-50">
        <input
          type="checkbox"
          checked={!!filters.readyToBuy}
          onChange={(e) =>
            onChange({ readyToBuy: e.target.checked || undefined })
          }
          className="accent-emerald-600"
        />
        Ready to Buy
      </label>
      <select
        value={filters.sort ?? "best"}
        onChange={(e) =>
          onChange({ sort: e.target.value as SearchFilters["sort"] })
        }
        className="ml-auto rounded border border-slate-300 px-2 py-1.5"
      >
        <option value="best">Best match</option>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>
      {activeCount > 0 && (
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}

function EmptyState({
  onClear,
  hasFilters,
}: {
  onClear: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
        ðŸ¡
      </div>
      <h3 className="text-base font-semibold text-slate-900">
        No properties found
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        {hasFilters
          ? "Try widening your filters or clearing them."
          : "Check back soon â€” new listings arrive daily."}
      </p>
      {hasFilters && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onClear}>
            Clear all filters
          </Button>
        </div>
      )}
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
    <div className="flex items-center justify-center gap-3 pt-3">
      <Button
        size="sm"
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        â† Prev
      </Button>
      <span className="text-sm text-slate-600">
        Page <strong>{page}</strong> of <strong>{pageCount}</strong>
      </span>
      <Button
        size="sm"
        variant="secondary"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next â†’
      </Button>
    </div>
  );
}

