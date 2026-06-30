"use client";

const STEPS = ["Address", "Details", "Media", "Disclosures", "Review"] as const;
type Props = { current: number; onJump?: (i: number) => void };

export function Stepper({ current, onJump }: Props) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump?.(i)}
              className={[
                "h-8 w-8 rounded-full flex items-center justify-center font-semibold",
                active ? "bg-primary text-primary-foreground"
                  : done ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {i + 1}
            </button>
            <span className={active ? "font-semibold" : "text-muted-foreground"}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}