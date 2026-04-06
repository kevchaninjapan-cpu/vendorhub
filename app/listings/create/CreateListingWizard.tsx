"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Textarea,
} from "@/components/ui";

type ListingDraft = {
  title: string;
  description: string;
  category: string;
  price: string;
};

const steps = ["Basic Info", "Category & Price", "Review"] as const;

export default function CreateListingWizard() {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<ListingDraft>({
    title: "",
    description: "",
    category: "",
    price: "",
  });

  // ✅ Correct update helper (keyed assignment)
  const update = (key: keyof ListingDraft, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    // placeholder – wire to Supabase / API later
    console.log("Submitting listing:", form);
    alert("Listing submitted (mock)");
  };

  // Basic gating (optional but feels “real” and prevents empty steps)
  const canGoNext =
    step === 0
      ? form.title.trim().length > 0 && form.description.trim().length > 0
      : step === 1
      ? form.category.trim().length > 0 && form.price.trim().length > 0
      : true;

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Create Listing</CardTitle>
                <CardDescription>
                  Step {step + 1} of {steps.length}: {steps[step]}
                </CardDescription>
              </div>

              <Badge variant="subtle">Draft</Badge>
            </div>

            {/* Stepper */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {steps.map((label, idx) => {
                const isActive = idx === step;
                const isComplete = idx < step;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(idx)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ring-inset transition",
                      isActive
                        ? "bg-primary/10 text-foreground ring-primary/20"
                        : isComplete
                        ? "bg-surface-2 text-foreground/80 ring-border/50 hover:bg-surface"
                        : "bg-surface text-muted ring-border/40 hover:bg-surface-2"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isComplete
                          ? "bg-foreground/10 text-foreground"
                          : "bg-foreground/5 text-muted"
                      )}
                    >
                      {idx + 1}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 0 && (
              <section className="space-y-5">
                <Field label="Title" hint="Short, clear headline buyers will scan first.">
                  <Input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. 3‑bed townhouse — Mt Roskill"
                  />
                </Field>

                <Field label="Description" hint="Add key highlights and what makes it stand out.">
                  <Textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Describe the listing..."
                  />
                </Field>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-5">
                <Field label="Category" hint="Choose what best matches this listing.">
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select category</option>
                    <option value="property">Property</option>
                    <option value="car">Car</option>
                    <option value="watch">Watch</option>
                  </select>
                </Field>

                <Field label="Price" hint="Numbers only — you can refine display later.">
                  <Input
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder="e.g. 899999"
                    inputMode="numeric"
                  />
                </Field>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-4 text-sm">
                <ReviewRow label="Title" value={form.title || "—"} />
                <ReviewRow label="Description" value={form.description || "—"} />
                <ReviewRow label="Category" value={form.category || "—"} />
                <ReviewRow label="Price" value={form.price ? `$${form.price}` : "—"} />
              </section>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={back} disabled={step === 0}>
              Back
            </Button>

            {step < steps.length - 1 ? (
              <Button variant="primary" onClick={next} disabled={!canGoNext}>
                Next
              </Button>
            ) : (
              <Button variant="primary" onClick={submit}>
                Publish Listing
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="mt-4 text-xs text-muted">
          Tip: keep the first draft short — you can polish copy and photos after publishing.
        </p>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface px-4 py-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">{value}</div>
    </div>
  );
}

const selectClass = cn(
  "w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground",
  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
  "disabled:opacity-50 disabled:cursor-not-allowed"
);