import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  className,
  label,
}: {
  value: number; // 0..100
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-emerald-600 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}