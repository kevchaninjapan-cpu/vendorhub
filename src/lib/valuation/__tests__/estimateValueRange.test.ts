import { estimateValueRange } from "../estimateValueRange";
import { ConfidenceLevel, PropertyCategory } from "../types";
import type { ValuationEngineInput } from "../types";

function baseInput(
  overrides: Partial<ValuationEngineInput> = {},
): ValuationEngineInput {
  return {
    ratingValuation: {
      capitalValue: 1_000_000,
      valuationDate: new Date().toISOString().slice(0, 10),
      source: "COUNCIL_CV",
    },
    property: {
      category: PropertyCategory.RESIDENTIAL,
    },
    ...overrides,
  };
}

describe("Layer A — Baseline", () => {
  it("applies ±10% range around CV", () => {
    const result = estimateValueRange(baseInput());
    expect(result.rangeLow).toBe(900_000);
    expect(result.rangeHigh).toBe(1_100_000);
    expect(result.midpoint).toBe(1_000_000);
  });

  it("records a BASELINE adjustment", () => {
    const result = estimateValueRange(baseInput());
    const baseline = result.adjustments.find((a) => a.type === "BASELINE");
    expect(baseline).toBeDefined();
    expect(baseline!.impactLow).toBe(-100_000);
    expect(baseline!.impactHigh).toBe(100_000);
  });

  it("preserves baseline metadata in the output", () => {
    const result = estimateValueRange(baseInput());
    expect(result.baseline.capitalValue).toBe(1_000_000);
    expect(result.baseline.source).toBe("COUNCIL_CV");
  });
});

describe("Layer B — Regional Index Adjustment", () => {
  it("shifts both bounds by the index percentage", () => {
    const result = estimateValueRange(
      baseInput({
        regionalIndex: {
          region: "Auckland",
          percentChange: 10,
          indexDate: "2026-03-31",
        },
      }),
    );
    expect(result.rangeLow).toBe(990_000);
    expect(result.rangeHigh).toBe(1_210_000);
  });

  it("handles negative index (market decline)", () => {
    const result = estimateValueRange(
      baseInput({
        regionalIndex: {
          region: "Canterbury",
          percentChange: -5,
          indexDate: "2026-03-31",
        },
      }),
    );
    expect(result.rangeLow).toBe(855_000);
    expect(result.rangeHigh).toBe(1_045_000);
  });

  it("caps adjustment at ±25%", () => {
    const result = estimateValueRange(
      baseInput({
        regionalIndex: {
          region: "Queenstown",
          percentChange: 40,
          indexDate: "2026-03-31",
        },
      }),
    );
    expect(result.rangeLow).toBe(1_125_000);
    expect(result.rangeHigh).toBe(1_375_000);
    const adj = result.adjustments.find((a) => a.type === "INDEX_ADJUSTMENT");
    expect(adj!.description).toContain("capped");
  });

  it("caps negative adjustment at -25%", () => {
    const result = estimateValueRange(
      baseInput({
        regionalIndex: {
          region: "Queenstown",
          percentChange: -35,
          indexDate: "2026-03-31",
        },
      }),
    );
    expect(result.rangeLow).toBe(675_000);
    expect(result.rangeHigh).toBe(825_000);
  });

  it("includes indexDate in dataFreshness when supplied", () => {
    const result = estimateValueRange(
      baseInput({
        regionalIndex: {
          region: "Auckland",
          percentChange: 5,
          indexDate: "2026-03-31",
        },
      }),
    );
    expect(result.dataFreshness.indexDate).toBe("2026-03-31");
  });

  it("omits indexDate from dataFreshness when no index supplied", () => {
    const result = estimateValueRange(baseInput());
    expect(result.dataFreshness.indexDate).toBeUndefined();
  });
});

describe("Layer C — Comparable Spread", () => {
  it("narrows range when spread < baseline spread", () => {
    const result = estimateValueRange(
      baseInput({
        comparable: { count: 15, spread: 0.05 },
      }),
    );
    expect(result.rangeLow).toBe(950_000);
    expect(result.rangeHigh).toBe(1_050_000);
    expect(result.midpoint).toBe(1_000_000);
  });

  it("widens range when spread > baseline spread", () => {
    const result = estimateValueRange(
      baseInput({
        comparable: { count: 3, spread: 0.20 },
      }),
    );
    expect(result.rangeLow).toBe(800_000);
    expect(result.rangeHigh).toBe(1_200_000);
    expect(result.midpoint).toBe(1_000_000);
  });

  it("does not adjust range when spread is undefined", () => {
    const result = estimateValueRange(
      baseInput({
        comparable: { count: 5 },
      }),
    );
    expect(result.rangeLow).toBe(900_000);
    expect(result.rangeHigh).toBe(1_100_000);
  });
});

