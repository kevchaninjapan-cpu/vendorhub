"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import type { Database } from "@/types/supabase";

// Utility: fallback slugify if RPC fails
function fallbackSlugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function createListingAction(formData: FormData) {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  // 1) Auth (required for owner_id + RLS)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect("/login");
  }

  // 2) Extract & sanitize inputs (names must match the form)
  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const address_line1 = (formData.get("address_line1") as string)?.trim() || null;
  const address_line2 = (formData.get("address_line2") as string)?.trim() || null;
  const suburb = (formData.get("suburb") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const region = (formData.get("region") as string)?.trim() || null;
  const postcode = (formData.get("postcode") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;

  // numbers
  const toNum = (v: FormDataEntryValue | null) =>
    typeof v === "string" && v.length ? Number(v.replace(/[, ]/g, "")) : null;

  const price = toNum(formData.get("price"));
  const price_numeric = toNum(formData.get("price_numeric")) ?? price; // convenience
  const floor_area_m2 = toNum(formData.get("floor_area_m2"));
  const land_area_m2 = toNum(formData.get("land_area_m2"));
  const year_built = toNum(formData.get("year_built"));
  const bedrooms = toNum(formData.get("bedrooms"));
  const bathrooms = toNum(formData.get("bathrooms"));
  const car_spaces = toNum(formData.get("car_spaces"));

  // enums
  const property_type = (formData.get("property_type") ||
    "house") as Database["public"]["Enums"]["property_type"];
  const status = (formData.get("status") ||
    "draft") as Database["public"]["Enums"]["listing_status"];

  // display price (optional pretty string)
  const price_display =
    (formData.get("price_display") as string)?.trim() ||
    (price ? `$${price.toLocaleString()}` : null);

  // 3) Compute slug using your Supabase RPC, with a fallback
  let slug: string | null = null;
  try {
    const { data: slugData, error: slugErr } = await supabase.rpc("slugify", {
      input: title,
    });
    if (slugErr) {
      console.warn("slugify RPC failed, falling back:", slugErr.message);
      slug = fallbackSlugify(title);
    } else {
      slug = slugData || fallbackSlugify(title);
    }
  } catch {
    slug = fallbackSlugify(title);
  }

  // 4) Insert row (type‑safe to your generated types)
  const { data, error } = await supabase
    .from("listings")
    .insert({
      title,
      slug,
      owner_id: user.id, // <-- critical for RLS
      address_line1,
      address_line2,
      suburb,
      city,
      region,
      postcode,
      description,
      price,
      price_display,
      price_numeric,
      floor_area_m2,
      land_area_m2,
      year_built,
      bedrooms,
      bathrooms,
      car_spaces,
      property_type,
      status,
      // created_at/updated_at likely default via DB; omit unless you set explicitly
    } satisfies Database["public"]["Tables"]["listings"]["Insert"])
    .select("id")
    .single();

  if (error) {
    // Optionally, return an object and render a message in the form
    throw new Error(error.message);
  }

  // 5) Redirect to edit page for the new listing
  redirect(`/admin/listings/${data.id}`);
}