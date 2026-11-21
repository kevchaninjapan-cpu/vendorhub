import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStaff } from "@/lib/ops/staff";
import { toCsv } from "@/lib/ops/csv";

export const dynamic = "force-dynamic";

// Admin-only CSV exports. Every export is recorded in audit_log.
// Deliberately left out: phone numbers, home addresses, dates of birth,
// listing street addresses, offer notes, buyer names, document paths.

const TYPES = ["listings", "users", "offers", "viewings"] as const;
type ExportType = (typeof TYPES)[number];

type Row = Record<string, unknown>;

async function fetchAll(table: string, columns: string, orderBy = "created_at"): Promise<Row[]> {
  const out: Row[] = [];
  const page = 1000;
  for (let from = 0; from < 50000; from += page) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: false })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Row[];
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

const s = (v: unknown) => (v == null ? null : String(v));
const n = (v: unknown) => (v == null || v === "" ? null : Number(v));

async function build(type: ExportType): Promise<{ headers: string[]; rows: (string | number | null | string[])[][] }> {
  if (type === "listings") {
    const rows = await fetchAll(
      "listings",
      "id, short_id, status, pack_tier, headline, suburb, region, property_type, bedrooms, bathrooms, method_of_sale, asking_price, price_text, valuation_estimate, published_at, created_at, member_id"
    );
    return {
      headers: ["id", "short_id", "status", "pack_tier", "headline", "suburb", "region", "property_type", "bedrooms", "bathrooms", "method_of_sale", "asking_price", "price_text", "valuation_estimate", "published_at", "created_at", "seller_id"],
      rows: rows.map((r) => [s(r.id), s(r.short_id), s(r.status), s(r.pack_tier), s(r.headline), s(r.suburb), s(r.region), s(r.property_type), n(r.bedrooms), n(r.bathrooms), s(r.method_of_sale), n(r.asking_price), s(r.price_text), n(r.valuation_estimate), s(r.published_at), s(r.created_at), s(r.member_id)]),
    };
  }

  if (type === "users") {
    const [profiles, verifications] = await Promise.all([
      fetchAll("profiles", "id, email, full_name, role, onboarding_status, created_at"),
      fetchAll("verifications", "user_id, status, created_at"),
    ]);
    const latest = new Map<string, string>();
    for (const v of verifications) {
      const id = String(v.user_id);
      if (!latest.has(id)) latest.set(id, String(v.status));
    }
    return {
      headers: ["id", "email", "full_name", "role", "onboarding_status", "verification_status", "created_at"],
      rows: profiles.map((p) => [s(p.id), s(p.email), s(p.full_name), s(p.role), s(p.onboarding_status), latest.get(String(p.id)) ?? "none", s(p.created_at)]),
    };
  }

  if (type === "offers") {
    const [offers, listings] = await Promise.all([
      fetchAll("offers", "id, listing_id, buyer_id, amount, status, conditions, settlement_date, expires_at, counter_of, created_at"),
      fetchAll("listings", "id, headline, formatted_address"),
    ]);
    const titles = new Map<string, string>();
    for (const l of listings) titles.set(String(l.id), String(l.headline ?? l.formatted_address ?? ""));
    return {
      headers: ["id", "listing_id", "listing", "buyer_id", "amount", "status", "conditions", "settlement_date", "expires_at", "counter_of", "created_at"],
      rows: offers.map((o) => [s(o.id), s(o.listing_id), titles.get(String(o.listing_id)) ?? null, s(o.buyer_id), n(o.amount), s(o.status), Array.isArray(o.conditions) ? (o.conditions as string[]) : null, s(o.settlement_date), s(o.expires_at), s(o.counter_of), s(o.created_at)]),
    };
  }

  const viewings = await fetchAll(
    "viewings",
    "id, listing_id, open_home_id, buyer_id, status, slot_starts_at, slot_ends_at, attended, created_at, cancelled_at"
  );
  return {
    headers: ["id", "listing_id", "open_home_id", "buyer_id", "status", "slot_starts_at", "slot_ends_at", "attended", "created_at", "cancelled_at"],
    rows: viewings.map((v) => [s(v.id), s(v.listing_id), s(v.open_home_id), s(v.buyer_id), s(v.status), s(v.slot_starts_at), s(v.slot_ends_at), v.attended == null ? null : String(v.attended), s(v.created_at), s(v.cancelled_at)]),
  };
}

export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Exports are for admins only." }, { status: 403 });

  const type = new URL(req.url).searchParams.get("type") ?? "";
  if (!(TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }

  try {
    const { headers, rows } = await build(type as ExportType);
    const csv = toCsv(headers, rows);

    await supabaseAdmin.from("audit_log").insert({
      actor_id: staff.userId,
      action: "data_exported",
      target_type: "export",
      target_id: null,
      metadata: { type, rows: rows.length },
    });

    const date = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vendorhub-${type}-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[export] failed:", e);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}