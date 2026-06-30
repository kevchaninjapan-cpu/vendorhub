"use client";

import type { ListingDraft } from "@/types/marketplace";

type Props = {
  draft: ListingDraft;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export function Step5Review({ draft, busy, onBack, onSubmit }: Props) {
  const d = draft.disclosures ?? {};
  const readyToBuy =
    !!d.lim_provided && !!d.title_provided && !!d.weathertightness_disclosed;

  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Step 5 — Review</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Address">
          <p className="font-medium">{draft.formatted_address}</p>
          <p className="text-sm text-muted-foreground">
            {draft.suburb} · {draft.region} {draft.postcode}
          </p>
        </Card>

        <Card title="Sale">
          <p>Method: <strong>{draft.method_of_sale}</strong></p>
          {draft.asking_price && <p>Asking: <strong>NZ$ {draft.asking_price.toLocaleString()}</strong></p>}
          {draft.price_text && <p>{draft.price_text}</p>}
          {draft.tender_close_at && <p>Tender closes: {draft.tender_close_at}</p>}
          {draft.beo_amount && <p>BEO: NZ$ {draft.beo_amount.toLocaleString()}</p>}
        </Card>

        <Card title="Property">
          <p>
            {draft.bedrooms} bed · {draft.bathrooms} bath · {draft.parking} parking
          </p>
          {draft.floor_area_sqm && <p>Floor: {draft.floor_area_sqm} m²</p>}
          {draft.land_area_sqm && <p>Land: {draft.land_area_sqm} m²</p>}
          {draft.year_built && <p>Built: {draft.year_built}</p>}
        </Card>

        <Card title="Disclosures">
          <ul className="text-sm">
            <li>LIM: {d.lim_provided ? "Yes" : "—"}</li>
            <li>Title: {d.title_provided ? "Yes" : "—"}</li>
            <li>Weathertightness disclosed: {d.weathertightness_disclosed ? "Yes" : "—"}</li>
            <li>Unconsented works: {d.unconsented_works ? "Yes" : "—"}</li>
            <li>Building report: {d.building_report_provided ? "Yes" : "—"}</li>
          </ul>
          <p className={`mt-2 text-sm font-semibold ${readyToBuy ? "text-emerald-700" : "text-amber-700"}`}>
            {readyToBuy
              ? "✓ Ready to Buy badge will be shown"
              : "Add LIM + title + weathertightness to unlock Ready to Buy"}
          </p>
        </Card>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        Your listing will be sent to <strong>moderation</strong>. A VendorHub team
        member will review and publish it, usually within one business day.
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm underline">Back</button>
        <button onClick={onSubmit} disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          Submit for review
        </button>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}