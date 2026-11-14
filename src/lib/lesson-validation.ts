import {
  addr,
  collectFunctions,
  ERR,
  formatValue,
  isError,
  parseRef,
  parse,
  SUPPORTED_FUNCTIONS,
  Workbook,
  type CellMap,
  type Scalar,
} from "./formula";
import type { LessonContentStep } from "./lesson-schema";
import { errorHint } from "./validate";

export type LessonCheckResult = {
  status: "correct" | "incorrect" | "error" | "hardcoded";
  feedbackKey: string;
  message: string;
  matchedMistake?: string;
  perCell?: Record<string, boolean>;
};

const near = (actual: Scalar, expected: unknown) => {
  if (typeof actual === "number" && typeof expected === "number") return Math.abs(actual - expected) < 1e-6;
  return String(actual ?? "").trim() === String(expected ?? "").trim();
};

const normalize = (formula: string) =>
  formula.trim().split('"').map((part, index) => index % 2 ? part : part.replace(/\s+/g, "").toUpperCase()).join('"');

function matchesPattern(formula: string, patterns: string[]) {
  return patterns.some((pattern) => new RegExp(pattern, "i").test(formula));
}

export function missingEngineFunctions(step: LessonContentStep) {
  if (!("required_functions" in step.validation)) return [];
  const supported = new Set(SUPPORTED_FUNCTIONS);
  return step.validation.required_functions.filter((fn) => !supported.has(fn.toUpperCase()));
}

function addressRange(range: string, direction: "down" | "right") {
  const [start, end] = range.split(":");
  if (!start || !end) return [];
  const a = parseRef(start), b = parseRef(end);
  if (!a || !b) return [];
  if (direction === "down" && a.col !== b.col) return [];
  if (direction === "right" && a.row !== b.row) return [];
  const cells: string[] = [];
  if (direction === "down") {
    for (let row = a.row; row <= b.row; row++) cells.push(addr(a.col, row));
  } else {
    for (let col = a.col; col <= b.col; col++) cells.push(addr(col, a.row));
  }
  return cells;
}

export function shiftFormula(formula: string, colDelta: number, rowDelta: number) {
  const textParts = formula.split('"');
  return textParts.map((part, index) => {
    if (index % 2) return part;
    return part.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/gi, (whole, colLock: string, col: string, rowLock: string, row: string) => {
      const parsed = parseRef(`${col}${row}`);
      if (!parsed) return whole;
      const nextCol = parsed.col + (colLock ? 0 : colDelta);
      const nextRow = parsed.row + (rowLock ? 0 : rowDelta);
      if (nextCol < 0 || nextRow < 0) return ERR.REF;
      const next = addr(nextCol, nextRow);
      const match = /^([A-Z]+)(\d+)$/.exec(next)!;
      return `${colLock}${match[1]}${rowLock}${match[2]}`;
    });
  }).join('"');
}

function filledValues(step: LessonContentStep, cells: CellMap, sourceFormula: string) {
  const fill = step.validation;
  if (!("fill_test" in fill) || !fill.fill_test) return null;
  const addresses = addressRange(fill.fill_test.range, fill.fill_test.direction);
  const source = step.target_cells[0];
  if (!source || addresses.length < 2 || !addresses.includes(source)) return null;
  const origin = parseRef(source)!;
  const filled = { ...cells };
  for (const target of addresses) {
    const position = parseRef(target)!;
    filled[target] = shiftFormula(
      sourceFormula,
      fill.fill_test.direction === "right" ? position.col - origin.col : 0,
      fill.fill_test.direction === "down" ? position.row - origin.row : 0,
    );
  }
  const workbook = new Workbook(filled);
  return Object.fromEntries(addresses.map((target) => [target, workbook.get(target)]));
}

function expectedFillValues(step: LessonContentStep, cells: CellMap) {
  const solution = step.reference_solution;
  const sourceFormula = typeof solution === "string" ? solution : undefined;
  if (sourceFormula) return filledValues(step, cells, sourceFormula);
  if (!("fill_test" in step.validation) || !step.validation.fill_test) return null;
  const addresses = addressRange(step.validation.fill_test.range, step.validation.fill_test.direction);
  const accepted = "accepted_values" in step.validation ? step.validation.accepted_values : {};
  return Object.fromEntries(addresses.map((target) => [target, accepted[target]]));
}

function compareExpected(step: LessonContentStep, cells: CellMap, expected: Record<string, unknown>) {
  const workbook = new Workbook(cells);
  const perCell: Record<string, boolean> = {};
  for (const [target, value] of Object.entries(expected)) perCell[target] = near(workbook.get(target), value);
  return perCell;
}

