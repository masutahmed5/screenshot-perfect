import { beforeEach, describe, expect, it } from "vitest";
import { recordLessonProgress, resetProgress } from "./progress";

describe("multi-sheet lesson progress", () => {
  const values = new Map<string, string>();
  const storage = {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    storage.clear();
    resetProgress();
  });

  it("merges edits for each sheet in a saved lesson workbook", () => {
    recordLessonProgress("L001", {
      status: "in_progress",
      current_step: "L001-S1",
      workbooks: { "L001-S1": { Orders: { A1: "2" } } },
    });
    recordLessonProgress("L001", {
      status: "in_progress",
      current_step: "L001-S1",
      workbooks: { "L001-S1": { Inputs: { B2: "0.2" } } },
    });

    const saved = JSON.parse(values.get("gridwise.progress.v1") ?? "{}");
    expect(saved.lessonRuns.L001.workbooks["L001-S1"]).toEqual({
      Orders: { A1: "2" },
      Inputs: { B2: "0.2" },
    });
  });
});
