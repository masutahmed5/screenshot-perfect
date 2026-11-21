import { describe, expect, it } from "vitest";
import { ERR, SUPPORTED_FUNCTIONS, Workbook } from "./formula";
import { loadContentLesson } from "./lesson-content";
import { validateLessonStep } from "./lesson-validation";

const requiredFunctions = [
  "MEDIAN", "MODE", "LARGE", "SMALL", "ROUNDUP", "ROUNDDOWN", "FLOOR", "CEILING", "ODD", "EVEN",
  "IFS", "SWITCH", "XOR", "ISBLANK", "ISERROR", "ISERR", "ISNA", "ISNUMBER", "ISTEXT", "ISNONTEXT",
  "ISLOGICAL", "ISFORMULA", "IFNA", "AGGREGATE", "HLOOKUP", "TEXT", "CLEAN", "TEXTBEFORE", "TEXTAFTER",
  "DATE", "TODAY", "DATEDIF", "DAYS", "WORKDAY", "NETWORKDAYS", "EOMONTH", "AVERAGEIFS", "MAXIFS",
  "MINIFS", "SUMPRODUCT", "UNIQUE", "FILTER", "SORT", "SORTBY", "LET",
];

describe("lesson formula engine coverage", () => {
  it("supports the required lesson function set", () => {
    expect(SUPPORTED_FUNCTIONS).toEqual(expect.arrayContaining(requiredFunctions));
  });

  it("evaluates IFS score bands and skips unused result branches", () => {
    const formula = '=IFS(B3>=90,"A",B3>=75,"B",B3>=60,"C",TRUE,"Fail")';
    expect(new Workbook({ B3: "82", F3: formula }).get("F3")).toBe("B");
    expect(new Workbook({ B3: "92", F3: formula }).get("F3")).toBe("A");
    expect(new Workbook({}).compute("=IFS(TRUE,7,FALSE,1/0)")).toBe(7);
    expect(new Workbook({}).compute("=IFS(FALSE,7)")).toBe(ERR.NA);
    expect(new Workbook({}).compute("=IFS(TRUE,7,FALSE)")).toBe(ERR.VALUE);
  });

  it("evaluates SWITCH matches, defaults, and missing matches", () => {
    const formula = '=SWITCH(A3,"N","North","S","South","Unknown")';
    expect(new Workbook({ A3: "N", F3: formula }).get("F3")).toBe("North");
    expect(new Workbook({ A3: "S", F3: formula }).get("F3")).toBe("South");
    expect(new Workbook({ A3: "X", F3: formula }).get("F3")).toBe("Unknown");
    expect(new Workbook({}).compute("=SWITCH(1,1,7,2,1/0)")).toBe(7);
    expect(new Workbook({}).compute("=SWITCH(3,1,7)")).toBe(ERR.NA);
    expect(new Workbook({}).compute("=SWITCH(1,1)")).toBe(ERR.VALUE);
  });

  it("evaluates LET bindings sequentially without leaking their scope", () => {
    const workbook = new Workbook({ A1: "5" });
    expect(workbook.compute("=LET(amount,A1*2,total,amount+3,total)")).toBe(13);
    expect(workbook.compute("=amount")).toBe(ERR.NAME);
    expect(workbook.compute("=LET(amount,5)")).toBe(ERR.VALUE);
    expect(workbook.compute("=NOT_A_FUNCTION(1)")).toBe(ERR.NAME);
  });

  for (const lessonId of ["L040", "L041"]) {
    it(`accepts all five reference answers in ${lessonId}, including recalculation checks`, async () => {
      const { lesson } = await loadContentLesson(lessonId);
      if (!lesson) throw new Error(`Missing lesson ${lessonId}`);
      expect(lesson.steps).toHaveLength(5);
      for (const step of lesson.steps) {
        if (step.type !== "formula") throw new Error(`Unexpected step ${step.id}`);
        const sheet = step.workbook.sheets[0];
        const target = step.target_cells[0];
        const solutions = step.reference_solutions;
        const solution = Array.isArray(solutions) ? solutions[0] : undefined;
        if (!sheet || !target || typeof solution !== "string" || !solution) throw new Error(`Missing answer data for ${step.id}`);
        const cells = Object.fromEntries(Object.entries(sheet.cells).map(([address, value]) => [
          address,
          value === null ? "" : typeof value === "object" ? ("formula" in value ? value.formula : value.date) : String(value),
        ]));
        cells[target] = solution;
        expect(validateLessonStep(step, cells), step.id).toMatchObject({ status: "correct" });
      }
    });
  }
});
