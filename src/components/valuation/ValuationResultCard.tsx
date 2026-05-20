"use client";

import * as React from "react";

type ValuationApi = {
  subject?: {
    unit_of_property_id?: string;
    address?: string;
  };
  baseline?: {
    capital_value?: number;
    land_value?: number;
    improvements_value?: number;
  };
  estimate?: {
    point?: number;
    low?: number;
    high?: number;
    method?: string;
  };
  comparables?: {
    count?: number;
    p25?: number;
    p50?: number;
    p75?: number;
  };
  confidence?: {
    level?: "High" | "Good" | "Moderate" | "Low" | string;
    score?: number; // 0..1
    reasons?: string[];
  };
  suburb_median?: number;
  suburb_name?: string;
};

export type ValuationResultCardProps = {
  matchedAddress?: string;
  dvrRecordId?: string | number | null;
  valuation?: ValuationApi | null;
  className?: string;
};

/* ---------- helpers ---------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatNZD(n?: number | null) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
}

function toScore01(score?: number) {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return clamp(score, 0, 1);
}

function confidencePct(score01: number) {
  return Math.round(clamp(score01 * 100, 0, 100));
}

function rangePctFromConfidenceScore(conf01: number) {
  const c = clamp(conf01, 0, 1);
  const pct = 0.14 - c * 0.1; // 0.14 .. 0.04
  return clamp(pct, 0.04, 0.14);
}

function confidenceLabel(confPct: number) {
  if (confPct >= 85) return "High";
  if (confPct >= 65) return "Good";
  if (confPct >= 45) return "Moderate";
  return "Low";
}

function confidenceBarClass(confPct: number) {
  if (confPct >= 85) return "bg-emerald-500";
  if (confPct >= 65) return "bg-emerald-400";
  if (confPct >= 45) return "bg-amber-400";
  return "bg-rose-500";
}

function colourForConfidence(base: "land" | "improvements", conf01: number) {
  const c = clamp(conf01, 0, 1);
  const alpha = 0.35 + c * 0.6;
  const rgb = base === "land" ? [59, 130, 246] : [16, 185, 129];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function InfoTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-flex items-center text-muted-foreground/70 hover:text-muted-foreground cursor-help"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M12 10.5V17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 7.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* ---------- component ---------- */

