import { validateValuationInput } from "../validate";
import type { ValidationResult } from "../validate";

describe("validateValuationInput", () => {
  const validPayload = {
    ratingValuation: {
      capitalValue: 1_000_000,
      valuationDate: "2024-06-01",
      source: "COUNCIL_CV",
    },
    property: {
      category: "RESIDENTIAL",
    },
  };

  // Helper — extracts errors array from a failed validation.
  // Uses `'errors' in result` so TS narrows even if the union
  // isn't strictly discriminated by the `ok` field.
  function getErrors(result: ValidationResult): string[] {
    if ("errors" in result) return result.errors;
    throw new Error("Expected validation to fail");
  }

  it("accepts a minimal valid payload", () => {
    const result = validateValuationInput(validPayload);
    expect(result.ok).toBe(true);
  });

  it("accepts a fully-populated payload", () => {
    const full = {
      ...validPayload,
      ratingValuation: {
        ...validPayload.ratingValuation,
        landValue: 600_000,
        improvementValue: 400_000,
      },
      regionalIndex: {
        region: "Auckland",
        percentChange: 8.3,
        indexDate: "2026-03-31",
      },
      comparable: {
        count: 14,
        spread: 0.08,
      },
      property: {
        category: "RESIDENTIAL",
        suburb: "Mt Eden",
        landAreaSqm: 450,
      },
    };
    const result = validateValuationInput(full);
    expect(result.ok).toBe(true);
  });

  it("rejects null body", () => {
    const result = validateValuationInput(null);
    expect(result.ok).toBe(false);
    expect(getErrors(result)).toContain("Request body must be a JSON object.");
  });

  it("rejects non-object body", () => {
    const result = validateValuationInput("hello");
    expect(result.ok).toBe(false);
  });

  it("rejects missing ratingValuation", () => {
    const result = validateValuationInput({ property: { category: "RESIDENTIAL" } });
    expect(result.ok).toBe(false);
    expect(getErrors(result)[0]).toContain("ratingValuation is required");
  });

  it("rejects zero capitalValue", () => {
    const result = validateValuationInput({
      ...validPayload,
      ratingValuation: { ...validPayload.ratingValuation, capitalValue: 0 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid valuationDate", () => {
    const result = validateValuationInput({
      ...validPayload,
      ratingValuation: { ...validPayload.ratingValuation, valuationDate: "not-a-date" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = validateValuationInput({
      ...validPayload,
      ratingValuation: { ...validPayload.ratingValuation, source: "MAGIC" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects missing property", () => {
    const result = validateValuationInput({
      ratingValuation: validPayload.ratingValuation,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = validateValuationInput({
      ...validPayload,
      property: { category: "CASTLE" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects regionalIndex with empty region", () => {
    const result = validateValuationInput({
      ...validPayload,
      regionalIndex: { region: "", percentChange: 5, indexDate: "2026-03-31" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects regionalIndex with non-finite percentChange", () => {
    const result = validateValuationInput({
      ...validPayload,
      regionalIndex: { region: "Auckland", percentChange: Infinity, indexDate: "2026-03-31" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects comparable with negative count", () => {
    const result = validateValuationInput({
      ...validPayload,
      comparable: { count: -1 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects comparable with spread > 1", () => {
    const result = validateValuationInput({
      ...validPayload,
      comparable: { count: 5, spread: 1.5 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects comparable with spread = 0", () => {
    const result = validateValuationInput({
      ...validPayload,
      comparable: { count: 5, spread: 0 },
    });
    expect(result.ok).toBe(false);
  });

  it("returns all errors at once for multiple violations", () => {
    const result = validateValuationInput({
      ratingValuation: {
        capitalValue: -1,
        valuationDate: "nope",
        source: "MAGIC",
      },
      property: { category: "CASTLE" },
    });
    expect(result.ok).toBe(false);
    expect(getErrors(result).length).toBeGreaterThanOrEqual(3);
  });
});