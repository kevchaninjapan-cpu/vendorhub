"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";

interface Adjustment {
  type: string;
  description: string;
  impactLow: number;
  impactHigh: number;
}

interface ValuationAdjustmentsProps {
  adjustments: Adjustment[];
  assumptions: string[];
}

function formatImpact(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs}`;
}

const TYPE_LABELS: Record<string, string> = {
  BASELINE: "Baseline",
  INDEX_ADJUSTMENT: "Market Index",
  COMPARABLE_SPREAD: "Comparables",
  CHARACTERISTIC: "Property",
};

const TYPE_ICONS: Record<string, string> = {
  BASELINE: "\u{1F3E0}",
  INDEX_ADJUSTMENT: "\u{1F4C8}",
  COMPARABLE_SPREAD: "\u{1F504}",
  CHARACTERISTIC: "\u{1F527}",
};

export default function ValuationAdjustments({
  adjustments,
  assumptions,
}: ValuationAdjustmentsProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-2">
          How we got here
        </p>
        <div className="space-y-1.5">
          {adjustments.map((adj, i) => {
            const isNetSummary =
              adj.type === "CHARACTERISTIC" &&
              adj.description.startsWith("Net characteristic");
            const isIndividual =
              adj.type === "CHARACTERISTIC" && !isNetSummary;

            if (isIndividual) {
              return (
                <div key={i} className="flex items-center gap-2 pl-8 py-1">
                  <span className="text-[10px] text-muted">&bull;</span>
                  <span className="flex-1 text-xs text-muted">{adj.description}</span>
                </div>
              );
            }

            const impact = adj.type === "BASELINE" ? null : adj.impactHigh;

            return (
              <div key={i} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", "bg-surface-2/50")}>
                <span className="text-sm">{TYPE_ICONS[adj.type] ?? "\u{1F4CA}"}</span>
                <span className="flex-1 text-xs text-foreground/90">
                  {TYPE_LABELS[adj.type] ?? adj.type}
                </span>
                {impact !== null && impact !== undefined && (
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      impact > 0 && "text-emerald-600",
                      impact < 0 && "text-rose-600",
                      impact === 0 && "text-muted",
                    )}
                  >
                    {formatImpact(impact)}
                  </span>
                )}
                {adj.type === "BASELINE" && (
                  <span className="text-xs font-semibold text-foreground/70">+/-10%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowAssumptions(!showAssumptions)}
          className={cn("flex items-center gap-1.5 text-xs text-muted", "hover:text-foreground transition-colors")}
        >
          <span className={cn("inline-block transition-transform duration-200", showAssumptions && "rotate-90")}>
            &#9656;
          </span>
          {showAssumptions ? "Hide" : "Show"} assumptions &amp; disclaimers
        </button>

        {showAssumptions && (
          <div className="mt-2 space-y-2 animate-vh-fade-in">
            {assumptions.map((a, i) => (
              <div key={i} className="flex gap-2 rounded-xl bg-surface-2/30 px-3 py-2">
                <span className="text-muted text-[10px] mt-0.5 shrink-0">{i + 1}.</span>
                <p className="text-[11px] leading-relaxed text-muted">{a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}