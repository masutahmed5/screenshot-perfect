import type { LessonContent, LessonContentStep } from "@/lib/lesson-schema";

// Test-only examples exercise the formula engine without publishing old lessons.
const sumStep = (id: string, cells: Record<string, number | string>, target: string, expected: number, solution: string): LessonContentStep => ({
  id, type: "formula", difficulty: "guided", prompt: "Calculate the total.",
  workbook: { named_ranges: {}, sheets: [{ name: "Sales", cells }] }, target_cells: [target],
  validation: { mode: "value", accepted_values: { [target]: expected }, accepted_patterns: [], required_functions: ["SUM"], forbid_hardcoded: true, recalc_variants: [{ change: { B5: 100 }, expect: { [target]: target === "B6" ? 470 : expected } }] },
  hints: ["Use SUM", "Select the range", solution], explanation: "The total uses the selected values.",
  common_mistakes: [{ pattern: "B2:B4", message: "Include Thursday: your range stops at Wednesday." }, { pattern: "wrong", message: "Check the range." }, { pattern: "missing", message: "Include all rows." }],
  engine_support: "supported", reference_solution: solution,
});
export const formulaLesson: LessonContent = {
  id: "L024", number: 24, track: "03", level: "beginner", title: "Formula test fixture", version_badge: null, legacy_number: null, estimated_minutes: 5,
  objectives: ["Add values"], about: "Formula engine fixture", syntax: "=SUM(range)", examples: [{ data: [[1]], formula: "=SUM(A1)", result: 1, why: "Adds values" }, { data: [[2]], formula: "=SUM(A1)", result: 2, why: "Adds values" }], watch_out: ["Check ranges"], recap: "Added values",
  steps: [sumStep("SUM1", { B2: 100, B3: 120, B4: 150, B5: 80 }, "B6", 450, "=SUM(B2:B5)"), sumStep("SUM2", { C2: 1, C3: 2, C4: 3, C5: 4, C6: 5, C8: 6 }, "C7", 21, "=SUM(C2:C6,C8)"), sumStep("SUM3", { D2: 10, D4: 20 }, "D6", 30, "=SUM(D2,D4)")],
};
export const referenceStep: LessonContentStep = {
  ...formulaLesson.steps[0], id: "REFERENCES", target_cells: ["C2"], reference_solution: "=A2*$F$1",
  workbook: { named_ranges: {}, sheets: [{ name: "Sales", cells: { A2: 2, A3: 3, F1: 10 } }] },
  validation: { mode: "value", accepted_values: { C2: 20 }, accepted_patterns: [], required_functions: [], forbid_hardcoded: true, recalc_variants: [{ change: { A2: 4 }, expect: { C2: 40 } }], fill_test: { range: "C2:C3", direction: "down" } },
};
