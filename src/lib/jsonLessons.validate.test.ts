import { describe, expect, it } from "vitest";
import { adaptLesson, JSON_TRACK_LESSONS } from "./jsonLessons";
import { loadContentLesson } from "./lesson-content";
import { structuredLegacy } from "./structured-legacy";
import { LESSONS, getLesson } from "./lessons";
import { checkStep } from "./validate";

describe("JSON track loading", () => {
  it("loads all 23 numbered Track 01 and 02 lessons from the source arrays", () => {
    expect(JSON_TRACK_LESSONS.map((lesson) => lesson.id)).toEqual(Array.from({ length: 23 }, (_, i) => `L${String(i + 1).padStart(3, "0")}`));
    expect(JSON_TRACK_LESSONS.slice(0, 13).every((lesson) => lesson.track === "01")).toBe(true);
    expect(JSON_TRACK_LESSONS.slice(13).every((lesson) => lesson.track === "02")).toBe(true);
  });
  it("retains MCQ answers and shortcut sequences from the export", async () => {
    const first = await loadContentLesson("L001");
    expect(first.lesson?.steps[0]?.validation).toMatchObject({ mode: "state", expect: { type: "value", cells: { B4: 150 } } });
    expect(first.lesson?.estimated_minutes).toBe(5);
    expect(first.lesson?.examples[0]?.data[3]).toEqual(["Wed", 150]);
    const second = await loadContentLesson("L002");
    expect(second.lesson?.steps[0]?.validation).toMatchObject({ mode: "shortcut", target: "C2", accepted_sequences: { windows: [["Tab", "Tab"]], mac: [["Tab", "Tab"]] } });
  });
  it("keeps original legacy grading and step IDs in the structured view", () => {
    const lesson = adaptLesson({ lessonNumber: 2, slug: "fixture", title: "Fixture", exerciseType: "formula", overview: { whatItsFor: "Test", howItWorks: "Test" }, sheetDefaults: { columns: ["A", "B", "C", "D", "E"], rows: 4 }, steps: [{ id: "s1", type: "type_formula", instruction: "Multiply", sheet: { cells: { C2: 120, D2: 4.5 } }, check: { type: "formula", cell: "E2", accepted: ["=C2*D2"] }, feedback: { correct: "Correct", incorrect: "Try again" }, hint: "Multiply" }] }, "fixture.json");
    if (!lesson) throw new Error("Missing fixture lesson");
    const first = lesson.steps[0];
    if (!first) throw new Error("Missing basics step");
    expect(structuredLegacy(lesson, 1).steps[0]?.id).toBe(first.id);
    expect(checkStep(first, { ...first.workbook, E2: "=C2*D2" }).ok).toBe(true);
    expect(checkStep(first, { ...first.workbook, E2: "=C2+D2" }).ok).toBe(false);
  });
  it("continues accepting single-object formula lessons", () => {
    const lesson = adaptLesson({ lessonNumber: 6, slug: "fixture", title: "Fixture", exerciseType: "formula", overview: { whatItsFor: "Test", howItWorks: "Test" }, sheetDefaults: { columns: ["A", "B"], rows: 4 }, steps: [{ id: "s1", type: "type_formula", instruction: "Add", sheet: { cells: { A1: 2 } }, check: { type: "formula", cell: "B1", accepted: ["=A1+1"] }, feedback: { correct: "Correct", incorrect: "Try again" }, hint: "Add one" }] }, "fixture.json");
    expect(lesson?.steps[0]?.accepted).toEqual(["=A1+1"]);
  });
  it("removes all bundled legacy lessons from public practice", () => {
    expect(LESSONS).toHaveLength(0);
    expect(getLesson("basics")).toBeUndefined();
  });
  it("skips invalid single-object lesson files without throwing", () => {
    expect(adaptLesson({ title: "broken" }, "broken.json")).toBeNull();
  });
});