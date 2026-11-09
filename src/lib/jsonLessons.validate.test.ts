import { describe, expect, it } from "vitest";
import { adaptLesson, JSON_LESSONS } from "./jsonLessons";
import { checkStep } from "./validate";
import { Workbook, formatValue } from "./formula";

const lesson = (id: string) => JSON_LESSONS.find((l) => l.id === id)!;
const run = (lid: string, n: number, f: string) => {
  const s = lesson(lid).steps[n]!;
  const cells = { ...s.workbook, [s.targetCells[0]!]: f };
  return { r: checkStep(s, cells), v: formatValue(new Workbook(cells).get(s.targetCells[0]!)) };
};

describe("JSON lessons", () => {
  it("loads JSON lessons sorted by lesson number", () => {
    expect(JSON_LESSONS.map((l) => l.id)).toEqual(["count-function", "true-and-false", "if-function"]);
  });
  it("lesson 6 correct answers and results", () => {
    const cases: [number, string, string][] = [[0, "=A2>B2", "TRUE"], [1, "=A2>=B2", "TRUE"], [2, '=A2="Approved"', "TRUE"], [3, '=A2<>"Cancelled"', "TRUE"], [4, "=B2>A2", "FALSE"]];
    for (const [n, f, v] of cases) { const x = run("true-and-false", n, f); expect(x.r.ok).toBe(true); expect(x.v).toBe(v); }
  });
  it("lesson 6 mistake messages", () => {
    expect(run("true-and-false", 0, "=A2<B2").r.message).toBe("That asks if the invoice is smaller. Use > for bigger.");
    expect(run("true-and-false", 4, "=A2>B2").r.message).toBe("That asks the opposite question. Is B2 bigger than A2?");
    expect(run("true-and-false", 2, "=A2=Approved").r.message).toBe("Put Approved inside quotation marks.");
  });
  it("lesson 7 correct answers and results", () => {
    const cases: [number, string, string][] = [[0, '=IF(A2>=50,"Pass","Fail")', "Pass"], [1, "=IF(A2>=10000,500,0)", "500"], [2, "=IF(A2>=1000,A2*0.9,A2)", "1800"], [3, '=IF(A2="Shipped","On its way","Waiting")', "On its way"], [4, '=IF(A2>30,"Overdue","OK")', "OK"]];
    for (const [n, f, v] of cases) { const x = run("if-function", n, f); expect(x.r.ok).toBe(true); expect(x.v).toBe(v); }
  });
  it("lesson 7 trap shows Overdue and the trap message", () => {
    const x = run("if-function", 4, '=IF(A2>=30,"Overdue","OK")');
    expect(x.r.ok).toBe(false); expect(x.v).toBe("Overdue");
    expect(x.r.message).toBe("Exactly 30 days is not more than 30. Use > instead of >=.");
  });
  it("ignores case and spaces outside quotes", () => {
    expect(run("if-function", 0, '=if(a2>=50, "Pass", "Fail")').r.ok).toBe(true);
  });
  it("skips an invalid lesson file without throwing", () => {
    expect(adaptLesson({ title: "broken" }, "lesson-99-broken.json")).toBeNull();
  });
});
