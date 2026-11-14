import { describe, expect, it } from "vitest";
import { cycleReference } from "./Sheet";

describe("formula reference cycling", () => {
  it("cycles relative and absolute references in Excel F4 order", () => {
    let formula = "=A1";
    for (const expected of ["=$A$1", "=A$1", "=$A1", "=A1"]) {
      const next = cycleReference(formula, formula.length);
      expect(next).not.toBeNull();
      formula = next!.formula;
      expect(formula).toBe(expected);
    }
  });

  it("does not toggle cell-like text inside a string literal", () => {
    expect(cycleReference('=A1&"B2"', 6)).toBeNull();
  });
});
