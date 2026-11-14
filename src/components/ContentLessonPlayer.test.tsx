import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentLessonPlayer } from "./ContentLessonPlayer";
import { loadContentLesson } from "@/lib/lesson-content";
import type { LessonContent, LessonContentStep } from "@/lib/lesson-schema";
import { resetProgress } from "@/lib/progress";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { lessonId?: string } }) =>
    <a href={params?.lessonId ? `/practice/${params.lessonId}` : to}>{children}</a>,
}));

describe("full structured lesson flow", () => {
  let sampleLesson: LessonContent;
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

  const makeLesson = (...steps: Array<Partial<LessonContentStep>>) => ({
    ...sampleLesson,
    steps: steps.map((step, index) => ({
      ...sampleLesson.steps[0]!,
      ...step,
      id: step.id ?? `TEST-S${index + 1}`,
    } as LessonContentStep)),
  });

  const answerFormula = async (target: string, formula: string) => {
    if (target !== "B6") fireEvent.mouseDown(screen.getByRole("gridcell", { name: target }));
    const input = screen.getByRole("textbox", { name: `Formula bar for cell ${target}` });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: formula } });
    fireEvent.keyDown(input, { key: "Enter" });
  };

  beforeEach(async () => {
    const { lesson } = await loadContentLesson("L024");
    if (!lesson) throw new Error("L024 sample lesson did not load");
    sampleLesson = lesson;
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Win32" });
  });

  it("completes all steps and persists lesson progress", async () => {
    render(<ContentLessonPlayer lesson={sampleLesson} />);
    await answerFormula("B6", "=SUM(B2:B5)");
    await screen.findByText("Correct");
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    await answerFormula("C7", "=SUM(C2:C6,C8)");
    await screen.findByText("Correct");
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    await answerFormula("D6", "=SUM(D2,D4)");
    await screen.findByText("Correct");
    fireEvent.click(screen.getByRole("button", { name: "Finish lesson" }));

    expect(await screen.findByText("Lesson complete")).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(storage.getItem("gridwise.progress.v1") ?? "{}");
      expect(saved.lessonRuns.L024.status).toBe("completed");
      expect(saved.attempts).toHaveLength(3);
    });
  });

  it("checks formula steps and allows a correction after a failed attempt", async () => {
    render(<ContentLessonPlayer lesson={makeLesson({ type: "formula" })} />);
    await answerFormula("B6", "=SUM(B2:B4)");
    expect(await screen.findByText(/stops at Wednesday/)).toBeInTheDocument();
    await answerFormula("B6", "=SUM(B2:B5)");
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("checks fix_formula steps with formula validation", async () => {
    render(<ContentLessonPlayer lesson={makeLesson({ type: "fix_formula" })} />);
    await answerFormula("B6", "=SUM(B2:B4)");
    expect(await screen.findByText(/stops at Wednesday/)).toBeInTheDocument();
    await answerFormula("B6", "=SUM(B2:B5)");
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("checks multi-cell scenario formulas and rejects an incomplete answer", async () => {
    const original = sampleLesson.steps[0]!;
    const scenario = {
      ...original,
      type: "scenario",
      target_cells: ["B6", "C6"],
      workbook: {
        sheets: [{
          name: "Sales",
          cells: {
            ...original.workbook.sheets[0]!.cells,
            C2: 100, C3: 80, C4: 90, C5: 70,
          },
        }],
      },
      validation: {
        mode: "multi_cell",
        accepted_values: { B6: 450, C6: 340 },
        accepted_patterns: [],
        required_functions: ["SUM"],
        forbid_hardcoded: true,
        recalc_variants: [{ change: { B5: 100 }, expect: { B6: 470, C6: 340 } }],
      },
    } as Partial<LessonContentStep>;
    render(<ContentLessonPlayer lesson={makeLesson(scenario)} />);
    await answerFormula("B6", "=SUM(B2:B5)");
    await screen.findByText(/Cell C6 is empty/);
    await answerFormula("C6", "=SUM(C2:C5)");
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("checks Windows shortcut capture and rejects an incorrect chord", async () => {
    const original = sampleLesson.steps[0]!;
    render(<ContentLessonPlayer lesson={makeLesson({
      ...original,
      type: "shortcut",
      target_cells: [],
      validation: {
        mode: "shortcut",
        start_cell: "A1",
        target: "A1",
        accepted_sequences: { windows: [["Ctrl", "Shift", "V"]], mac: [["Meta", "Shift", "V"]] },
      },
    })} />);
    const capture = screen.getByRole("textbox", { name: "Shortcut key capture" });
    fireEvent.keyDown(capture, { key: "c", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText(/shortcut was not recognized/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.keyDown(capture, { key: "v", ctrlKey: true, shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("uses the detected Mac shortcut sequence", async () => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" });
    const original = sampleLesson.steps[0]!;
    render(<ContentLessonPlayer lesson={makeLesson({
      ...original,
      type: "shortcut",
      target_cells: [],
      validation: {
        mode: "shortcut",
        start_cell: "A1",
        target: "A1",
        accepted_sequences: { windows: [["Ctrl", "V"]], mac: [["Meta", "Shift", "V"]] },
      },
    })} />);
    const capture = screen.getByRole("textbox", { name: "Shortcut key capture" });
    expect(screen.getByText(/Shortcut practice · Mac/)).toBeInTheDocument();
    fireEvent.keyDown(capture, { key: "v", metaKey: true, shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("checks MCQ selections and progresses to the next step", async () => {
    const original = sampleLesson.steps[0]!;
    const mcq = {
      ...original,
      id: "MCQ",
      type: "mcq",
      target_cells: [],
      prompt: "Which function adds values?",
      validation: {
        mode: "mcq",
        choices: [{ id: "avg", label: "AVERAGE" }, { id: "sum", label: "SUM" }],
        accepted_choice: "sum",
      },
    };
    const shortcut = {
      ...original,
      id: "SHORTCUT",
      type: "shortcut",
      target_cells: [],
      validation: {
        mode: "shortcut",
        start_cell: "A1",
        target: "A1",
        accepted_sequences: { windows: [["Ctrl", "V"]], mac: [["Meta", "V"]] },
      },
    };
    render(<ContentLessonPlayer lesson={makeLesson(mcq, shortcut)} />);
    fireEvent.click(screen.getByRole("radio", { name: "AVERAGE" }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText(/Choose the answer that best matches/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "SUM" }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Shortcut key capture" }), { key: "v", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("checks menu command and arbitrary expected state values", async () => {
    const original = sampleLesson.steps[0]!;
    render(<ContentLessonPlayer lesson={makeLesson({
      ...original,
      type: "menu_action",
      target_cells: [],
      prompt: "Use View to freeze the top row.",
      validation: { mode: "state", expect: { type: "freeze_panes", rows: 1, enabled: true } },
      menu_path: ["View", "Window"],
    })} />);
    expect(screen.getByText("View › Window menu simulation")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Command" }), { target: { value: "sort" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Rows" }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText(/command or its settings do not match/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Command" }), { target: { value: "freeze_panes" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Rows" }), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("renders workbook tabs and edits the selected sheet", async () => {
    const original = sampleLesson.steps[0]!;
    const step = {
      ...original,
      workbook: {
        sheets: [
          original.workbook.sheets[0]!,
          { name: "Totals", cells: { A1: "Result" } },
        ],
      },
    };
    render(<ContentLessonPlayer lesson={makeLesson(step)} />);
    expect(screen.getByRole("tab", { name: "Sales" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Totals" }));
    expect(screen.getByRole("tab", { name: "Totals" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("gridcell", { name: "A1, read only" })).toHaveTextContent("Result");
  });
});
