import { lessonSchema, type LessonContent } from "./lesson-schema";
import { indexToCol, parseRef } from "./formula";

/** Normalize exported track aliases without weakening the content schema. */
export function adaptTrackLesson(raw: unknown, file: string): LessonContent | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  // Checkpoints are not numbered catalog lessons; retain the source untouched.
  if (item.kind === "checkpoint") return null;
  const steps = Array.isArray(item.steps) ? item.steps.map((rawStep) => {
    const step = rawStep as Record<string, unknown>;
    const validation = step.validation as Record<string, unknown>;
    const expected = validation.expected as Record<string, unknown> | undefined;
    const options = validation.options as Array<{ id: string; text: string }> | undefined;
    const hints = Array.isArray(step.hints) ? step.hints : [];
    return {
      ...step,
      hints: [hints[0] ?? "", hints[1] ?? "", hints[2] ?? ""],
      validation: {
        ...validation,
        ...(validation.mode === "mcq" && options ? {
          choices: options.map((option) => ({ id: option.id, label: option.text })),
          accepted_choice: validation.correct_option_id,
        } : {}),
        ...(validation.mode === "shortcut" ? { target: validation.target ?? expected?.cell ?? expected?.range ?? "A1" } : {}),
        ...(validation.mode === "state" ? { expect: validation.expect ?? expected } : {}),
      },
    };
  }) : item.steps;
  const examples = Array.isArray(item.examples) ? item.examples.map((rawExample) => {
    const example = rawExample as Record<string, unknown>;
    const cells = example.cells && typeof example.cells === "object" ? example.cells as Record<string, unknown> : null;
    const addresses = cells ? Object.keys(cells).map(parseRef).filter((ref) => ref !== null) : [];
    const rows = Math.max(1, ...addresses.map((ref) => ref.row));
    const cols = Math.max(1, ...addresses.map((ref) => ref.col + 1));
    const data = cells ? Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => cells[`${indexToCol(col)}${row + 1}`] ?? null)) : example.data;
    return { ...example, data: typeof data === "string" ? [[data]] : data };
  }).slice(0, 3) : item.examples;
  const parsed = lessonSchema.safeParse({
    ...item,
    track: typeof item.track === "string" ? item.track.slice(0, 2) : item.track,
    syntax: item.syntax ?? "—",
    examples,
    steps,
  });
  if (parsed.success) return parsed.data;
  console.error(`[lessons] ${file}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  return null;
}