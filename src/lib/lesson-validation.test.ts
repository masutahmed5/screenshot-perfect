import { describe, expect, it } from "vitest";
import { LESSON_INDEX } from "./lesson-index";
import { validateLessonStep } from "./lesson-validation";
import { loadContentLesson } from "./lesson-content";
import type { CellMap } from "./formula";
import type { LessonContentStep } from "./lesson-schema";

async function getStep(lessonId: string, stepIndex = 0) {
  const { lesson } = await loadContentLesson(lessonId);
  if (!lesson) throw new Error(`Missing lesson ${lessonId}`);
  const step = lesson.steps[stepIndex]!;
  const values = step.workbook.sheets[0]!.cells;
  const cells: CellMap = Object.fromEntries(Object.entries(values).map(([address, value]) => [
    address.toUpperCase(),
    value === null ? "" : typeof value === "object" ? ("formula" in value ? value.formula : value.date) : String(value),
  ]));
  return { step, cells };
}

describe("formula lesson validation", () => {
  it("accepts a correct value formula", async () => {
    const { step, cells } = await getStep("L024");
    cells.B6 = "=SUM(B2:B5)";
    expect(validateLessonStep(step, cells).status).toBe("correct");
  });

  it("rejects a hardcoded answer with the requested feedback", async () => {
    const { step, cells } = await getStep("L024");
    cells.B6 = "450";
    expect(validateLessonStep(step, cells)).toMatchObject({ status: "hardcoded", feedbackKey: "hardcoded" });
  });

  it("reports the specific common mistake", async () => {
    const { step, cells } = await getStep("L024");
    cells.B6 = "=SUM(B2:B4)";
    expect(validateLessonStep(step, cells).message).toContain("Include Thursday");
  });

  it("catches formulas that do not recalculate with changed inputs", async () => {
    const { step, cells } = await getStep("L024");
    cells.B6 = "=SUM(450)";
    expect(validateLessonStep(step, cells)).toMatchObject({ status: "hardcoded", feedbackKey: "recalculation-failed" });
  });

  it("checks shifted relative and fixed absolute references when filling", async () => {
    const { step, cells } = await getStep("L018", 1);
    cells.C2 = "=A2*$F$1";
    expect(validateLessonStep(step, cells).status).toBe("correct");
    cells.C2 = "=A$2*$F$1";
    expect(validateLessonStep(step, cells).feedbackKey).toBe("fill-test-failed");
  });

  it("supports formula-pattern and multi-cell validation modes", async () => {
    const { step, cells } = await getStep("L024");
    const formulaPatternStep = {
      ...step,
      validation: { ...step.validation, mode: "formula_pattern" as const, accepted_patterns: ["^=SUM\\(B2:B5\\)$"] },
    } as LessonContentStep;
    cells.B6 = "=SUM(B2:B5)";
    expect(validateLessonStep(formulaPatternStep, cells).status).toBe("correct");

    const multiCellStep = {
      ...step,
      target_cells: ["B6", "B7"],
      validation: { ...step.validation, mode: "multi_cell" as const, accepted_values: { B6: 450, B7: 450 } },
    } as LessonContentStep;
    cells.B7 = "=SUM(B2:B5)";
    expect(validateLessonStep(multiCellStep, cells).status).toBe("correct");
  });

  it("keeps the lesson index independent of loaded lesson content", () => {
    expect(LESSON_INDEX.map((entry) => entry.id)).toEqual(["L018", "L024", "L078"]);
  });
});
