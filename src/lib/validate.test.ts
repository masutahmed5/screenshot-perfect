import { describe, expect, it } from "vitest";
import { ALL_STEPS } from "./lessons";
import { checkStep } from "./validate";
import { Workbook } from "./formula";

describe("seeded lessons", () => {
  it("has at least 30 steps", () => expect(ALL_STEPS.length).toBeGreaterThanOrEqual(30));
  for (const s of ALL_STEPS) {
    it(`accepts the solution for ${s.lessonId}/${s.title}`, () => {
      const r = checkStep(s, { ...s.workbook, [s.targetCells[0]]: s.solution });
      expect(r.ok, r.message).toBe(true);
    });
  }
});

describe("validation rules", () => {
  const sum = ALL_STEPS.find((s) => s.title === "SUM a range")!;
  it("rejects hardcoded answers", () => expect(checkStep(sum, { ...sum.workbook, C7: "509" }).ok).toBe(false));
  it("accepts an alternative correct formula", () => expect(checkStep(sum, { ...sum.workbook, C7: "=SUM(C2:C4,C5:C6)" }).ok).toBe(true));
  it("diagnoses an off-by-one range", () => {
    const r = checkStep(sum, { ...sum.workbook, C7: "=SUM(C2:C5)" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.diagnosis).toMatch(/misses one store/);
  });
  it("requires absolute references when asked", () => {
    const abs = ALL_STEPS.find((s) => s.title === "Absolute references")!;
    expect(checkStep(abs, { ...abs.workbook, E2: "=C2*H1" }).ok).toBe(false);
  });
  it("evaluates precedence correctly", () => expect(new Workbook({ A1: "=2+3*4^2" }).get("A1")).toBe(50));
  it("detects circular references", () => expect(new Workbook({ A1: "=B1", B1: "=A1" }).get("A1")).toBe("#CIRC!"));
});
