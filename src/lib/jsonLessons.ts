// Loads lesson JSON files from src/lessons/ at build time, validates them, and adapts them to the Lesson/Step model.
import { z } from "zod";
import type { Lesson, Step } from "./lessons";

const cellValue = z.union([z.number(), z.string(), z.boolean(), z.object({ date: z.string() }), z.object({ formula: z.string() })]);
const stepSchema = z.object({
  id: z.string(),
  type: z.string(),
  instruction: z.string(),
  formulaToType: z.string().optional(),
  sheet: z.object({ cells: z.record(cellValue).default({}), selected: z.string().optional() }),
  check: z.object({ type: z.string() }).passthrough(),
  commonMistakes: z.array(z.object({ formula: z.string().optional(), message: z.string() }).passthrough()).optional(),
  feedback: z.object({ correct: z.string(), incorrect: z.string() }),
  hint: z.string(),
  skippable: z.boolean().optional(),
}).passthrough();
export const lessonSchema = z.object({
  lessonNumber: z.number().int().min(1).max(85),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string(),
  exerciseType: z.string(),
  overview: z.object({ whatItsFor: z.string(), howItWorks: z.string() }).passthrough(),
  sheetDefaults: z.object({ columns: z.array(z.string()).min(1), rows: z.number().int().min(1).max(8) }).passthrough(),
  steps: z.array(stepSchema).min(1),
});
type JsonLesson = z.infer<typeof lessonSchema>;
type JsonStep = z.infer<typeof stepSchema>;

const formulaCheck = z.object({ type: z.literal("formula"), cell: z.string(), accepted: z.array(z.string()).min(1), expectedResult: z.unknown().optional() });

const toRaw = (v: z.infer<typeof cellValue>): string =>
  typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : typeof v === "number" ? String(v) : typeof v === "string" ? v : "formula" in v ? v.formula : v.date;

function adaptStep(js: JsonStep, lesson: JsonLesson, file: string): Step | null {
  if (js.type !== "type_formula" && js.type !== "fix_formula") {
    console.warn(`[lessons] ${file}: step ${js.id} has type "${js.type}", which isn't supported yet. Skipped.`);
    return null;
  }
  const c = formulaCheck.safeParse(js.check);
  if (!c.success) {
    console.warn(`[lessons] ${file}: step ${js.id} has an unsupported check (${js.check.type}). Skipped.`);
    return null;
  }
  const workbook = Object.fromEntries(Object.entries(js.sheet.cells).map(([k, v]) => [k.toUpperCase(), toRaw(v)]));
  return {
    id: `${lesson.slug}-${js.id}`,
    type: "formula",
    title: `Step ${js.id.split("-").pop()}`,
    scenario: "",
    prompt: js.instruction,
    formulaToType: js.formulaToType,
    cols: lesson.sheetDefaults.columns.length,
    rows: lesson.sheetDefaults.rows,
    workbook,
    targetCells: [c.data.cell.toUpperCase()],
    validation: { mode: "formula_pattern", acceptedValues: [] },
    accepted: c.data.accepted,
    exactMistakes: (js.commonMistakes ?? []).filter((m) => m.formula).map((m) => ({ formula: m.formula!, message: m.message })),
    incorrect: js.feedback.incorrect,
    hints: [js.hint, js.hint, c.data.accepted[0]!],
    solution: c.data.accepted[0]!,
    explanation: js.feedback.correct,
  };
}

export function adaptLesson(raw: unknown, file: string): Lesson | null {
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    console.error(`[lessons] ${file} is invalid and was skipped: ${issue?.path.join(".") || "root"}: ${issue?.message}`);
    return null;
  }
  const l = parsed.data;
  const steps = l.steps.map((s) => adaptStep(s, l, file)).filter((s): s is Step => !!s);
  if (!steps.length) { console.error(`[lessons] ${file} has no supported steps and was skipped.`); return null; }
  return { id: l.slug, track: `Lesson ${l.lessonNumber}`, title: l.title, summary: l.overview.whatItsFor, objectives: [l.overview.howItWorks], estimatedMinutes: steps.length, steps, lessonNumber: l.lessonNumber };
}

const files = import.meta.glob("../lessons/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
export const JSON_LESSONS: Lesson[] = Object.entries(files)
  .map(([path, data]) => adaptLesson(data, path.split("/").pop()!))
  .filter((l): l is Lesson => !!l)
  .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));

/** Trim, drop spaces and upper-case everything outside double quotes. */
export function normalizeFormula(f: string) {
  return f.trim().split('"').map((part, i) => (i % 2 ? part : part.replace(/\s+/g, "").toUpperCase())).join('"');
}