export default function ValuationResultCard({
  matchedAddress,
  dvrRecordId,
  valuation,
  className,
}: ValuationResultCardProps) {
  const estimatePoint = valuation?.estimate?.point;
  const comps = valuation?.comparables?.count ?? 0;

  const p25 = valuation?.comparables?.p25;
  const p50 = valuation?.comparables?.p50;
  const p75 = valuation?.comparables?.p75;

  const conf01 = toScore01(valuation?.confidence?.score);
  const confPct = confidencePct(conf01);
  const dynRangePct = rangePctFromConfidenceScore(conf01);

  const dynLow =
    typeof estimatePoint === "number"
      ? Math.round(estimatePoint * (1 - dynRangePct))
      : undefined;
  const dynHigh =
    typeof estimatePoint === "number"
      ? Math.round(estimatePoint * (1 + dynRangePct))
      : undefined;

  const compsLow = valuation?.estimate?.low;
  const compsHigh = valuation?.estimate?.high;

  const addressLine =
    matchedAddress ||
    valuation?.subject?.address?.replace(/\r/g, ", ") ||
    "Valuation result";

  const capital = valuation?.baseline?.capital_value ?? 0;
  const land = valuation?.baseline?.land_value ?? 0;
  const improvements = valuation?.baseline?.improvements_value ?? 0;

  const hasBaseline = Number.isFinite(capital) && capital > 0;

  let landPct = 0;
  let impPct = 0;
  if (hasBaseline && capital > 0) {
    landPct = clamp((land / capital) * 100, 0, 100);
    impPct = clamp((improvements / capital) * 100, 0, 100);
    const total = landPct + impPct;
    if (total > 0) {
      landPct = (landPct / total) * 100;
      impPct = (impPct / total) * 100;
    }
  }

  const minSeg = 3;
  const lv = landPct > 0 && landPct < minSeg ? minSeg : landPct;
  const iv = impPct > 0 && impPct < minSeg ? minSeg : impPct;
  const t = lv + iv;
  const landWidth = t > 0 ? (lv / t) * 100 : 0;
  const impWidth = t > 0 ? (iv / t) * 100 : 0;

  const confTip =
    "Confidence reflects the data strength behind this estimate. Higher confidence = tighter range.";
  const cvTip =
    "Council CV split — Land vs Improvements. Colour intensity scales with confidence.";
  const compsTip =
    "COMPS = the number of comparable properties used to calculate this estimate. More comps generally means a more reliable valuation. P25 / Median / P75 show how those comparable values are distributed.";

  return (
    <div
      className={[
        "w-full overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      {/* ---------- Top: Address + Hero estimate ---------- */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Estimated value
            </p>
            <h2 className="mt-1 truncate text-lg font-medium text-foreground/90">
              {addressLine}
            </h2>
          </div>

          {/* Confidence pill (subtle) */}
          <div className="shrink-0 flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1">
            <span
              className={[
                "inline-block h-1.5 w-1.5 rounded-full",
                confidenceBarClass(confPct),
              ].join(" ")}
            />
            <span className="text-xs font-medium">
              {confPct}% {valuation?.confidence?.level ?? confidenceLabel(confPct)}
            </span>
            <InfoTip text={confTip} />
          </div>
        </div>

        {/* Hero value */}
        <div className="mt-4">
          <p className="text-4xl font-semibold tracking-tight">
            {formatNZD(estimatePoint ?? null)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatNZD(dynLow ?? null)} – {formatNZD(dynHigh ?? null)}{" "}
            <span className="ml-1 text-xs text-muted-foreground/80">
              (±{Math.round(dynRangePct * 100)}% · confidence-linked)
            </span>
          </p>
        </div>

        {/* Confidence track */}
        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={["h-1.5 rounded-full", confidenceBarClass(confPct)].join(" ")}
              style={{ width: `${clamp(confPct, 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---------- Divider ---------- */}
      <div className="h-px w-full bg-border/50" />

      {/* ---------- Comps row (with COMPS tooltip) ---------- */}
      <div className="grid grid-cols-4 gap-4 px-6 py-5">
        {/* COMPS with info tooltip */}
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Comps
            </p>
            <InfoTip text={compsTip} />
          </div>
          <p className="mt-1 text-base font-medium">{comps ? String(comps) : "—"}</p>
        </div>

        <Stat label="P25" value={formatNZD(p25 ?? null)} />
        <Stat label="Median" value={formatNZD(p50 ?? null)} />
        <Stat label="P75" value={formatNZD(p75 ?? null)} />
      </div>

      {/* ---------- Divider ---------- */}
      <div className="h-px w-full bg-border/50" />

      {/* ---------- Suburb + CV split ---------- */}
      <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
        {/* Suburb */}
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Suburb
          </p>
          <p className="mt-1 text-lg font-medium">
            {valuation?.suburb_name ?? "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Median: {formatNZD(valuation?.suburb_median ?? null)}
          </p>
        </div>

        {/* CV split (stacked bar) */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Capital Value
            </p>
            <InfoTip text={cvTip} />
          </div>
          <p className="mt-1 text-lg font-medium">
            {formatNZD(valuation?.baseline?.capital_value ?? null)}
          </p>

          {hasBaseline ? (
            <>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="flex h-2.5 w-full">
                  <div
                    className="h-2.5"
                    style={{
                      width: `${landWidth}%`,
                      backgroundColor: colourForConfidence("land", conf01),
                    }}
                    title={`Land: ${Math.round(landPct)}%`}
                  />
                  <div
                    className="h-2.5"
                    style={{
                      width: `${impWidth}%`,
                      backgroundColor: colourForConfidence("improvements", conf01),
                    }}
                    title={`Improvements: ${Math.round(impPct)}%`}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                <Row
                  dot={colourForConfidence("land", conf01)}
                  label="Land"
                  value={`${formatNZD(land)} · ${Math.round(landPct)}%`}
                />
                <Row
                  dot={colourForConfidence("improvements", conf01)}
                  label="Improvements"
                  value={`${formatNZD(improvements)} · ${Math.round(impPct)}%`}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Baseline split not available.
            </p>
          )}
        </div>
      </div>

      {/* ---------- Subtle metadata footer ---------- */}
      <div className="border-t border-border/50 bg-muted/30 px-6 py-3 text-[11px] text-muted-foreground">
        DVR {dvrRecordId ?? "—"}
        {valuation?.subject?.unit_of_property_id
          ? ` · Unit ${valuation.subject.unit_of_property_id}`
          : ""}
        {typeof compsLow === "number" && typeof compsHigh === "number"
          ? ` · Comps band ${formatNZD(compsLow)}–${formatNZD(compsHigh)}`
          : ""}
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-medium">{value}</p>
    </div>
  );
}

function Row({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: dot }}
        />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}