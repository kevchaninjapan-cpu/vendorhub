import type { PublicListingDocument } from "@/lib/documents/schema";

type Doc = Pick<PublicListingDocument, "doc_type" | "visibility">;

// Shows the seller what earns the "Ready to buy" badge. Mirrors the database
// rule in listing_ready_to_buy(): a LIM and a record of title that buyers can
// see (not "Only me"), plus the weathertightness disclosure tick.
export default function ReadyToBuyHint({ documents }: { documents: Doc[] }) {
  const visible = (type: string) =>
    documents.some((d) => d.doc_type === type && d.visibility !== "private");

  const items = [
    { label: "LIM report", done: visible("lim") },
    { label: "Record of title", done: visible("title") },
  ];
  const docsDone = items.every((i) => i.done);

  return (
    <section
      className={
        docsDone
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          : "rounded-2xl border border-slate-200 bg-white p-5"
      }
    >
      <h2 className="text-base font-semibold text-slate-900">Ready to buy badge</h2>
      <p className="mt-1 text-sm text-slate-600">
        Listings with a LIM and record of title that buyers can see get a Ready to buy badge, and appear when buyers
        filter for Ready to buy. Documents set to Only me don&apos;t count.
      </p>

      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <span
              className={
                i.done
                  ? "rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white"
                  : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
              }
            >
              {i.done ? "Done" : "Needed"}
            </span>
            <span className="text-slate-800">{i.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">Also</span>
          <span className="text-slate-800">
            Tick &ldquo;Weathertightness disclosed&rdquo; in your listing&apos;s Disclosures step
          </span>
        </li>
      </ul>

      {docsDone ? (
        <p className="mt-3 text-xs text-emerald-800">
          Both documents are in. With the weathertightness tick, your listing shows the badge.
        </p>
      ) : null}
    </section>
  );
}