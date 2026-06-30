"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import ValuationRangeBar from "./ValuationRangeBar";
import ValuationAdjustments from "./ValuationAdjustments";

interface ValuationData {
  subject?: {
    unit_of_property_id: string;
    address?: string;
  };
  baseline: {
    capital_value: number | null;
    land_value: number | null;
    improvements_value: number | null;
  };
  estimate: {
    point: number | null;
    low: number | null;
    high: number | null;
    method: string;
  };
  comparables?: {
    count: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
  };
  confidence: {
    level: string;
    score: number;
    reasons: string[];
  };
  suburb_median?: number | null;
  suburb_name?: string | null;
}

interface ValuationResultCardProps {
  matchedAddress: string;
  valuation: ValuationData;
  dvrRecordId?: string;
}

const CONFIDENCE_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  HIGH:   { variant: "success", label: "High confidence" },
  MEDIUM: { variant: "warning", label: "Medium confidence" },
  LOW:    { variant: "neutral", label: "Low confidence" },
};

function getBadgeInfo(level: string | undefined | null) {
  const key = (level ?? "").toUpperCase();
  return (
    CONFIDENCE_BADGE[key] ?? {
      variant: "neutral" as BadgeVariant,
      label: level ? `${level} confidence` : "Unknown confidence",
    }
  );
}

function formatNzd(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toLocaleString("en-NZ")}`;
}

function cleanAddress(addr: string | undefined | null): string {
  if (!addr) return "";
  return addr.replace(/\r|\n/g, ", ").replace(/,\s*,/g, ",").trim();
}

function sourceLabel(method: string): string {
  if (method.startsWith("auckland")) return "Auckland Council";
  return "LINZ DVR";
}

export default function ValuationResultCard({
  matchedAddress,
  valuation,
  dvrRecordId,
}: ValuationResultCardProps) {
  const { confidence, baseline, estimate, comparables, suburb_median, suburb_name } =
    valuation;

  const badgeInfo = getBadgeInfo(confidence?.level);

  const hasEstimate =
    estimate?.point != null && estimate?.low != null && estimate?.high != null;

  return (
    <Card className="w-full max-w-lg animate-vh-slide-in">
      {/* ── Header ──────────────────────────────── */}
      <div className="border-b border-border/40 px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground truncate">
            {cleanAddress(matchedAddress)}
          </h3>
          <p className="text-xs text-muted mt-0.5">Property E-Valuation</p>
          {dvrRecordId && (
            <p className="text-[10px] text-muted mt-0.5">Ref {dvrRecordId}</p>
          )}
        </div>
        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
      </div>

      <CardContent className="space-y-5">
        {/* ── Range Bar ───────────────────────────── */}
        {hasEstimate ? (
          <ValuationRangeBar
            rangeLow={estimate.low!}
            rangeHigh={estimate.high!}
            midpoint={estimate.point!}
            confidence={
              (confidence.level || "MEDIUM").toUpperCase() as
                | "HIGH"
                | "MEDIUM"
                | "LOW"
            }
            baseline={baseline.capital_value ?? undefined}
            suburbMedian={suburb_median ?? undefined}
            suburbName={suburb_name ?? undefined}
            compsCount={comparables?.count ?? undefined}
          />
        ) : (
          <div className="rounded-xl bg-surface-2/50 px-4 py-6 text-center">
            <p className="text-sm text-muted">
              Unable to generate an estimate for this property.
            </p>
          </div>
        )}

        {/* ── Baseline (stacks on mobile) ─────────── */}
        <div className="grid grid-cols-1 gap-3 rounded-xl bg-surface-2/50 px-3 py-2.5 sm:grid-cols-3">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">CV</p>
            <p className="text-xs font-semibold text-foreground">
              {formatNzd(baseline.capital_value)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">Land</p>
            <p className="text-xs font-semibold text-foreground">
              {formatNzd(baseline.land_value)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">Improvements</p>
            <p className="text-xs font-semibold text-foreground">
              {formatNzd(baseline.improvements_value)}
            </p>
          </div>
        </div>

        {/* ── Comparables ─────────────────────────── */}
        {comparables && comparables.count > 0 && (
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-surface-2/50 px-3 py-2.5 sm:grid-cols-4">

            <div className="border-b pb-2 sm:border-0 sm:pb-0">
              <p className="text-[10px] text-muted uppercase tracking-wider">Comps</p>
              <p className="text-sm font-semibold text-foreground">
                {comparables.count}
              </p>
            </div>

            <div className="border-b pb-2 sm:border-0 sm:pb-0">
              <p className="text-[10px] text-muted uppercase tracking-wider">P25</p>
              <p className="text-sm font-semibold text-foreground">
                {formatNzd(comparables.p25)}
              </p>
            </div>

            <div className="border-b pb-2 sm:border-0 sm:pb-0">
              <p className="text-[10px] text-muted uppercase tracking-wider">Median</p>
              <p className="text-sm font-semibold text-foreground">
                {formatNzd(comparables.p50)}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider">P75</p>
              <p className="text-sm font-semibold text-foreground">
                {formatNzd(comparables.p75)}
              </p>
            </div>
          </div>
        )}

        {/* ── Confidence reasons ──────────────────── */}
        {confidence?.reasons?.length > 0 && (
          <ValuationAdjustments
            adjustments={[]}
            assumptions={confidence.reasons}
          />
        )}
      </CardContent>

      {/* ── Footer ──────────────────────────────── */}
      <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between">
        <p className="text-[10px] text-muted">
          Source: {sourceLabel(estimate?.method ?? "")}
        </p>
        <p className="text-[10px] text-muted">
          Confidence: {Math.round((confidence?.score ?? 0) * 100)}%
        </p>
      </div>
    </Card>
  );
}