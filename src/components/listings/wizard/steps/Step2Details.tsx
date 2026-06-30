"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { detailsStepSchema } from "@/lib/listings/schema";
import type { ListingDraft } from "@/types/marketplace";

type DetailsInput = z.input<typeof detailsStepSchema>;
type DetailsOutput = z.output<typeof detailsStepSchema>;

type Props = {
  draft: ListingDraft;
  busy: boolean;
  onBack: () => void;
  onNext: (v: Partial<ListingDraft>) => void;
};

export function Step2Details({ draft, busy, onBack, onNext }: Props) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitted } } =
    useForm<DetailsInput, unknown, DetailsOutput>({
      resolver: zodResolver(detailsStepSchema),
      defaultValues: {
        pack_tier: draft.pack_tier ?? "starter",
        property_type: (draft.property_type ?? "house"),
        bedrooms: draft.bedrooms ?? 3,
        bathrooms: draft.bathrooms ?? 1,
        parking: draft.parking ?? 1,
        floor_area_sqm: draft.floor_area_sqm ?? undefined,
        land_area_sqm: draft.land_area_sqm ?? undefined,
        year_built: draft.year_built ?? undefined,
        chattels: (draft.chattels ?? []) as any,
        headline: draft.headline ?? "",
        description: draft.description ?? "",
        method_of_sale: draft.method_of_sale ?? "asking_price",
        asking_price: draft.asking_price ?? undefined,
        price_text: draft.price_text ?? undefined,
tender_close_at: draft.tender_close_at ?? undefined,
        beo_amount: draft.beo_amount ?? undefined,
      },
    });

  const method = watch("method_of_sale");

  // Pretty-printed list of all visible validation errors
  const errorList = Object.entries(errors)
    .map(([field, err]) => ({
      field,
      message: (err as any)?.message ?? "Invalid value",
    }))
    .filter((e) => !!e.message);

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(
        (v) =>
          onNext({
            ...v,
            chattels:
              typeof (v as any).chattels === "string"
                ? ((v as any).chattels as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : v.chattels,
          }),
        (errs) => {
          // eslint-disable-next-line no-console
          console.warn("[Step2Details] form invalid:", errs);
        }
      )}
    >
      <h2 className="text-xl font-semibold">Step 2 — Property details</h2>

      {/* Visible error summary so users know why Continue is rejected */}
      {isSubmitted && errorList.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">
            Please fix the following before continuing:
          </p>
          <ul className="ml-4 mt-1 list-disc space-y-0.5">
            {errorList.map((e) => (
              <li key={e.field}>
                <strong>{e.field.replace(/_/g, " ")}:</strong> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Pack tier" error={errors.pack_tier?.message}>
          <select {...register("pack_tier")} className="input">
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
        </Field>
        <Field label="Property type" error={errors.property_type?.message}>
          <select {...register("property_type")} className="input">
            {["house","apartment","townhouse","unit","section","lifestyle","other"]
              .map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Year built" error={errors.year_built?.message}>
          <input type="number" {...register("year_built")} className="input" />
        </Field>

        <Field label="Bedrooms" error={errors.bedrooms?.message}>
          <input type="number" {...register("bedrooms")} className="input" />
        </Field>
        <Field label="Bathrooms" error={errors.bathrooms?.message}>
          <input type="number" {...register("bathrooms")} className="input" />
        </Field>
        <Field label="Parking" error={errors.parking?.message}>
          <input type="number" {...register("parking")} className="input" />
        </Field>

        <Field label="Floor area (m²)" error={errors.floor_area_sqm?.message}>
          <input type="number" step="0.1" {...register("floor_area_sqm")} className="input" />
        </Field>
        <Field label="Land area (m²)" error={errors.land_area_sqm?.message}>
          <input type="number" step="0.1" {...register("land_area_sqm")} className="input" />
        </Field>
        <Field label="Method of sale" error={errors.method_of_sale?.message}>
          <select {...register("method_of_sale")} className="input">
            <option value="asking_price">Asking price</option>
            <option value="negotiation">Price by negotiation</option>
            <option value="tender">Tender</option>
            <option value="beo">BEO</option>
          </select>
        </Field>

        {method === "asking_price" && (
          <Field label="Asking price (NZD)" error={errors.asking_price?.message}>
            <input type="number" {...register("asking_price")} className="input" />
          </Field>
        )}
        {method === "negotiation" && (
          <Field label="Price text" error={errors.price_text?.message}>
            <input {...register("price_text")} className="input"
              placeholder="e.g. Buyer enquiry over $X" />
          </Field>
        )}
        {method === "tender" && (
          <Field label="Tender close" error={errors.tender_close_at?.message}>
            <input type="datetime-local" {...register("tender_close_at")} className="input" />
          </Field>
        )}
        {method === "beo" && (
          <Field label="BEO amount" error={errors.beo_amount?.message}>
            <input type="number" {...register("beo_amount")} className="input" />
          </Field>
        )}
      </div>

      <Field label="Headline" error={errors.headline?.message}>
        <input {...register("headline")} className="input"
          placeholder="Sunny family home in central Ellerslie" />
      </Field>

      <Field
        label="Description (min 50 characters)"
        error={errors.description?.message}
      >
        <textarea {...register("description")} className="input min-h-[160px]" />
      </Field>

      <Field label="Chattels (comma separated)" error={(errors as any).chattels?.message}>
        <input
          defaultValue={(draft.chattels ?? []).join(", ")}
          {...register("chattels" as any)}
          className="input"
          placeholder="dishwasher, heatpump, blinds"
        />
      </Field>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm underline">
          Back
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Continue
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%; border: 1px solid hsl(var(--border));
          border-radius: 0.375rem; padding: 0.5rem 0.75rem; background: transparent;
        }
      `}</style>
    </form>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
