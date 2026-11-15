import { lessonSchema, type LessonContent } from "./lesson-schema";

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
    return { ...example, data: typeof example.data === "string" ? [[example.data]] : example.data };
  }) : item.examples;
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