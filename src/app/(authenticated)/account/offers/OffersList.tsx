"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptOffer, declineOffer, counterOffer } from "@/lib/offers/actions";

type OfferRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount: number;
  conditions: string[] | null;
  expires_at: string | null;
  settlement_date: string | null;
  status: string;
  counter_of: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  countered: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-slate-100 text-slate-700",
  withdrawn: "bg-slate-100 text-slate-700",
  expired: "bg-slate-100 text-slate-500",
};

export default function OffersList({
  offers, role,
}: {
  offers: OfferRow[];
  role: "buyer" | "seller";
  userId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");

  if (offers.length === 0) {
    return (
      <div className="rounded-md border bg-slate-50 p-6 text-center text-sm text-slate-600">
        {role === "buyer"
          ? "You haven't made any offers yet."
          : "No offers on your listings yet."}
      </div>
    );
  }

  function doAccept(id: string) {
    if (!confirm("Accept this offer? Other active offers will be declined.")) return;
    start(async () => {
      try { await acceptOffer(id); toast.success("Offer accepted"); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }
  function doDecline(id: string) {
    const reason = prompt("Optional reason:") ?? "";
    start(async () => {
      try { await declineOffer(id, reason); toast.success("Offer declined"); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }
  function doCounter(id: string) {
    const amt = Number(counterAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    start(async () => {
      try {
        await counterOffer(id, amt);
        toast.success("Counter-offer sent");
        setCounterFor(null); setCounterAmount("");
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div className="space-y-3">
      {offers.map((o) => {
        const isActive = ["submitted", "countered"].includes(o.status);
        return (
          <div key={o.id} className="rounded-md border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold">
                  NZ${o.amount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(o.created_at).toLocaleString("en-NZ")}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                  STATUS_BADGE[o.status] ?? "bg-slate-100"
                }`}
              >
                {o.status.replace(/_/g, " ")}
              </span>
            </div>

            {o.conditions && o.conditions.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                Conditions: {o.conditions.join(", ")}
              </p>
            )}
            {o.settlement_date && (
              <p className="text-xs text-slate-600">
                Settlement: {new Date(o.settlement_date).toLocaleDateString("en-NZ")}
              </p>
            )}
            {o.notes && (
              <p className="mt-1 text-xs italic text-slate-600">{o.notes}</p>
            )}

            {isActive && (
              <div className="mt-3 flex flex-wrap gap-2">
                {role === "seller" && (
                  <>
                    <Button size="sm" onClick={() => doAccept(o.id)} disabled={pending}>
                      Accept
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setCounterFor(o.id)} disabled={pending}>
                      Counter
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => doDecline(o.id)} disabled={pending}>
                      Decline
                    </Button>
                  </>
                )}
                {role === "buyer" && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setCounterFor(o.id)} disabled={pending}>
                      Counter
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => doDecline(o.id)} disabled={pending}>
                      Withdraw
                    </Button>
                  </>
                )}
              </div>
            )}

            {counterFor === o.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                <span className="text-xs">Counter with NZ$</span>
                <input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="w-32 rounded border px-2 py-1 text-sm"
                  placeholder="Amount"
                  autoFocus
                />
                <Button size="sm" onClick={() => doCounter(o.id)} disabled={pending}>
                  Send counter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setCounterFor(null); setCounterAmount(""); }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
