"use client";

import React, { useState } from "react";

interface ValuationRangeBarProps {
  rangeLow: number;
  rangeHigh: number;
  midpoint: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  baseline?: number;
  suburbMedian?: number;
  suburbName?: string;
  compsCount?: number;
}

function formatNzd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString("en-NZ")}`;
}

const CONFIDENCE_THEME = {
  HIGH: {
    barFrom: "from-emerald-400",
    barTo: "to-emerald-600",
    midpointBg: "bg-emerald-600",
    midpointRing: "ring-emerald-200",
    label: "text-emerald-700",
  },
  MEDIUM: {
    barFrom: "from-amber-400",
    barTo: "to-amber-500",
    midpointBg: "bg-amber-600",
    midpointRing: "ring-amber-200",
    label: "text-amber-700",
  },
  LOW: {
    barFrom: "from-rose-400",
    barTo: "to-rose-500",
    midpointBg: "bg-rose-600",
    midpointRing: "ring-rose-200",
    label: "text-rose-700",
  },
};

function positionWithin(value: number, low: number, high: number): number {
  if (high === low) return 50;
  const pct = ((value - low) / (high - low)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export default function ValuationRangeBar({
  rangeLow,
  rangeHigh,
  midpoint,
  confidence,
  baseline,
  suburbMedian,
  suburbName,
  compsCount,
}: ValuationRangeBarProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const theme = CONFIDENCE_THEME[confidence] ?? CONFIDENCE_THEME.MEDIUM;

  const downsidePct = Math.round(((midpoint - rangeLow) / midpoint) * 100);
  const upsidePct = Math.round(((rangeHigh - midpoint) / midpoint) * 100);
  const isSymmetric = Math.abs(downsidePct - upsidePct) <= 1;
  const avgPct = Math.round((downsidePct + upsidePct) / 2);
  const totalSpreadPct = downsidePct + upsidePct;

  const midpointPos = positionWithin(midpoint, rangeLow, rangeHigh);
  const baselinePos =
    baseline != null ? positionWithin(baseline, rangeLow, rangeHigh) : null;

  // Only show suburb median if meaningfully different from estimate (>2%)
  const suburbMeaningful =
    suburbMedian != null &&
    midpoint != null &&
    Math.abs((suburbMedian - midpoint) / midpoint) > 0.02;

  const suburbPos = suburbMeaningful
    ? positionWithin(suburbMedian!, rangeLow, rangeHigh)
    : null;

  const baselineOutOfRange =
    baseline != null && (baseline < rangeLow || baseline > rangeHigh);
  const suburbOutOfRange =
    suburbMedian != null &&
    (suburbMedian < rangeLow || suburbMedian > rangeHigh);

  const vsSuburb =
    suburbMedian && midpoint
      ? ((midpoint - suburbMedian) / suburbMedian) * 100
      : null;

  const tooltipText = (() => {
    const parts: string[] = [];

    if (compsCount && compsCount > 0) {
      parts.push(
        `Range is based on the 25th–75th percentile of ${compsCount} comparable properties in this area.`,
      );
    } else {
      parts.push("Range is based on comparable properties in this area.");
    }

    if (!isSymmetric) {
      parts.push(
        `This range is asymmetric — there is more upside (+${upsidePct}%) than downside (−${downsidePct}%), reflecting variability in higher-priced comparables.`,
      );
    }

    if (totalSpreadPct <= 12) {
      parts.push("A narrow range indicates strong agreement among comparables.");
    } else if (totalSpreadPct >= 30) {
      parts.push(
        "A wider range indicates more market variation — use with caution.",
      );
    }

    return parts.join(" ");
  })();

  return (
    <div className="w-full">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted">
          Estimated Range
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
          {formatNzd(midpoint)}
        </p>

        <div className="relative mt-1 inline-flex items-center gap-1">
          <p className={`text-[11px] font-medium ${theme.label}`}>
            {isSymmetric ? (
              <>±{avgPct}% range</>
            ) : (
              <>−{downsidePct}% / +{upsidePct}% range</>
            )}
          </p>

          <button
            type="button"
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            onClick={() => setTooltipOpen((v) => !v)}
            aria-label="How is this range calculated?"
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full
                       border border-slate-300 text-[9px] font-bold text-slate-500
                       hover:border-slate-500 hover:text-slate-700 transition"
          >
            i
          </button>

          {tooltipOpen && (
            <div
              className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2
                         rounded-lg border border-slate-200 bg-white p-3 text-left
                         text-[10px] leading-relaxed text-slate-700 shadow-lg"
            >
              <div
                className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45
                           border-l border-t border-slate-200 bg-white"
              />
              {tooltipText}
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-8 h-3 w-full rounded-full bg-slate-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${theme.barFrom} ${theme.barTo}`}
          style={{ width: "100%" }}
        />

        {suburbPos !== null && (
          <div
            className="absolute -top-6 z-10"
            style={{ left: `${suburbPos}%`, transform: "translateX(-50%)" }}
          >
            <div className="flex flex-col items-center">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white ${
                  suburbOutOfRange ? "bg-slate-400" : "bg-slate-700"
                }`}
              >
                Area Med
              </span>
              <div
                className={`h-4 w-0.5 ${
                  suburbOutOfRange ? "bg-slate-400" : "bg-slate-700"
                }`}
              />
            </div>
          </div>
        )}

        {baselinePos !== null && (
          <div
            className="absolute top-3 z-10"
            style={{ left: `${baselinePos}%`, transform: "translateX(-50%)" }}
          >
            <div className="flex flex-col items-center">
              <div
                className={`h-4 w-0.5 ${
                  baselineOutOfRange ? "bg-blue-300" : "bg-blue-600"
                }`}
              />
              <span
                className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white ${
                  baselineOutOfRange ? "bg-blue-300" : "bg-blue-600"
                }`}
              >
                CV
              </span>
            </div>
          </div>
        )}

        <div
          className={`absolute top-1/2 z-20 h-5 w-5 -translate-y-1/2 rounded-full
                      ${theme.midpointBg} ring-4 ${theme.midpointRing} shadow-md`}
          style={{ left: `${midpointPos}%`, transform: "translate(-50%, -50%)" }}
          title={`Estimate: ${formatNzd(midpoint)}`}
        />
      </div>

      <div className="mt-10 flex justify-between text-[11px]">
        <div>
          <p className="font-medium text-muted uppercase tracking-wider">Low</p>
          <p className="font-semibold text-foreground">{formatNzd(rangeLow)}</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-muted uppercase tracking-wider">High</p>
          <p className="font-semibold text-foreground">{formatNzd(rangeHigh)}</p>
        </div>
      </div>

      {(suburbMedian || baseline) && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          {suburbMedian != null && vsSuburb != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">
                vs {suburbName ? `${suburbName} Median` : "Area Median"}
              </p>
              <p
                className={`text-xs font-semibold ${
                  vsSuburb > 5
                    ? "text-emerald-700"
                    : vsSuburb < -5
                    ? "text-rose-700"
                    : "text-slate-700"
                }`}
              >
                {vsSuburb > 0 ? "+" : ""}
                {vsSuburb.toFixed(1)}% ({formatNzd(suburbMedian)})
              </p>
            </div>
          )}
          {baseline != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">
                vs Council CV
              </p>
              <p
                className={`text-xs font-semibold ${
                  midpoint > baseline * 1.05
                    ? "text-emerald-700"
                    : midpoint < baseline * 0.95
                    ? "text-rose-700"
                    : "text-slate-700"
                }`}
              >
                {midpoint > baseline ? "+" : ""}
                {(((midpoint - baseline) / baseline) * 100).toFixed(1)}% (
                {formatNzd(baseline)})
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted">
        <div className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${theme.midpointBg}`} />
          <span>Estimate</span>
        </div>
        {baseline != null && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-blue-600" />
            <span>Council CV</span>
          </div>
        )}
        {suburbPos !== null && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-slate-700" />
            <span>{suburbName ? `${suburbName} Median` : "Area Median"}</span>
          </div>
        )}
      </div>
    </div>
  );
}