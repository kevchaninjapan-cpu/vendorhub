"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import OfferModal from "./OfferModal";
import type { PublicListing } from "@/types/marketplace-public";

export default function OfferButton({
  listing, isVerified, isSignedIn, isOwnListing,
}: {
  listing: PublicListing;
  isVerified: boolean;
  isSignedIn: boolean;
  isOwnListing: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (isOwnListing) {
    return (
      <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
        This is your listing. Manage offers from your dashboard.
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <a href={`/auth/sign-in?next=/listings/${listing.region?.toLowerCase()}/${listing.suburb?.toLowerCase().replace(/\s+/g, "-")}/${listing.slug}`}
         className="block w-full">
        <Button fullWidth>Sign in to make an offer</Button>
      </a>
    );
  }

  if (!isVerified) {
    return (
      <div className="space-y-2">
        <a href="/account/verify" className="block w-full">
          <Button fullWidth>Verify identity to make an offer</Button>
        </a>
        <p className="text-xs text-slate-600">
          Verification is free and usually approved within 1 business day.
        </p>
      </div>
    );
  }

  return (
    <>
      <Button fullWidth onClick={() => setOpen(true)}>
        Make an offer
      </Button>
      {open && (
        <OfferModal
          listing={listing}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
