import { describe, expect, it } from "vitest";
import { lessonSchema } from "./lesson-schema";
import { LESSON_INDEX } from "./lesson-index";
import { validateLessonStep } from "./lesson-validation";
import type { CellMap } from "./formula";
import type { LessonContent } from "./lesson-schema";

const files = import.meta.glob("../../content/lessons/track-*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const lessons = Object.entries(files).flatMap(([file, value]) => {
  if (!Array.isArray(value)) throw new Error(`${file}: expected an array of lessons`);
  return value.map((raw, index) => {
    const parsed = lessonSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`${file}[${index}]: ${parsed.error.message}`);
    return parsed.data;
  });
});

function cellsFor(lesson: LessonContent, stepIndex: number): CellMap {
  const step = lesson.steps[stepIndex]!;
  const cells = step.workbook.sheets[0]!.cells;
  return Object.fromEntries(Object.entries(cells).map(([address, value]) => [
    address.toUpperCase(),
    value === null ? "" : typeof value === "object" ? ("formula" in value ? value.formula : value.date) : String(value),
  ]));
}

describe("track lesson content", () => {
  it("contains unique ids and numbers without duplicates", () => {
    expect(lessons.length).toBeGreaterThan(0);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(lessons.length);
    expect(new Set(lessons.map((lesson) => lesson.number)).size).toBe(lessons.length);
    if (lessons.length === 120) {
      expect(lessons.map((lesson) => lesson.number).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 120 }, (_, index) => index + 1),
      );
    }
  });

  it("uses valid supported step types in the lesson set", () => {
    const types = new Set(lessons.flatMap((lesson) => lesson.steps.map((step) => step.type)));
    const allowed = new Set(["formula", "fix_formula", "shortcut", "menu_action", "mcq", "scenario"]);
    for (const t of types) {
      expect(allowed.has(t)).toBe(true);
    }
    if (lessons.length === 120) {
      expect(types).toEqual(allowed);
    }
  });

  it("verifies quality rules: 3 hints, 3 common mistakes, and recalc variants per formula step", () => {
    for (const lesson of lessons) {
      for (const step of lesson.steps) {
        expect(step.hints).toHaveLength(3);
        if (step.type === "formula" || step.type === "fix_formula") {
          expect(step.common_mistakes.length).toBeGreaterThanOrEqual(3);
          expect("recalc_variants" in step.validation && step.validation.recalc_variants.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("keeps the lightweight index aligned with lesson content", () => {
    expect(LESSON_INDEX).toHaveLength(lessons.length);
    for (const lesson of lessons) {
      const entry = LESSON_INDEX.find((item) => item.id === lesson.id);
      expect(entry).toMatchObject({
        number: lesson.number,
        title: lesson.title,
        track: lesson.track,
        level: lesson.level,
        version_badge: lesson.version_badge,
        step_types: [...new Set(lesson.steps.map((step) => step.type))],
      });
    }
  });

  it("accepts every hidden reference solution through the validation engine", () => {
    for (const lesson of lessons) {
      lesson.steps.forEach((step, index) => {
        if (typeof step.reference_solution !== "string") return;
        const cells = cellsFor(lesson, index);
        cells[step.target_cells[0]!] = step.reference_solution;
        const result = validateLessonStep(step, cells);
        expect(result.status, `${lesson.id}/${step.id}: ${result.message}`).toBe("correct");
      });
    }
  });
});
