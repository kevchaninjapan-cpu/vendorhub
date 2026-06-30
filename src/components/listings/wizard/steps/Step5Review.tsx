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

  // Sanity-check which fields are missing so users see what to go fix
  const missing: { step: string; field: string }[] = [];
  if (!draft.formatted_address) missing.push({ step: "1", field: "Address" });
  if (!draft.property_type) missing.push({ step: "2", field: "Property type" });
  if (draft.bedrooms == null) missing.push({ step: "2", field: "Bedrooms" });
  if (draft.bathrooms == null) missing.push({ step: "2", field: "Bathrooms" });
  if (!draft.headline) missing.push({ step: "2", field: "Headline" });
  if (!draft.description) missing.push({ step: "2", field: "Description" });
  if (!draft.method_of_sale) missing.push({ step: "2", field: "Method of sale" });

  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Step 5 — Review</h2>

      {missing.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">⚠ Your draft is missing some details</p>
          <ul className="mt-1 ml-4 list-disc text-xs">
            {missing.map((m, i) => (
              <li key={i}>
                <strong>Step {m.step}:</strong> {m.field}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Go back through the steps to fill these in before submitting.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Address">
          <p className="font-medium">{draft.formatted_address ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            {[draft.suburb, draft.region, draft.postcode].filter(Boolean).join(" · ") || "—"}
          </p>
        </Card>

        <Card title="Sale">
          <p>
            Method:{" "}
            <strong>
              {draft.method_of_sale
                ? draft.method_of_sale.replace(/_/g, " ")
                : "—"}
            </strong>
          </p>
          {draft.asking_price != null && (
            <p>
              Asking: <strong>NZ$ {draft.asking_price.toLocaleString()}</strong>
            </p>
          )}
          {draft.price_text && <p>{draft.price_text}</p>}
          {draft.tender_close_at && (
            <p>
              Tender closes:{" "}
              {new Date(draft.tender_close_at).toLocaleString("en-NZ")}
            </p>
          )}
          {draft.beo_amount != null && (
            <p>BEO: NZ$ {draft.beo_amount.toLocaleString()}</p>
          )}
        </Card>

        <Card title="Property">
          <p>
            {[
              draft.bedrooms != null ? `${draft.bedrooms} bed` : null,
              draft.bathrooms != null ? `${draft.bathrooms} bath` : null,
              draft.parking != null ? `${draft.parking} parking` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          {draft.property_type && <p>Type: {draft.property_type}</p>}
          {draft.floor_area_sqm != null && <p>Floor: {draft.floor_area_sqm} m²</p>}
          {draft.land_area_sqm != null && <p>Land: {draft.land_area_sqm} m²</p>}
          {draft.year_built != null && <p>Built: {draft.year_built}</p>}
        </Card>

        <Card title="Disclosures">
          <ul className="text-sm">
            <li>LIM: {d.lim_provided ? "Yes" : "—"}</li>
            <li>Title: {d.title_provided ? "Yes" : "—"}</li>
            <li>
              Weathertightness disclosed: {d.weathertightness_disclosed ? "Yes" : "—"}
            </li>
            <li>Unconsented works: {d.unconsented_works ? "Yes" : "—"}</li>
            <li>Building report: {d.building_report_provided ? "Yes" : "—"}</li>
          </ul>
          <p
            className={`mt-2 text-sm font-semibold ${
              readyToBuy ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {readyToBuy
              ? "✓ Ready to Buy badge will be shown"
              : "Add LIM + title + weathertightness to unlock Ready to Buy"}
          </p>
        </Card>

        {draft.headline && (
          <Card title="Headline">
            <p className="font-medium">{draft.headline}</p>
          </Card>
        )}

        {draft.description && (
          <Card title="Description">
            <p className="whitespace-pre-wrap text-xs leading-relaxed">
              {draft.description}
            </p>
          </Card>
        )}
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        Your listing will be sent to <strong>moderation</strong>. A VendorHub
        team member will review and publish it, usually within one business day.
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm underline">
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={busy || missing.length > 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {missing.length > 0
            ? `Complete ${missing.length} more field${missing.length === 1 ? "" : "s"}`
            : "Submit for review"}
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