import type { Lesson } from "./lessons";
import type { LessonContent } from "./lesson-schema";

/** Presentation adapter; original steps remain the authority for grading. */
export function structuredLegacy(lesson: Lesson, index: number): LessonContent {
  return {
    id: lesson.id,
    number: lesson.lessonNumber ?? index + 1,
    track: "00",
    level: index < 4 ? "beginner" : index < 7 ? "intermediate" : "advanced",
    title: lesson.title,
    version_badge: null,
    legacy_number: null,
    estimated_minutes: lesson.estimatedMinutes,
    objectives: lesson.objectives,
    about: lesson.summary,
    syntax: lesson.steps[0]?.solution ?? "",
    examples: lesson.steps.slice(0, 2).map((step) => ({
      data: Object.entries(step.workbook).map(([address, value]) => [address, value]),
      formula: step.solution,
      result: step.validation.acceptedValues[0] ?? "",
      why: step.explanation,
    })),
    watch_out: [...new Set(lesson.steps.flatMap((step) => step.commonMistakes?.map((mistake) => mistake.message) ?? []))],
    recap: lesson.summary,
    steps: lesson.steps.map((step) => ({
      id: step.id, type: "formula", difficulty: "guided", prompt: step.prompt,
      workbook: { sheets: [{ name: "Sheet1", cells: step.workbook }], named_ranges: {} },
      target_cells: step.targetCells, hints: step.hints, explanation: step.explanation,
      scenario: step.scenario, common_mistakes: step.commonMistakes ?? [],
      engine_support: "supported", reference_solution: step.solution,
      validation: {
        mode: "value", accepted_values: Object.fromEntries(step.targetCells.map((cell, i) => [cell, step.validation.acceptedValues[i]])),
        accepted_patterns: [], required_functions: step.validation.requiredFunctions ?? [],
        forbid_hardcoded: step.validation.forbidHardcoded ?? true, recalc_variants: [],
      },
    })),
  };
}