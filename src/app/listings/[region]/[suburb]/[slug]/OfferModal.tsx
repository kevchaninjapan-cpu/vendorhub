"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitOffer } from "@/lib/offers/actions";
import type { PublicListing } from "@/types/marketplace-public";

export default function OfferModal({
  listing, onClose,
}: {
  listing: PublicListing;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [finance, setFinance] = useState(false);
  const [building, setBuilding] = useState(false);
  const [lim, setLim] = useState(false);
  const [settlement, setSettlement] = useState("");
  const [expires, setExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const minPrice = listing.asking_price ? Math.round(listing.asking_price * 0.75) : null;

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (minPrice && amt < minPrice) {
      toast.error(`Minimum offer is NZ$${minPrice.toLocaleString()} (75% of asking).`);
      return;
    }
    setBusy(true);
    try {
      await submitOffer(listing.id, {
        amount: amt,
        finance_condition: finance,
        building_report_condition: building,
        lim_condition: lim,
        settlement_date: settlement || undefined,
        expires_at: expires || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Offer submitted");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
         onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
           onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Make an offer</h2>
        <p className="mt-1 text-xs text-slate-600">
          {listing.headline ?? listing.formatted_address}
        </p>
        {minPrice && (
          <p className="mt-1 text-xs text-slate-600">
            Minimum offer: <strong>NZ${minPrice.toLocaleString()}</strong> (75% of asking).
          </p>
        )}

        <div className="mt-4 space-y-3">
          <Field label="Offer amount (NZ$)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="1200000"
              autoFocus
            />
          </Field>

          <div className="space-y-1 text-sm">
            <p className="font-medium">Conditions</p>
            <Check label="Subject to finance" checked={finance} onChange={setFinance} />
            <Check label="Subject to building report" checked={building} onChange={setBuilding} />
            <Check label="Subject to LIM" checked={lim} onChange={setLim} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Settlement date">
              <input type="date" value={settlement} onChange={(e) => setSettlement(e.target.value)}
                     className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
            <Field label="Offer expires">
              <input type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)}
                     className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
          </div>

          <Field label="Notes to seller (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                      className="w-full rounded border px-3 py-2 text-sm" />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Submit offer</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function Check({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
             className="accent-emerald-600" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
