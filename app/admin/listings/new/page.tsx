// app/admin/listings/new/page.tsx

import { createListingAction } from "./actions";
// Import Database as a type, but Constants as a value
import type { Database } from "@/types/supabase";
import { Constants } from "@/types/supabase";

type PropertyType = Database["public"]["Enums"]["property_type"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];

// Enum options from your generated Constants (runtime-safe)
const PROPERTY_TYPES = (Constants.public.Enums.property_type ??
  []) as readonly PropertyType[];
const LISTING_STATUSES = (Constants.public.Enums.listing_status ??
  []) as readonly ListingStatus[];

export default function NewListingPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Create Listing</h1>

      <form action={createListingAction} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            name="title"
            type="text"
            className="w-full rounded border p-2"
            placeholder="Sunny 3BR Family Home"
            required
          />
        </div>

        {/* Property meta */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property type</label>
            <select name="property_type" className="w-full rounded border p-2" defaultValue="house">
              {PROPERTY_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select name="status" className="w-full rounded border p-2" defaultValue="draft">
              {LISTING_STATUSES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Address */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Address line 1</label>
            <input name="address_line1" type="text" className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address line 2</label>
            <input name="address_line2" type="text" className="w-full rounded border p-2" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Suburb</label>
            <input name="suburb" type="text" className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input name="city" type="text" className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <input name="region" type="text" className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postcode</label>
            <input name="postcode" type="text" className="w-full rounded border p-2" />
          </div>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <input name="price" type="text" className="w-full rounded border p-2" placeholder="1200000" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bedrooms</label>
            <input name="bedrooms" type="number" className="w-full rounded border p-2" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bathrooms</label>
            <input name="bathrooms" type="number" className="w-full rounded border p-2" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Car spaces</label>
            <input name="car_spaces" type="number" className="w-full rounded border p-2" min={0} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Floor area (m²)</label>
            <input name="floor_area_m2" type="number" className="w-full rounded border p-2" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Land area (m²)</label>
            <input name="land_area_m2" type="number" className="w-full rounded border p-2" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year built</label>
            <input name="year_built" type="number" className="w-full rounded border p-2" min={0} />
          </div>
        </div>

        {/* Optional price display override */}
        <div>
          <label className="block text-sm font-medium mb-1">Price (display)</label>
          <input
            name="price_display"
            type="text"
            className="w-full rounded border p-2"
            placeholder="By negotiation / Auction / $1,200,000"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea name="description" className="w-full rounded border p-2" rows={4} />
        </div>

        <div className="pt-2">
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Create listing
          </button>
        </div>
      </form>
    </div>
  );
}
``