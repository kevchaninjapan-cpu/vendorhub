// app/admin/listings/[id]/page.tsx

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { notFound } from "next/navigation";
import type { Database } from "@/types/supabase";
import UploadListingImage from "@/components/UploadListingImage";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

// UUID pattern (v1–v5)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function formatAddress(l: Listing) {
  const parts = [
    l.address_line1,
    l.address_line2,
    l.suburb, // you have suburb in your types
    l.city,
    l.region,
    l.postcode,
  ]
    .filter((x) => !!x && String(x).trim().length > 0)
    .map((x) => String(x).trim());
  return parts.join(", ");
}

async function getListing(id: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // If row is not visible due to RLS or doesn't exist, render 404
    notFound();
  }
  return data as Listing;
}

export default async function EditListingPage({
  // 👇 In Next.js 15, params may be a Promise — type it as Promise<...>
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Await params before accessing id
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const listing = await getListing(id);

  const displayAddress = formatAddress(listing);
  const displayPrice =
    typeof listing.price === "number"
      ? `$${listing.price.toLocaleString()}`
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Edit Listing</h1>
        <span className="text-sm text-gray-500">ID: {listing.id}</span>
      </div>

      {/* Image uploader */}
      <UploadListingImage listingId={listing.id} />

      {/* Details */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm">
          <span className="font-medium">Title:</span> {listing.title ?? "—"}
        </p>

        <p className="text-sm">
          <span className="font-medium">Address:</span>{" "}
          {displayAddress || "—"}
        </p>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>
            <span className="font-medium">Bedrooms:</span>{" "}
            {typeof listing.bedrooms === "number" ? listing.bedrooms : "—"}
          </p>
          <p>
            <span className="font-medium">Bathrooms:</span>{" "}
            {typeof listing.bathrooms === "number" ? listing.bathrooms : "—"}
          </p>
          <p>
            <span className="font-medium">Car spaces:</span>{" "}
            {typeof listing.car_spaces === "number" ? listing.car_spaces : "—"}
          </p>
          <p>
            <span className="font-medium">Price:</span> {displayPrice}
          </p>
        </div>

        <p className="text-sm">
          <span className="font-medium">Description:</span>{" "}
          {listing.description ?? "—"}
        </p>
      </div>
    </div>
  );
}