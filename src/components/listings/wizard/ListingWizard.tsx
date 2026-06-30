"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "./Stepper";
import { Step1Address } from "./steps/Step1Address";
import { Step2Details } from "./steps/Step2Details";
import { Step3Media } from "./steps/Step3Media";
import { Step4Disclosures } from "./steps/Step4Disclosures";
import { Step5Review } from "./steps/Step5Review";
import {
  createOrUpdateDraft,
  submitForReview,
  withdrawListing,
} from "@/lib/listings/actions";
import type { ListingDraft } from "@/types/marketplace";

const empty: ListingDraft = {
  pack_tier: "starter",
  chattels: [],
  disclosures: {},
};

type Props = {
  initial?: ListingDraft;
  mode?: "create" | "edit";
};

export function ListingWizard({ initial, mode = "create" }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>({ ...empty, ...initial });
  const [busy, setBusy] = useState(false);
  const [savingDraft, startSaveDraft] = useTransition();
  const [withdrawing, startWithdraw] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function persist(next: Partial<ListingDraft>) {
    setBusy(true); setErr(null);
    try {
      const merged = { ...draft, ...next };
      const { id } = await createOrUpdateDraft(merged);
      setDraft({ ...merged, id });
    } catch (e: any) {
      setErr(e.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onNext(next: Partial<ListingDraft>) {
    await persist(next);
    setStep(s => Math.min(s + 1, 4));
  }

  async function onSubmit() {
    if (!draft.id) return;
    setBusy(true); setErr(null);
    try {
      await submitForReview(draft.id, draft);
      router.push(`/account/listings?submitted=${draft.id}`);
    } catch (e: any) {
      setErr(e.message ?? "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  function onSaveDraft() {
    setErr(null); setNotice(null);
    startSaveDraft(async () => {
      try {
        await createOrUpdateDraft(draft);
        setNotice("Draft saved.");
        setTimeout(() => setNotice(null), 3000);
      } catch (e: any) {
        setErr(e.message ?? "Could not save draft");
      }
    });
  }

  function onWithdraw() {
    if (!draft.id) return;
    if (!confirm("Withdraw this listing? Buyers will no longer see it.")) return;
    setErr(null);
    startWithdraw(async () => {
      try {
        await withdrawListing(draft.id!);
        router.push("/account/listings");
      } catch (e: any) {
        setErr(e.message ?? "Could not withdraw");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Stepper current={step} onJump={(i) => i <= step && setStep(i)} />

        <div className="flex items-center gap-2">
          {mode === "edit" && draft.id && (
            <button
              type="button"
              onClick={onWithdraw}
              disabled={withdrawing}
              className="text-xs text-red-700 underline disabled:opacity-50"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw listing"}
            </button>
          )}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={savingDraft}
            className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {savingDraft ? "Saving…" : "Save draft"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {step === 0 && (
        <Step1Address draft={draft} busy={busy} onNext={(v) => onNext(v)} />
      )}
      {step === 1 && (
        <Step2Details draft={draft} busy={busy}
          onBack={() => setStep(0)} onNext={(v) => onNext(v)} />
      )}
      {step === 2 && (
        <Step3Media draft={draft} busy={busy}
          onBack={() => setStep(1)} onNext={() => setStep(3)} />
      )}
      {step === 3 && (
        <Step4Disclosures draft={draft} busy={busy}
          onBack={() => setStep(2)} onNext={(v) => onNext(v)} />
      )}
      {step === 4 && (
        <Step5Review draft={draft} busy={busy}
          onBack={() => setStep(3)} onSubmit={onSubmit} />
      )}
    </div>
  );
}