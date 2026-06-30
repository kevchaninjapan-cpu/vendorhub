"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { disclosuresStepSchema } from "@/lib/listings/schema";

type DisclosuresInput = z.input<typeof disclosuresStepSchema>;
type DisclosuresOutput = z.output<typeof disclosuresStepSchema>;
import type { ListingDraft } from "@/types/marketplace";

type Props = {
  draft: ListingDraft;
  busy: boolean;
  onBack: () => void;
  onNext: (v: Partial<ListingDraft>) => void;
};

export function Step4Disclosures({ draft, busy, onBack, onNext }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<
  DisclosuresInput,
  unknown,
  DisclosuresOutput
>({
    resolver: zodResolver(disclosuresStepSchema),
  defaultValues: {
  disclosures: draft.disclosures ?? {},
  acknowledgements: {
    rea_disclaimer_accepted: false,
    accurate_info_confirmed: false,
  },
},
  });

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit((v) => onNext({ disclosures: v.disclosures }))}
    >
      <h2 className="text-xl font-semibold">Step 4 — Disclosures</h2>
      <p className="text-sm text-muted-foreground">
        Providing LIM, title, and weathertightness disclosure unlocks the{" "}
        <strong>Ready to Buy</strong> badge — buyers know your listing is move-in ready.
      </p>

      <Check label="LIM report available"
        {...register("disclosures.lim_provided")} />
      <Check label="Title attached"
        {...register("disclosures.title_provided")} />
      <Check label="Weathertightness disclosed"
        {...register("disclosures.weathertightness_disclosed")} />
      <Check label="Unconsented works present"
        {...register("disclosures.unconsented_works")} />
      <Check label="Building report attached (optional)"
        {...register("disclosures.building_report_provided")} />

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Additional notes</span>
        <textarea {...register("disclosures.notes")} className="input min-h-[80px]" />
      </label>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
        <Check label="I acknowledge the REA Act disclaimer — VendorHub is a marketplace, not a licensed agency."
          {...register("acknowledgements.rea_disclaimer_accepted")} />
        {errors.acknowledgements?.rea_disclaimer_accepted && (
          <p className="text-xs text-red-600">
            {errors.acknowledgements.rea_disclaimer_accepted.message}
          </p>
        )}
        <Check label="I confirm the listing details are accurate and up to date."
          {...register("acknowledgements.accurate_info_confirmed")} />
        {errors.acknowledgements?.accurate_info_confirmed && (
          <p className="text-xs text-red-600">
            {errors.acknowledgements.accurate_info_confirmed.message}
          </p>
        )}
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm underline">Back</button>
        <button disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
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

function Check({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" {...rest} />
      <span>{label}</span>
    </label>
  );
}