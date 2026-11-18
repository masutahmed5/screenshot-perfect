import type { CellMap, Scalar } from "./formula";
import { JSON_LESSONS } from "./jsonLessons";

export type Step = {
  id: string;
  type: "formula";
  title: string;
  scenario: string;
  prompt: string;
  cols: number;
  rows: number;
  workbook: CellMap;
  targetCells: string[];
  validation: { mode: "value" | "formula_pattern"; acceptedValues: Scalar[]; requiredFunctions?: string[]; forbidHardcoded?: boolean; requireAbsolute?: boolean };
  hints: [string, string, string];
  solution: string;
  explanation: string;
  commonMistakes?: { pattern: string; message: string }[];
  // JSON lessons: exact formula grading
  formulaToType?: string;
  accepted?: string[];
  exactMistakes?: { formula: string; message: string }[];
  incorrect?: string;
};
export type Lesson = { id: string; track: string; title: string; summary: string; objectives: string[]; estimatedMinutes: number; steps: Step[]; lessonNumber?: number };

// Legacy-format JSON imports remain supported; bundled old lessons are no longer published.
export const LESSONS: Lesson[] = [...JSON_LESSONS];
export const ALL_STEPS = LESSONS.flatMap((l) => l.steps.map((s) => ({ ...s, lessonId: l.id })));
export const getLesson = (id: string) => LESSONS.find((l) => l.id === id);
