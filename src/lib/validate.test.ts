import { describe, expect, it } from "vitest";
import type { Step } from "./lessons";
import { checkStep } from "./validate";
import { Workbook } from "./formula";
const sum: Step = { id: "test-sum", type: "formula", title: "Sum", scenario: "", prompt: "", cols: 3, rows: 7, workbook: { C2: "120", C3: "85", C4: "142", C5: "64", C6: "98" }, targetCells: ["C7"], validation: { mode: "value", acceptedValues: [509], requiredFunctions: ["SUM"] }, hints: ["", "", ""], solution: "=SUM(C2:C6)", explanation: "", commonMistakes: [{ pattern: "C2:C5", message: "Your range misses one store" }] };
describe("validation rules", () => {
  it("rejects hardcoded answers", () => expect(checkStep(sum, { ...sum.workbook, C7: "509" }).ok).toBe(false));
  it("accepts an alternative correct formula", () => expect(checkStep(sum, { ...sum.workbook, C7: "=SUM(C2:C4,C5:C6)" }).ok).toBe(true));
  it("diagnoses an off-by-one range", () => { const result = checkStep(sum, { ...sum.workbook, C7: "=SUM(C2:C5)" }); expect(result.ok).toBe(false); if (!result.ok) expect(result.diagnosis).toMatch(/misses one store/); });
  it("requires absolute references when asked", () => { const abs: Step = { ...sum, workbook: { C2: "120", H1: "0.1" }, targetCells: ["E2"], validation: { mode: "value", acceptedValues: [12], requireAbsolute: true } }; expect(checkStep(abs, { ...abs.workbook, E2: "=C2*H1" }).ok).toBe(false); });
  it("evaluates precedence correctly", () => expect(new Workbook({ A1: "=2+3*4^2" }).get("A1")).toBe(50));
  it("detects circular references", () => expect(new Workbook({ A1: "=B1", B1: "=A1" }).get("A1")).toBe("#CIRC!"));
});