describe("Confidence scoring", () => {
  it("returns HIGH for residential, fresh CV, and > 10 comparables", () => {
    const result = estimateValueRange(
      baseInput({
        comparable: { count: 12, spread: 0.08 },
      }),
    );
    expect(result.confidence).toBe(ConfidenceLevel.HIGH);
  });

  it("returns MEDIUM for residential with fresh CV but few comparables", () => {
    const result = estimateValueRange(
      baseInput({
        comparable: { count: 5, spread: 0.08 },
      }),
    );
    expect(result.confidence).toBe(ConfidenceLevel.MEDIUM);
  });

  it("returns LOW for apartment category", () => {
    const result = estimateValueRange(
      baseInput({
        property: { category: PropertyCategory.APARTMENT },
      }),
    );
    expect(result.confidence).toBe(ConfidenceLevel.LOW);
  });

  it("returns LOW for rural category", () => {
    const result = estimateValueRange(
      baseInput({
        property: { category: PropertyCategory.RURAL },
      }),
    );
    expect(result.confidence).toBe(ConfidenceLevel.LOW);
  });

  it("returns LOW for unknown category", () => {
    const result = estimateValueRange(
      baseInput({
        property: { category: PropertyCategory.UNKNOWN },
      }),
    );
    expect(result.confidence).toBe(ConfidenceLevel.LOW);
  });

  it("returns LOW when valuation is older than 4 years", () => {
    const result = estimateValueRange(
      baseInput({
        ratingValuation: {
          capitalValue: 1_000_000,
          valuationDate: "2020-01-01",
          source: "COUNCIL_CV",
        },
        comparable: { count: 20, spread: 0.05 },
      }),
    );
    expect(result.confidence).toBe(ConfidenceLevel.LOW);
  });

  it("returns MEDIUM for residential with no comparables", () => {
    const result = estimateValueRange(baseInput());
    expect(result.confidence).toBe(ConfidenceLevel.MEDIUM);
  });
});

describe("Guardrails", () => {
  it("throws when capitalValue is missing", () => {
    expect(() =>
      estimateValueRange({
        ratingValuation: {
          capitalValue: 0,
          valuationDate: "2024-01-01",
          source: "COUNCIL_CV",
        },
        property: { category: PropertyCategory.RESIDENTIAL },
      }),
    ).toThrow("rating valuation with a positive Capital Value");
  });

  it("throws when capitalValue is negative", () => {
    expect(() =>
      estimateValueRange({
        ratingValuation: {
          capitalValue: -500_000,
          valuationDate: "2024-01-01",
          source: "COUNCIL_CV",
        },
        property: { category: PropertyCategory.RESIDENTIAL },
      }),
    ).toThrow("rating valuation with a positive Capital Value");
  });

  it("never returns a single-price result (low always < high)", () => {
    const result = estimateValueRange(baseInput());
    expect(result.rangeLow).toBeLessThan(result.rangeHigh);
  });

  it("always includes at least one assumption", () => {
    const result = estimateValueRange(baseInput());
    expect(result.assumptions.length).toBeGreaterThanOrEqual(2);
  });

  it("always includes the universal disclaimer", () => {
    const result = estimateValueRange(baseInput());
    const disclaimer = result.assumptions.find((a) =>
      a.includes("indicative estimate only"),
    );
    expect(disclaimer).toBeDefined();
  });
});

describe("Output shape", () => {
  it("returns rounded integers for all monetary values", () => {
    const result = estimateValueRange(
      baseInput({
        ratingValuation: {
          capitalValue: 777_777,
          valuationDate: new Date().toISOString().slice(0, 10),
          source: "COUNCIL_CV",
        },
      }),
    );
    expect(Number.isInteger(result.rangeLow)).toBe(true);
    expect(Number.isInteger(result.rangeHigh)).toBe(true);
    expect(Number.isInteger(result.midpoint)).toBe(true);
  });

  it("returns valuationAgeDays as a non-negative integer", () => {
    const result = estimateValueRange(baseInput());
    expect(result.dataFreshness.valuationAgeDays).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.dataFreshness.valuationAgeDays)).toBe(true);
  });
});

describe("Combined layers — integration", () => {
  it("applies all three layers in sequence", () => {
    const result = estimateValueRange({
      ratingValuation: {
        capitalValue: 800_000,
        valuationDate: new Date().toISOString().slice(0, 10),
        source: "LINZ_DVR",
      },
      regionalIndex: {
        region: "Wellington",
        percentChange: 5,
        indexDate: "2026-03-31",
      },
      comparable: {
        count: 12,
        spread: 0.07,
      },
      property: {
        category: PropertyCategory.RESIDENTIAL,
        suburb: "Karori",
        landAreaSqm: 600,
      },
    });
    expect(result.rangeLow).toBe(781_200);
    expect(result.rangeHigh).toBe(898_800);
    expect(result.midpoint).toBe(840_000);
    expect(result.confidence).toBe(ConfidenceLevel.HIGH);
    expect(result.adjustments).toHaveLength(3);
    expect(result.baseline.source).toBe("LINZ_DVR");
  });
});