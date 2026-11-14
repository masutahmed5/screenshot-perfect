import { z } from "zod";

const cellValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.object({ formula: z.string() }),
  z.object({ date: z.string() }),
]);
const regexStringSchema = z.string().superRefine((pattern, ctx) => {
  try { new RegExp(pattern); }
  catch { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a valid regular expression." }); }
});

export const workbookSchema = z.object({
  sheets: z.array(z.object({
    name: z.string().min(1),
    cells: z.record(z.string(), cellValueSchema),
  })).min(1),
  named_ranges: z.record(z.string(), z.string()).default({}),
});

const formulaValidationSchema = z.object({
  mode: z.enum(["value", "formula_pattern", "multi_cell"]),
  accepted_values: z.record(z.string(), z.unknown()).default({}),
  accepted_patterns: z.array(regexStringSchema).default([]),
  required_functions: z.array(z.string()).default([]),
  forbid_hardcoded: z.boolean().default(true),
  recalc_variants: z.array(z.object({
    change: z.record(z.string(), cellValueSchema),
    expect: z.record(z.string(), z.unknown()),
  })).default([]),
  fill_test: z.object({
    range: z.string(),
    direction: z.enum(["down", "right"]),
  }).optional(),
});

export const shortcutValidationSchema = z.object({
  mode: z.literal("shortcut"),
  start_cell: z.string(),
  target: z.string(),
  accepted_sequences: z.object({
    windows: z.array(z.array(z.string()).min(1)).min(1),
    mac: z.array(z.array(z.string()).min(1)).min(1),
  }),
});

export const menuActionValidationSchema = z.object({
  mode: z.literal("state"),
  expect: z.object({
    type: z.string().min(1),
  }).catchall(z.unknown()),
});

export const mcqValidationSchema = z.object({
  mode: z.literal("mcq"),
  choices: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
  accepted_choice: z.string(),
});

export const scenarioValidationSchema = z.object({
  mode: z.literal("multi_cell"),
  accepted_values: z.record(z.string(), z.unknown()).refine((values) => Object.keys(values).length > 0),
  accepted_patterns: z.array(regexStringSchema).default([]),
  required_functions: z.array(z.string()).default([]),
  forbid_hardcoded: z.boolean().default(true),
  recalc_variants: z.array(z.object({
    change: z.record(z.string(), cellValueSchema),
    expect: z.record(z.string(), z.unknown()),
  })).default([]),
  fill_test: z.object({
    range: z.string(),
    direction: z.enum(["down", "right"]),
  }).optional(),
});

const lessonStepSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["formula", "shortcut", "fix_formula", "menu_action", "mcq", "scenario"]),
  difficulty: z.enum(["guided", "independent", "apply", "easy", "medium", "hard"]),
  prompt: z.string().min(1),
  workbook: workbookSchema,
  target_cells: z.array(z.string()).default([]),
  validation: z.union([
    formulaValidationSchema,
    shortcutValidationSchema,
    menuActionValidationSchema,
    mcqValidationSchema,
    scenarioValidationSchema,
  ]),
  hints: z.tuple([z.string(), z.string(), z.string()]),
  explanation: z.string().min(1),
  common_mistakes: z.array(z.object({
    pattern: regexStringSchema,
    message: z.string(),
  })).default([]),
  engine_support: z.enum(["supported", "needs_engine", "menu_only"]),
  reference_solution: z.union([z.string(), z.array(z.array(z.string()))]).optional(),
  scenario: z.string().optional(),
  accepted_sequences: z.object({
    windows: z.array(z.array(z.string()).min(1)).min(1),
    mac: z.array(z.array(z.string()).min(1)).min(1),
  }).optional(),
}).passthrough().superRefine((step, ctx) => {
  if (step.type === "formula" || step.type === "fix_formula") {
    if (step.target_cells.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["target_cells"], message: "Formula steps need at least one target cell." });
    }
    if (step.common_mistakes.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["common_mistakes"], message: "Formula steps need at least three common mistakes." });
    }
    if (step.validation.mode !== "value" && step.validation.mode !== "formula_pattern" && step.validation.mode !== "multi_cell") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validation", "mode"], message: "Formula steps need a formula validation mode." });
    }
    if (!("recalc_variants" in step.validation) || step.validation.recalc_variants.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validation", "recalc_variants"], message: "Formula steps need at least one recalculation variant." });
    }
  }
  if (step.type === "shortcut" && step.validation.mode !== "shortcut") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validation", "mode"], message: "Shortcut steps need shortcut validation." });
  }
  if (step.type === "menu_action" && step.validation.mode !== "state") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validation", "mode"], message: "Menu-action steps need state validation." });
  }
  if (step.type === "mcq" && step.validation.mode !== "mcq") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validation", "mode"], message: "MCQ steps need choice validation." });
  }
  if (step.type === "scenario" && step.validation.mode !== "multi_cell") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["validation", "mode"], message: "Scenario steps need multi-cell validation." });
  }
});

export const lessonSchema = z.object({
  id: z.string().regex(/^L\d{3}$/),
  number: z.number().int().min(1).max(120),
  track: z.string().regex(/^\d{2}$/),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  title: z.string().min(1),
  version_badge: z.union([z.literal("2019"), z.literal("2021"), z.literal("365"), z.null()]),
  legacy_number: z.number().int().positive().nullable(),
  estimated_minutes: z.number().positive(),
  objectives: z.array(z.string().min(1)).min(1),
  about: z.string().min(1),
  syntax: z.string().min(1),
  examples: z.array(z.object({
    data: z.array(z.array(cellValueSchema)),
    formula: z.string(),
    result: z.unknown(),
    why: z.string(),
  })).min(2).max(3),
  watch_out: z.array(z.string()).min(1),
  recap: z.string().min(1),
  steps: z.array(lessonStepSchema).min(1),
}).passthrough().superRefine((lesson, ctx) => {
  if (lesson.id !== `L${String(lesson.number).padStart(3, "0")}`) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["id"], message: "Lesson id must match its number." });
  }
});

export const lessonIndexEntrySchema = z.object({
  id: z.string().regex(/^L\d{3}$/),
  number: z.number().int().min(1).max(120),
  title: z.string().min(1),
  track: z.string().regex(/^\d{2}$/),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  version_badge: z.union([z.literal("2019"), z.literal("2021"), z.literal("365"), z.null()]),
  step_types: z.array(z.enum(["formula", "shortcut", "fix_formula", "menu_action", "mcq", "scenario"])),
});

export type LessonContent = z.infer<typeof lessonSchema>;
export type LessonContentStep = z.infer<typeof lessonStepSchema>;
export type LessonIndexEntry = z.infer<typeof lessonIndexEntrySchema>;
