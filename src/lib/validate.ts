import { collectFunctions, collectRefs, formatValue, parse, Workbook, isError, type CellMap, type Scalar } from "./formula";
import type { Step } from "./lessons";

export type CheckResult =
  | { ok: true; message: string; value: string }
  | { ok: false; message: string; value?: string; diagnosis?: string };

const near = (a: Scalar, b: Scalar) =>
  typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-6 : String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

export function checkStep(step: Step, cells: CellMap): CheckResult {
  const v = step.validation;
  const targets = step.targetCells;
  const wb = new Workbook(cells);
  for (const [i, target] of targets.entries()) {
    const raw = (cells[target] ?? "").trim();
    if (!raw) return { ok: false, message: `Cell ${target} is empty. Type your formula there, starting with =.` };
    const isFormula = raw.startsWith("=");
    if (v.forbidHardcoded !== false && !isFormula)
      return { ok: false, message: "That's a typed value, not a formula.", diagnosis: "Start with = so the answer updates when the data changes." };

    let fns = new Set<string>();
    let refs: string[] = [];
    if (isFormula) {
      try {
        const ast = parse(raw.slice(1));
        fns = collectFunctions(ast);
        refs = collectRefs(ast);
      } catch (e) {
        return { ok: false, message: "Excel can't read this formula yet.", diagnosis: (e as Error).message.replace("NAME:", "Unknown name: ") };
      }
      if (refs.length === 0 && v.forbidHardcoded !== false)
        return { ok: false, message: "Your formula doesn't reference any cells.", diagnosis: "Point to the data (like B2:B6) instead of typing numbers in." };
    }

    const missing = (v.requiredFunctions ?? []).filter((f) => !fns.has(f));
    if (missing.length) return { ok: false, message: `Use ${missing.join(", ")} for this one.`, diagnosis: `Your formula works without ${missing[0]}, but this exercise practices it.` };

    if (v.requireAbsolute && !/\$[A-Z]+\$\d+/i.test(raw))
      return { ok: false, message: "Lock the reference with $ signs.", diagnosis: "Without $, the reference shifts when the formula is copied. Press F4 on the reference." };

    const got = wb.get(target);
    const expected = v.acceptedValues[i];
    if (!near(got, expected)) {
      const mistake = step.commonMistakes?.find((m) => new RegExp(m.pattern, "i").test(raw));
      const diag =
        mistake?.message ??
        (isError(got)
          ? errorHint(String(got))
          : typeof got === "string" && typeof expected === "number" && !isNaN(Number(got))
            ? "The result is text that looks like a number. Convert it with VALUE()."
            : typeof got === "number" && typeof expected === "number" && rangeOffByOne(refs)
              ? "Check your range. It may stop one row short or start one row late."
              : undefined);
      return { ok: false, message: `${target} shows ${formatValue(got) || "nothing"}, but it should be ${formatValue(expected)}.`, value: formatValue(got), diagnosis: diag };
    }
  }
  return { ok: true, message: step.explanation, value: formatValue(wb.get(targets[0])) };
}

function rangeOffByOne(refs: string[]) {
  return refs.some((r) => r.includes(":"));
}

export function errorHint(e: string) {
  switch (e) {
    case "#N/A": return "#N/A means the lookup didn't find a match. Check spelling and use exact match (FALSE or 0).";
    case "#DIV/0!": return "You're dividing by zero or by an empty cell.";
    case "#NAME?": return "Excel doesn't recognize a name. Check the function's spelling.";
    case "#REF!": return "The reference points outside the range, such as a column number larger than the table.";
    case "#CIRC!": return "The formula refers to itself. That's a circular reference.";
    default: return "A value has the wrong type, such as text where a number is expected.";
  }
}
