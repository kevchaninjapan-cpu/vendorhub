import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  getListingBySlug,
  getListingMedia,
  getOpenHomes,
} from "@/lib/marketplace/queries";
import { nzd, area, priceLabel, summaryLine } from "@/lib/marketplace/format";
import PhotoGallery from "./PhotoGallery";
import EnquiryForm from "./EnquiryForm";
import SaveButton from "./SaveButton";
import EvaluationCard from "./EvaluationCard";
import OfferButton from "./OfferButton";

export const revalidate = 300;

type RouteParams = { region: string; suburb: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Listing not found — VendorHub" };
  const title = listing.headline ?? listing.formatted_address ?? "Listing";
  return {
    title: `${title} — VendorHub`,
    description: listing.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title,
      description: listing.description?.slice(0, 160),
      type: "website",
    },
    alternates: {
      canonical: `/listings/${listing.region?.toLowerCase()}/${listing.suburb
        ?.toLowerCase()
        .replace(/\s+/g, "-")}/${listing.slug}`,
    },
  };
}

export default async function PublicListingPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const [media, openHomes] = await Promise.all([
    getListingMedia(listing.id),
    getOpenHomes(listing.id),
  ]);

  // Auth + verification check for OfferButton
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const isSignedIn = !!user;
  const isOwnListing = user?.id === listing.member_id;

  let isVerified = false;
  if (user) {
    const { data: v } = await supabaseAuth
      .from("verifications")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle();
    isVerified = !!v;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.headline ?? listing.formatted_address,
    description: listing.description ?? undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/listings/${listing.region?.toLowerCase()}/${listing.suburb
      ?.toLowerCase()
      .replace(/\s+/g, "-")}/${listing.slug}`,
    image: media.find((m) => m.is_cover)?.public_url,
    offers: listing.asking_price
      ? {
          "@type": "Offer",
          price: listing.asking_price,
          priceCurrency: "NZD",
        }
      : undefined,
    address: listing.formatted_address
      ? {
          "@type": "PostalAddress",
          streetAddress: listing.street_address,
          addressLocality: listing.suburb,
          addressRegion: listing.region,
          postalCode: listing.postcode,
          addressCountry: "NZ",
        }
      : undefined,
    geo:
      listing.lng != null && listing.lat != null
        ? {
            "@type": "GeoCoordinates",
            latitude: listing.lat,
            longitude: listing.lng,
          }
        : undefined,
    numberOfBedrooms: listing.bedrooms ?? undefined,
    numberOfBathroomsTotal: listing.bathrooms ?? undefined,
    floorSize:
      listing.floor_area_sqm != null
        ? {
            "@type": "QuantitativeValue",
            unitCode: "MTK",
            value: listing.floor_area_sqm,
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <nav className="text-xs text-muted-foreground">
          <Link href="/buy" className="hover:underline">Buy</Link>
          <span className="mx-1">/</span>
          <Link
            href={`/buy/${listing.region?.toLowerCase()}`}
            className="hover:underline"
          >
            {listing.region}
          </Link>
          <span className="mx-1">/</span>
          <Link
            href={`/buy/${listing.region?.toLowerCase()}/${listing.suburb
              ?.toLowerCase()
              .replace(/\s+/g, "-")}`}
            className="hover:underline"
          >
            {listing.suburb}
          </Link>
        </nav>

        <PhotoGallery media={media} />

        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {listing.ready_to_buy && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    Ready to Buy
                  </span>
                )}
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-700">
                  {listing.pack_tier}
                </span>
                <span className="text-xs text-muted-foreground">
                  Ref {listing.short_id}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {listing.headline ?? listing.formatted_address}
              </h1>
              <p className="text-sm text-muted-foreground">
                {listing.formatted_address}
              </p>
              <p className="text-2xl font-semibold">
                {priceLabel({
                  method: listing.method_of_sale,
                  askingPrice: listing.asking_price,
                  priceText: listing.price_text,
                  beoAmount: listing.beo_amount,
                  tenderCloseAt: listing.tender_close_at,
                })}
              </p>
              <p className="text-sm">
                {summaryLine(listing.bedrooms, listing.bathrooms, listing.parking)}
                {listing.floor_area_sqm
                  ? ` · Floor ${area(listing.floor_area_sqm)}`
                  : ""}
                {listing.land_area_sqm
                  ? ` · Land ${area(listing.land_area_sqm)}`
                  : ""}
              </p>
            </header>

            <section>
              <h2 className="mb-2 text-lg font-semibold">About this property</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {listing.description ?? "No description provided."}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact label="Type" value={listing.property_type ?? "—"} />
              <Fact label="Bedrooms" value={listing.bedrooms ?? "—"} />
              <Fact label="Bathrooms" value={listing.bathrooms ?? "—"} />
              <Fact label="Parking" value={listing.parking ?? "—"} />
              <Fact label="Floor area" value={area(listing.floor_area_sqm)} />
              <Fact label="Land area" value={area(listing.land_area_sqm)} />
              <Fact label="Year built" value={listing.year_built ?? "—"} />
              <Fact label="Method of sale" value={listing.method_of_sale ?? "—"} />
              <Fact label="Asking" value={nzd(listing.asking_price)} />
            </section>

            {!!listing.chattels?.length && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Chattels</h2>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {listing.chattels.map((c) => (
                    <li key={c} className="rounded bg-muted/30 px-2 py-1 text-xs">
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!!openHomes.length && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Open homes</h2>
                <ul className="space-y-1 text-sm">
                  {openHomes.map((o) => (
                    <li key={o.id}>
                      {new Date(o.starts_at).toLocaleString("en-NZ", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}{" "}
                      –{" "}
                      {new Date(o.ends_at).toLocaleTimeString("en-NZ", {
                        timeStyle: "short",
                      })}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <EvaluationCard listing={listing} />
          </section>

          <aside className="space-y-4">
            <div className="rounded-md border bg-background p-4">
              <h3 className="text-sm font-semibold">Make an offer</h3>
              <div className="mt-3">
                <OfferButton
                  listing={listing}
                  isSignedIn={isSignedIn}
                  isVerified={isVerified}
                  isOwnListing={isOwnListing}
                />
              </div>
            </div>

            <div className="rounded-md border bg-background p-4">
              <h3 className="text-sm font-semibold">Interested?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Get in touch with the seller through VendorHub&apos;s secure
                messaging.
              </p>
              <EnquiryForm listingId={listing.id} />
            </div>
            <SaveButton listingId={listing.id} />
          </aside>
        </div>
      </main>
    </>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded border bg-muted/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
