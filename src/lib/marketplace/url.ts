export interface SearchFilters {
  q?: string;
  suburb?: string;
  beds?: number;
  baths?: number;
  minPrice?: number;
  maxPrice?: number;
  minFloor?: number;
  minLand?: number;
  propertyType?: string;
  readyToBuy?: boolean;
  sort?: "best" | "newest" | "price_asc" | "price_desc";
  bbox?: [number, number, number, number] | null;
  page?: number;
}

export function filtersToSearchParams(f: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.suburb) params.set("suburb", f.suburb);
  if (f.beds) params.set("beds", String(f.beds));
  if (f.baths) params.set("baths", String(f.baths));
  if (f.minPrice) params.set("minPrice", String(f.minPrice));
  if (f.maxPrice) params.set("maxPrice", String(f.maxPrice));
  if (f.minFloor) params.set("minFloor", String(f.minFloor));
  if (f.minLand) params.set("minLand", String(f.minLand));
  if (f.propertyType) params.set("type", f.propertyType);
  if (f.readyToBuy) params.set("readyToBuy", "1");
  if (f.sort && f.sort !== "best") params.set("sort", f.sort);
  if (f.bbox) params.set("bbox", f.bbox.join(","));
  if (f.page && f.page > 1) params.set("page", String(f.page));
  return params;
}

export function searchParamsToFilters(sp: URLSearchParams): SearchFilters {
  const num = (k: string) => {
    const v = sp.get(k);
    return v ? Number(v) : undefined;
  };
  const bboxStr = sp.get("bbox");
  const bbox = bboxStr
    ? (bboxStr.split(",").map(Number) as [number, number, number, number])
    : null;
  return {
    q: sp.get("q") ?? undefined,
    suburb: sp.get("suburb") ?? undefined,
    beds: num("beds"),
    baths: num("baths"),
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    minFloor: num("minFloor"),
    minLand: num("minLand"),
    propertyType: sp.get("type") ?? undefined,
    readyToBuy: sp.get("readyToBuy") === "1",
    sort: (sp.get("sort") as SearchFilters["sort"]) ?? "best",
    bbox: bbox && bbox.length === 4 && !bbox.some(isNaN) ? bbox : null,
    page: num("page") ?? 1,
  };
}