export function validateLessonStep(step: LessonContentStep, learnerCells: CellMap): LessonCheckResult {
  const validation = step.validation;
  if (!("required_functions" in validation)) {
    return { status: "error", feedbackKey: "unsupported-step", message: "This step needs a player that is not available yet." };
  }

  const formulas = step.target_cells.map((target) => (learnerCells[target] ?? "").trim());
  const emptyIndex = formulas.findIndex((value) => !value);
  if (emptyIndex >= 0) {
    const target = step.target_cells[emptyIndex]!;
    return { status: "incorrect", feedbackKey: "empty-cell", message: `Cell ${target} is empty. Enter a formula there.` };
  }

  if (validation.forbid_hardcoded && formulas.some((formula) => !formula.startsWith("="))) {
    return {
      status: "hardcoded",
      feedbackKey: "hardcoded",
      message: "That number is right, but it will not update. Use a formula that reads the cells.",
    };
  }

  const unsupported = missingEngineFunctions(step);
  if (unsupported.length) {
    return { status: "error", feedbackKey: "unsupported-function", message: `Preview mode: ${unsupported.join(", ")} is not available in the spreadsheet engine yet.` };
  }
  const required = validation.required_functions.map((fn) => fn.toUpperCase());
  const actualFunctions = new Set<string>();
  for (const formula of formulas) {
    if (!formula.startsWith("=")) continue;
    try {
      collectFunctions(parse(formula.slice(1)), actualFunctions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "error",
        feedbackKey: "formula-syntax",
        message: message.startsWith("NAME:")
          ? `Excel does not recognize ${message.slice(5)} as a function or cell reference.`
          : "Excel can't read this formula yet. Check the function name and punctuation.",
      };
    }
  }
  const missingFunctions = required.filter((fn) => !actualFunctions.has(fn));
  if (missingFunctions.length) {
    return { status: "incorrect", feedbackKey: "required-function", message: `Use ${missingFunctions.join(", ")} in your formula.` };
  }
  if (validation.mode === "formula_pattern" && validation.accepted_patterns.length > 0 &&
      !formulas.every((formula) => matchesPattern(formula, validation.accepted_patterns))) {
    return { status: "incorrect", feedbackKey: "formula-pattern", message: "The result is right, but the formula needs to follow the requested pattern." };
  }

  const expected = validation.accepted_values;
  const perCell = compareExpected(step, learnerCells, expected);
  const failed = Object.entries(perCell).filter(([, correct]) => !correct).map(([target]) => target);
  if (failed.length) {
    const normalized = formulas.map(normalize);
    const mistake = step.common_mistakes.find((item) => matchesPattern(normalized.join(" "), [item.pattern]));
    const workbook = new Workbook(learnerCells);
    const first = failed[0]!;
    const actual = workbook.get(first);
    if (isError(actual)) {
      return { status: "error", feedbackKey: "formula-error", message: `${first}: ${errorHint(actual)}`, perCell };
    }
    return {
      status: "incorrect",
      feedbackKey: mistake ? "common-mistake" : "value-mismatch",
      message: mistake?.message ?? `${first} shows ${formatValue(actual) || "nothing"}, but should be ${formatValue(expected[first] as Scalar) || "blank"}. Check the formula and its references.`,
      ...(mistake ? { matchedMistake: mistake.pattern } : {}),
      perCell,
    };
  }

  for (const variant of validation.recalc_variants) {
    const changed = { ...learnerCells, ...Object.fromEntries(Object.entries(variant.change).map(([cell, value]) => [cell, String(value ?? "")])) };
    const variantCells = compareExpected(step, changed, variant.expect);
    if (Object.values(variantCells).some((correct) => !correct)) {
      return {
        status: "hardcoded",
        feedbackKey: "recalculation-failed",
        message: "That answer does not update when the source data changes. Use cell references in your formula.",
        perCell: variantCells,
      };
    }
  }

  if ("fill_test" in validation && validation.fill_test) {
    const formula = formulas[0]!;
    const got = filledValues(step, learnerCells, formula);
    const wanted = expectedFillValues(step, learnerCells);
    if (!got || !wanted) {
      return { status: "error", feedbackKey: "invalid-fill-test", message: "This fill-down check is not configured correctly." };
    }
    const fillResults = Object.fromEntries(Object.entries(wanted).map(([cell, value]) => [cell, near(got[cell] as Scalar, value)]));
    if (Object.values(fillResults).some((correct) => !correct)) {
      return { status: "incorrect", feedbackKey: "fill-test-failed", message: "The formula does not fill correctly. Check which references should move and which should stay fixed.", perCell: fillResults };
    }
  }

  return { status: "correct", feedbackKey: "correct", message: step.explanation, perCell };
}
