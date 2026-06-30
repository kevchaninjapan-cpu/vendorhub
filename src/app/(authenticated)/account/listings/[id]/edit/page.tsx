import { loadDraft } from "@/lib/listings/actions";
import { ListingWizard } from "@/components/listings/wizard/ListingWizard";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit listing — VendorHub" };
export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let initial;
  try {
    initial = await loadDraft(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Edit listing</h1>
        <p className="text-sm text-muted-foreground">
          Save your changes at any time, or submit for review again when ready.
        </p>
      </header>
      <ListingWizard initial={initial} mode="edit" />
    </div>
  );
}