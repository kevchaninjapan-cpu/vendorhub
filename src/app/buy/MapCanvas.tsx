"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SearchListing } from "@/types/marketplace-public";
import {
  AUCKLAND_DEFAULT_VIEW,
  listingsBbox,
} from "@/lib/marketplace/geo";

// LINZ Basemaps vector style — Topographic, NZ-hosted, free.
// Register at https://basemaps.linz.govt.nz/ to get an API key.
function linzStyleUrl(): string {
  const key = process.env.NEXT_PUBLIC_LINZ_API_KEY;
  if (!key) {
    console.warn(
      "[MapCanvas] NEXT_PUBLIC_LINZ_API_KEY is not set. " +
      "Get a free key at https://basemaps.linz.govt.nz/"
    );
  }
  return `https://basemaps.linz.govt.nz/v1/styles/topographic-v2.json?api=${
    key ?? ""
  }`;
}

export default function MapCanvas({
  listings,
  onBboxChange,
}: {
  listings: SearchListing[];
onBboxChange: (bbox: [number, number, number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: linzStyleUrl(),
      center: AUCKLAND_DEFAULT_VIEW.center,
      zoom: AUCKLAND_DEFAULT_VIEW.zoom,
    });
    mapRef.current = map;

    // Helpful error logging if tiles fail to load (usually a bad API key)
    map.on("error", (e) => {
      console.error("[MapCanvas] MapLibre error:", e?.error?.message ?? e);
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("moveend", () => {
      const b = map.getBounds();
      onBboxChange([
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    listings.forEach((l) => {
      if (l.lng == null || l.lat == null) return;
      const el = document.createElement("a");
      el.href = `/listings/${l.region?.toLowerCase()}/${l.suburb
        ?.toLowerCase()
        .replace(/\s+/g, "-")}/${l.slug}`;
      el.className =
        "block rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow hover:bg-emerald-700";
      el.textContent = l.asking_price
        ? `$${Math.round(l.asking_price / 1000)}k`
        : "•";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([l.lng, l.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    const bbox = listingsBbox(listings);
    if (bbox) {
      map.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 40, maxZoom: 14, duration: 300 }
      );
    }
  }, [listings]);

  return <div ref={containerRef} className="h-full w-full" />;
}