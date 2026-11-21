import { describe, expect, it } from "vitest";
import { loadContentLesson } from "./lesson-content";
import { validateLessonStep } from "./lesson-validation";
import { Workbook } from "./formula";

describe("case-insensitive formula answer checks", () => {
  it("accepts uppercase, lowercase, and mixed-case results, including recalculation", async () => {
    const { lesson } = await loadContentLesson("L040");
    const step = lesson?.steps.find((item) =>
      "accepted_values" in item.validation && item.validation.accepted_values["F3"] === "Critical",
    );
    if (!step || step.type !== "formula") throw new Error("Missing Critical/Low IFS step");
    const sheet = step.workbook.sheets[0];
    if (!sheet) throw new Error("Missing worksheet");
    const cells = Object.fromEntries(Object.entries(sheet.cells).map(([address, value]) => [
      address,
      value === null ? "" : typeof value === "object" ? ("formula" in value ? value.formula : value.date) : String(value),
    ]));
    for (const [critical, low, normal] of [
      ["critical", "low", "normal"],
      ["CRITICAL", "LOW", "NORMAL"],
      ["cRiTiCaL", "LoW", "nOrMaL"],
    ]) {
      cells["F3"] = `=IFS(B3<5,"${critical}",B3<15,"${low}",TRUE,"${normal}")`;
      expect(new Workbook(cells).get("F3")).toBe(critical);
      expect(validateLessonStep(step, cells)).toMatchObject({ status: "correct" });
    }
    cells["F3"] = '=IFS(B3<5,"wrong",B3<15,"low",TRUE,"Normal")';
    expect(validateLessonStep(step, cells)).toMatchObject({ status: "incorrect", feedbackKey: "value-mismatch" });
    cells["F3"] = '=IFS(B3<5,"critical",B3<15,"wrong",TRUE,"Normal")';
    expect(validateLessonStep(step, cells)).toMatchObject({ status: "hardcoded", feedbackKey: "recalculation-failed" });
  });
});