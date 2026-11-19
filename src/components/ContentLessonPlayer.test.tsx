import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentLessonPlayer } from "./ContentLessonPlayer";
import { formulaLesson } from "@/test/fixtures/formula-lessons";
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
    sampleLesson = formulaLesson;
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
        named_ranges: {},
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
    const capture = screen.getByRole("grid", { name: "Spreadsheet" });
    fireEvent.keyDown(capture, { key: "c", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText(/shortcut was not recognized/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.keyDown(screen.getByRole("grid", { name: "Spreadsheet" }), { key: "v", ctrlKey: true, shiftKey: true });
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
    const capture = screen.getByRole("grid", { name: "Spreadsheet" });
    expect(screen.getByText(/Shortcut practice · Mac/)).toBeInTheDocument();
    fireEvent.keyDown(capture, { key: "v", metaKey: true, shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("checks the actual worksheet selection as well as the shortcut sequence", async () => {
    render(<ContentLessonPlayer lesson={makeLesson({
      type: "shortcut", target_cells: [],
      validation: { mode: "shortcut", start_cell: "B3", target: "B3:B6", expected: { type: "selection", range: "B3:B6" }, accepted_sequences: { windows: [["Shift+Down", "Shift+Down", "Shift+Down"]], mac: [["Shift+Down", "Shift+Down", "Shift+Down"]] } },
    })} />);
    for (let i = 0; i < 3; i++) fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowDown", shiftKey: true });
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: "A1" }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText(/shortcut was not recognized/i)).toBeInTheDocument();
  });

  const shortcutLesson = (sequence: string[]) => makeLesson({
    type: "shortcut",
    target_cells: [],
    validation: { mode: "shortcut", start_cell: "A1", target: "A1", accepted_sequences: { windows: [sequence], mac: [sequence] } },
  });

  it("requires all three digits of Type:500 rather than accepting only 5", async () => {
    render(<ContentLessonPlayer lesson={shortcutLesson(["Type:500", "Enter"])} />);
    const capture = screen.getByRole("grid", { name: "Spreadsheet" });
    fireEvent.keyDown(capture, { key: "5" });
    fireEvent.keyDown(capture, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText(/shortcut was not recognized/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.keyDown(screen.getByRole("grid", { name: "Spreadsheet" }), { key: "5" });
    for (const key of "00") fireEvent.keyDown(screen.getByRole("textbox", { name: "Edit cell A1" }), { key });
    expect(screen.getByRole("textbox", { name: "Formula bar for cell A1" })).toHaveValue("500");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Edit cell A1" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it.each(["Paid", "B2:D9", "1.1", "=B2*(1+H1)"])("captures complete typed text %s after a chord", async (text) => {
    render(<ContentLessonPlayer lesson={shortcutLesson(["Ctrl+G", `Type:${text}`, "Enter"])} />);
    const capture = screen.getByRole("grid", { name: "Spreadsheet" });
    fireEvent.keyDown(capture, { key: "g", ctrlKey: true });
    for (const key of text) fireEvent.keyDown(capture, { key, shiftKey: /[A-Z:*+()]/.test(key) });
    fireEvent.keyDown(capture, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("allows Backspace to correct a mistyped digit without resetting the sequence", async () => {
    render(<ContentLessonPlayer lesson={shortcutLesson(["Type:500", "Enter"])} />);
    const capture = screen.getByRole("grid", { name: "Spreadsheet" });
    for (const key of ["5", "9", "Backspace", "0", "0", "Enter"]) fireEvent.keyDown(capture, { key });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it.each([["!", "1"], ["#", "3"], ["$", "4"], ["%", "5"], [":", ";"]])("recognizes shifted %s as the %s shortcut key", async (key, base) => {
    render(<ContentLessonPlayer lesson={shortcutLesson([`Ctrl+Shift+${base}`])} />);
    fireEvent.keyDown(screen.getByRole("grid", { name: "Spreadsheet" }), { key, ctrlKey: true, shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it.each([["Fn+Left", "Home", false, false], ["Fn+Control+Left", "Home", true, false], ["Fn+Control+Right", "End", true, false], ["Fn+Control+Shift+Right", "End", true, true]])("recognizes Mac %s from browser navigation events", async (sequence, key, ctrlKey, shiftKey) => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" });
    render(<ContentLessonPlayer lesson={shortcutLesson([String(sequence)])} />);
    fireEvent.keyDown(screen.getByRole("grid", { name: "Spreadsheet" }), { key, ctrlKey, shiftKey });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });

  it("checks MCQ selections and progresses to the next step", async () => {
    const original = sampleLesson.steps[0]!;
    const mcq: Partial<LessonContentStep> = {
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
    const shortcut: Partial<LessonContentStep> = {
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
    fireEvent.keyDown(screen.getByRole("grid", { name: "Spreadsheet" }), { key: "v", ctrlKey: true });
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
        named_ranges: {},
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
