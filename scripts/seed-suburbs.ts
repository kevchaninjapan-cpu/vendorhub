/**
 * Seed the `suburbs` table from existing valuation data.
 *
 * Run with:
 *   npm run seed:suburbs
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (service role — bypasses RLS, needed for bulk upsert)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type SuburbAgg = {
  suburb: string;
  region: string;
  count: number;
  capital_values: number[];
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Adjust this query to whatever your DVR table is called and which columns
 * contain suburb + capital value. The defaults match Kevin's setup
 * (table `nz_dvr_114085`, suburb in `situation_name`, value in `capital_value`).
 *
 * If your DVR rows don't include suburb cleanly, we'll fall back to the
 * Auckland Council rate assessments table.
 */
async function fetchDvrRows() {
  const PAGE = 1000;
  let from = 0;
  let all: { suburb: string | null; capital_value: number | null }[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("nz_dvr_114085")
      .select("situation_name, capital_value")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    all = all.concat(
      data.map((r: any) => ({
        suburb: r.situation_name?.trim() || null,
        capital_value: r.capital_value ?? null,
      }))
    );
    if (data.length < PAGE) break;
    from += PAGE;
    process.stdout.write(`\rFetched ${all.length} DVR rows…`);
  }
  process.stdout.write("\n");
  return all;
}

function aggregate(
  rows: { suburb: string | null; capital_value: number | null }[],
  region: string
): SuburbAgg[] {
  const map = new Map<string, SuburbAgg>();
  for (const r of rows) {
    if (!r.suburb || !r.capital_value || r.capital_value <= 0) continue;
    const key = r.suburb.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.capital_values.push(r.capital_value);
    } else {
      map.set(key, {
        suburb: r.suburb,
        region,
        count: 1,
        capital_values: [r.capital_value],
      });
    }
  }
  return [...map.values()];
}

async function upsertSuburbs(aggregates: SuburbAgg[]) {
  let written = 0;
  for (const agg of aggregates) {
    const m = median(agg.capital_values);
    const { error } = await supabase.rpc("upsert_suburb", {
      p_name: agg.suburb,
      p_region: agg.region,
      p_median_sale_price: m,
      p_active_listings_count: 0, // will be set by recount below
    });
    if (error) {
      console.error(`  ✗ ${agg.suburb}:`, error.message);
      continue;
    }
    written++;
    if (written % 25 === 0) {
      process.stdout.write(`\rUpserted ${written}/${aggregates.length} suburbs…`);
    }
  }
  process.stdout.write(`\rUpserted ${written}/${aggregates.length} suburbs.   \n`);
}

async function recount() {
  const { error } = await supabase.rpc("recount_active_listings");
  if (error) throw error;
}

async function main() {
  console.log("→ Fetching DVR rows…");
  const rows = await fetchDvrRows();
  console.log(`→ ${rows.length} rows fetched.`);

  console.log("→ Aggregating by suburb…");
  // Hard-coded to "Auckland" for the MVP. If you later load other regions,
  // partition rows by TA code and call aggregate() per region.
  const aggregates = aggregate(rows, "Auckland")
    .filter(a => a.count >= 5); // ignore tiny/noisy buckets
  console.log(`→ ${aggregates.length} suburbs with ≥5 valuations.`);

  console.log("→ Upserting to Supabase…");
  await upsertSuburbs(aggregates);

  console.log("→ Recounting active listings…");
  await recount();

  console.log("✓ Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});