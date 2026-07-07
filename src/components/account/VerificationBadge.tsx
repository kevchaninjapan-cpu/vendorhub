type Props = { status: string | null | undefined };

const STYLES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

const LABELS: Record<string, string> = {
  approved: "Verified",
  pending: "Verification pending",
  rejected: "Verification rejected",
};

export default function VerificationBadge({ status }: Props) {
  const s = status ?? "not_verified";
  const cls = STYLES[s] ?? "bg-slate-100 text-slate-700 border-slate-300";
  const label = LABELS[s] ?? "Not verified";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
