import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Lightbulb, LoaderCircle, RotateCcw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LESSON_INDEX } from "@/lib/lesson-index";
import { missingEngineFunctions, validateLessonStep, type LessonCheckResult } from "@/lib/lesson-validation";
import { formatValue, parseRef, Workbook, type CellMap } from "@/lib/formula";
import type { LessonContent, LessonContentStep } from "@/lib/lesson-schema";
import { recordComplete, recordLessonAttempt, recordLessonProgress, recordMistake, useProgress } from "@/lib/progress";
import { Sheet } from "./Sheet";
import type { Lesson } from "@/lib/lessons";
import { checkStep } from "@/lib/validate";
import { WorkspaceShell } from "./lesson-player/WorkspaceShell";
import { LearnPane, ShortcutText } from "./lesson-player/LearnPane";
import { KeycapCombo, SegmentedControl, type ShortcutPlatform } from "./lesson-player/primitives";
import { allowsDoubleEscape, shortcutChecklist } from "@/lib/lesson-player-presentation";

type Props = { lesson: LessonContent; legacyLesson?: Lesson };
type InteractionAnswers = Record<string, unknown>;

const menuNames = ["Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View"];
const fallbackCommands = ["format_cells", "sort", "filter", "freeze_panes", "insert_chart", "conditional_formatting"];

function platformShortcutKey() {
  const navigatorWithPlatform = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = `${navigatorWithPlatform.userAgentData?.platform ?? ""} ${navigator.platform} ${navigator.userAgent}`.toLowerCase();
  return /mac|iphone|ipad/.test(platform) ? "mac" : "windows";
}

function canonicalShortcutKey(value: string) {
  const aliases: Record<string, string> = {
    control: "CTRL",
    ctrl: "CTRL",
    command: "CMD",
    cmd: "CMD",
    meta: "CMD",
    option: "ALT",
    alt: "ALT",
    shift: "SHIFT",
    esc: "ESC",
    spacebar: "SPACE",
    " ": "SPACE",
    arrowdown: "DOWN", arrowup: "UP", arrowleft: "LEFT", arrowright: "RIGHT",
  };
  return aliases[value.toLowerCase()] ?? value.toUpperCase();
}

function canonicalChord(parts: string[]) {
  let normalized = parts.map(canonicalShortcutKey);
  // Fn is translated by Mac keyboards before the browser receives the event.
  if (normalized.includes("FN")) {
    const navigation: Record<string, string> = { LEFT: "HOME", RIGHT: "END", UP: "PAGEUP", DOWN: "PAGEDOWN" };
    normalized = normalized.filter((key) => key !== "FN").map((key) => navigation[key] ?? key);
  }
  if (normalized.includes("SHIFT")) {
    const shifted: Record<string, string> = { "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", ":": ";", "+": "=", "_": "-", "?": "/", '"': "'", "<": ",", ">": ".", "{": "[", "}": "]", "|": "\\", "~": "`" };
    normalized = normalized.map((key) => shifted[key] ?? key);
  }
  const order = ["CTRL", "ALT", "SHIFT", "CMD"];
  const modifiers = order.filter((modifier) => normalized.includes(modifier));
  const keys = normalized.filter((key) => !order.includes(key));
  return [...modifiers, ...keys].join("+");
}

function expectedKeyEvents(sequence: string[]) {
  const events: string[] = [];
  let modifiers: string[] = [];
  for (const token of sequence) {
    if (/^Type:/i.test(token)) {
      events.push(...Array.from(token.slice(5), (character) => `TYPE:${character}`));
      modifiers = [];
      continue;
    }
    const parts = token.split("+").filter(Boolean);
    if (parts.length > 1) {
      events.push(canonicalChord(parts));
      modifiers = [];
      continue;
    }
    const key = canonicalShortcutKey(token);
    if (["CTRL", "ALT", "SHIFT", "CMD"].includes(key)) {
      modifiers.push(key);
    } else {
      events.push(canonicalChord([...modifiers, key]));
      modifiers = [];
    }
  }
  if (modifiers.length) events.push(canonicalChord(modifiers));
  return events;
}

function shortcutMatches(actual: string[], accepted: string[][]) {
  return accepted.some((sequence) => {
    const expected = expectedKeyEvents(sequence);
    return expected.length === actual.length && expected.every((key, index) => key === actual[index]);
  });
}

function displayKey(key: string) {
  if (key.startsWith("TYPE:")) return key.slice(5);
  return key.split("+").map((part) => ({ CTRL: "Ctrl", CMD: "⌘", ALT: "Alt", SHIFT: "Shift", SPACE: "Space" }[part] ?? part)).join("+");
}

function displaySequence(sequence: string[]) {
  return sequence.reduce<string[]>((groups, key, index) => {
    if (key.startsWith("TYPE:")) {
      if (sequence[index - 1]?.startsWith("TYPE:")) groups[groups.length - 1] += key.slice(5);
      else groups.push(key.slice(5));
    } else groups.push(displayKey(key));
    return groups;
  }, []).join(", ");
}

function isMenuActionStep(step: LessonContentStep): boolean {
  return step.type === "menu_action";
}

function isSpreadsheetStep(step: LessonContentStep) {
  return step.type === "formula" || step.type === "fix_formula" || step.type === "scenario";
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftEntries = Object.entries(left);
  const rightObject = right as Record<string, unknown>;
  return leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([key, value]) => Object.prototype.hasOwnProperty.call(rightObject, key) && deepEqual(value, rightObject[key]));
}

function metadataStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return [record.label, record.title, record.name].filter((part): part is string => typeof part === "string");
    }
    return [];
  });
}

function menuContext(step: LessonContentStep) {
  const metadata = step as unknown as Record<string, unknown>;
  for (const key of ["menu_path", "menu", "ribbon", "category"]) {
    const items = metadataStrings(metadata[key]);
    if (items.length) return items.join(" › ");
  }
  const match = menuNames.find((name) => new RegExp(`\\b${name.replace(" ", "\\s+")}\\b`, "i").test(step.prompt));
  return match ?? "Excel ribbon";
}

function menuCommands(step: LessonContentStep, expectedType: string) {
  const metadata = step as unknown as Record<string, unknown>;
  const configured = ["menu_actions", "commands", "actions"].flatMap((key) => metadataStrings(metadata[key]));
  return [...new Set([expectedType, ...fallbackCommands, ...configured])];
}

function ShortcutControl({ accepted, onChange, cells, onCellsChange, cols, rows, startCell, onInteraction, platform, onKeys, allowEscape, flash }: { accepted: string[][]; onChange: (value: string[]) => void; cells: CellMap; onCellsChange: (cells: CellMap) => void; cols: number; rows: number; startCell: string; onInteraction: (active: string, range: string) => void; platform: ShortcutPlatform; onKeys: (keys: string[]) => void; allowEscape: boolean; flash?: { cell: string; kind: "correct" | "wrong"; key: number } | null }) {
  const [captured, setCaptured] = useState<string[]>([]);
  const candidates = accepted.map(expectedKeyEvents);
  const capture = (event: React.KeyboardEvent) => {
    const key = canonicalShortcutKey(event.key);
    if (["CTRL", "ALT", "SHIFT", "CMD"].includes(key)) return;
    const update = (sequence: string[]) => {
      setCaptured(sequence);
      onChange(sequence);
    };
    if (key === "BACKSPACE" && !event.ctrlKey && !event.metaKey && captured.at(-1)?.startsWith("TYPE:")) {
      update(captured.slice(0, -1));
      return;
    }
    const expectsText = candidates.some((candidate) => candidate[captured.length]?.startsWith("TYPE:"));
    const typing = (expectsText || captured.at(-1)?.startsWith("TYPE:")) &&
      event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (typing) {
      update([...captured, `TYPE:${event.key}`]);
      return;
    }
    // Physical digit/punctuation keys remain stable when Shift changes event.key.
    const physicalKey = /^(Digit[0-9]|Semicolon)$/.test(event.code)
      ? event.code === "Semicolon" ? ";" : event.code.slice(5)
      : key;
    const chord = canonicalChord([
      ...(event.ctrlKey ? ["CTRL"] : []),
      ...(event.altKey ? ["ALT"] : []),
      ...(event.shiftKey ? ["SHIFT"] : []),
      ...(event.metaKey ? ["CMD"] : []),
      physicalKey,
    ]);
    const next = [...captured, chord];
    const prefixMatches = candidates.some((candidate) => next.every((part, index) => candidate[index] === part));
    const sequence = prefixMatches ? next : [chord];
    update(sequence);
  };

  return <Sheet cells={cells} onChange={onCellsChange} cols={cols} rows={rows} initialSelected={startCell} variant="practice" scale={1} shortcutPractice onShortcutKey={capture} onInteraction={onInteraction} workspaceCapture allowDoubleEscape={allowEscape} onKeys={onKeys} flash={flash} />;
}

function MenuActionControl({
  step,
  expected,
  answers,
  onChange,
}: {
  step: LessonContentStep;
  expected: Record<string, unknown>;
  answers: InteractionAnswers;
  onChange: (key: string, value: unknown) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const commands = menuCommands(step, String(expected.type));
  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{menuContext(step)} menu simulation</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose a command and configure its available options to match the requested action.</p>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        <span>Command</span>
        <select
          aria-label="Command"
          className="w-full rounded-md border bg-background px-3 py-2"
          value={typeof answers.type === "string" ? answers.type : ""}
          onChange={(event) => onChange("type", event.target.value)}
        >
          <option value="">Choose a command</option>
          {commands.map((command) => <option key={command} value={command}>{titleCase(command.replace(/[_-]+/g, " "))}</option>)}
        </select>
      </label>
      {Object.entries(expected).filter(([key]) => key !== "type").map(([key, expectedValue]) => {
        const answer = answers[key];
        const label = titleCase(key.replace(/[_-]+/g, " "));
        if (typeof expectedValue === "boolean") {
          return (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={typeof answer === "boolean" ? answer : !expectedValue} onChange={(event) => onChange(key, event.target.checked)} />
              {label}
            </label>
          );
        }
        return (
          <label key={key} className="block space-y-1 text-sm font-medium">
            <span>{label}</span>
            {typeof expectedValue === "object" && expectedValue !== null
              ? <textarea aria-label={label} className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm" rows={3} value={drafts[key] ?? ""} placeholder="Enter a JSON value" onChange={(event) => {
                setDrafts((current) => ({ ...current, [key]: event.target.value }));
                try { onChange(key, JSON.parse(event.target.value)); }
                catch { onChange(key, event.target.value); }
              }} />
              : <input
                aria-label={label}
                className="w-full rounded-md border bg-background px-3 py-2"
                type={typeof expectedValue === "number" ? "number" : "text"}
                value={answer === undefined || answer === null ? "" : String(answer)}
                onChange={(event) => onChange(key, typeof expectedValue === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value)}
              />}
          </label>
        );
      })}
    </div>
  );
}

function toSheetMaps(step: LessonContentStep): Record<string, CellMap> {
  return Object.fromEntries(step.workbook.sheets.map((sheet) => [sheet.name, Object.fromEntries(
    Object.entries(sheet.cells).map(([address, value]) => {
      if (value === null) return [address.toUpperCase(), ""];
      if (typeof value === "object") return [address.toUpperCase(), "formula" in value ? value.formula : value.date];
      return [address.toUpperCase(), String(value)];
    }),
  )]));
}

function savedSheetMaps(step: LessonContentStep, savedCells?: CellMap) {
  const maps = toSheetMaps(step);
  if (step.workbook.sheets.length === 1 && savedCells) {
    maps[(step.workbook.sheets[0]?.name ?? "")] = savedCells;
  }
  return maps;
}

function preferredSheet(step: LessonContentStep) {
  const metadata = step as unknown as Record<string, unknown>;
  const requested = metadata.target_sheet ?? metadata.sheet;
  return typeof requested === "string" && step.workbook.sheets.some((sheet) => sheet.name === requested)
    ? requested
    : step.workbook.sheets[0]?.name ?? "";
}

function dimensions(step: LessonContentStep, cells: CellMap) {
  const destinations = step.validation.mode === "shortcut" ? [step.validation.start_cell, step.validation.target, ...Object.values(step.validation.accepted_sequences).flat(2).filter((token) => /^Type:[A-Z]+\d+(?::[A-Z]+\d+)?$/i.test(token)).map((token) => token.slice(5))] : [];
  const positions = [...Object.keys(cells), ...step.target_cells, ...destinations.flatMap((value) => value.split(":"))].map(parseRef).filter((value) => value !== null);
  return {
    cols: Math.max(8, ...positions.map((position) => position.col + 1)),
    rows: Math.max(10, ...positions.map((position) => position.row + 1)),
  };
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function shortcutFeedback(step: LessonContentStep, captured: string[], cells: CellMap, selection: {active:string;range:string}, platform: ShortcutPlatform) {
  if (step.validation.mode !== "shortcut") return step.prompt;
  const expected=step.validation.expected;
  const accepted=step.validation.accepted_sequences[platform];
  const other=step.validation.accepted_sequences[platform==="mac"?"windows":"mac"];
  if(shortcutMatches(captured,other) && !shortcutMatches(captured,accepted)) return `On ${platform==="mac"?"Mac":"Windows"}, use ${displaySequence(expectedKeyEvents(accepted[0] ?? []))}. You used the other platform's sequence.`;
  if(expected?.type==="value" && expected.cells) { const wrong=Object.entries(expected.cells).find(([a,v])=>new Workbook(cells).get(a)!==v); if(wrong)return `${wrong[0]} shows ${formatValue(new Workbook(cells).get(wrong[0])) || "blank"}, expected ${String(wrong[1])}. ${step.prompt}`; }
  if(expected?.type==="selection" && selection.range!==expected.range) return `Selected ${selection.range}, expected ${expected.range}. ${step.prompt}`;
  if(expected?.type==="active_cell" && selection.active!==expected.cell)return `Active cell is ${selection.active}, expected ${expected.cell}. ${step.prompt}`;
  if(!captured.length) return `Click the sheet, then ${step.prompt}`;
  return `Pressed ${displaySequence(captured)}; expected ${displaySequence(expectedKeyEvents(accepted[0] ?? []))}. ${step.prompt}`;
}

export function ContentLessonPlayer({ lesson, legacyLesson }: Props) {
  const progress = useProgress();
  const [platform, setPlatform] = useState<ShortcutPlatform>("windows");
  const [resetKey, setResetKey] = useState(0);
  const [keys, setKeys] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => { try { const saved = localStorage.getItem("gridwise.platform"); setPlatform(saved === "mac" || saved === "windows" ? saved : platformShortcutKey()); } catch { setPlatform(platformShortcutKey()); } }, []);
  useEffect(() => { return () => { if (checkTimer.current) clearTimeout(checkTimer.current); }; }, []);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRun = progress.lessonRuns[lesson.id];
  const savedStepIndex = Math.max(0, lesson.steps.findIndex((item) => item.id === savedRun?.current_step));
  const initialStep = lesson.steps[savedStepIndex] ?? lesson.steps[0];
  if (!initialStep) throw new Error("Lesson has no steps");
  const savedStep = savedRun?.steps[initialStep.id];
  const [stepIndex, setStepIndex] = useState(savedStepIndex);
  const [cellsByStep, setCellsByStep] = useState<Record<string, Record<string, CellMap>>>(() => ({
    [initialStep.id]: savedSheetMaps(initialStep, savedRun?.sheets[initialStep.id]),
  }));
  const [selectedSheet, setSelectedSheet] = useState(() => preferredSheet(initialStep));
  const sheetInteraction = useRef({ active: "A1", range: "A1" });
  const [interactionAnswers, setInteractionAnswers] = useState<Record<string, InteractionAnswers>>({});
  const [hintsUsed, setHintsUsed] = useState(savedStep?.hints_used ?? 0);
  const [attemptCount, setAttemptCount] = useState(savedStep?.attempts ?? 0);
  const [result, setResult] = useState<LessonCheckResult | null>(null);
  const [flash, setFlash] = useState<{ cell: string; kind: "correct" | "wrong"; key: number } | null>(null);
  const [passed, setPassed] = useState<string[]>(() => lesson.steps.filter((item) => savedRun?.steps[item.id]?.status === "completed").map((item) => item.id));
  const [complete, setComplete] = useState(savedRun?.status === "completed");
  const startedAt = useRef(performance.now());
  const step = lesson.steps[stepIndex] ?? initialStep;
  const stepSheets = cellsByStep[step.id] ?? savedSheetMaps(step, savedRun?.sheets[step.id]);
  const activeSheet = step.workbook.sheets.find((sheet) => sheet.name === selectedSheet) ?? step.workbook.sheets[0];
  if (!activeSheet) throw new Error("Lesson has no workbook sheet");
  const cells = stepSheets[activeSheet.name] ?? {};
  const validationTargets = step.type === "scenario" && "accepted_values" in step.validation
    ? Object.keys(step.validation.accepted_values)
    : [];
  const targetCells = [...new Set([...step.target_cells, ...validationTargets])];
  const sheetStep = isSpreadsheetStep(step);
  const size = useMemo(() => dimensions({ ...step, target_cells: targetCells }, cells), [step, cells, targetCells.join("|")]);
  const unavailableFunctions = missingEngineFunctions(step);
  const supported = sheetStep && unavailableFunctions.length === 0;
  const interaction = interactionAnswers[step.id] ?? {};
  const previous = LESSON_INDEX.filter((item) => item.number < lesson.number).sort((a, b) => b.number - a.number)[0];
  const next = LESSON_INDEX.filter((item) => item.number > lesson.number).sort((a, b) => a.number - b.number)[0];

  useEffect(() => {
    if (!complete) recordLessonProgress(lesson.id, { status: "in_progress", current_step: step.id });
  }, [complete, lesson.id, step.id]);

  const check = (submittedCells = cells) => {
    if (sheetStep && !supported) return;
    if (result?.status === "correct") {
      if (stepIndex === lesson.steps.length - 1) {
        recordLessonProgress(lesson.id, { status: "completed", current_step: step.id });
        setComplete(true);
      }
      else {
        const nextStepIndex = stepIndex + 1;
        const nextStep = lesson.steps[nextStepIndex];
        if (!nextStep) return;
        setKeys([]);
        setStepIndex(nextStepIndex);
        const nextRun = progress.lessonRuns[lesson.id];
        setSelectedSheet(preferredSheet(nextStep));
        setCellsByStep((current) => current[nextStep.id]
          ? current
          : { ...current, [nextStep.id]: savedSheetMaps(nextStep, nextRun?.sheets[nextStep.id]) });
        setHintsUsed(nextRun?.steps[nextStep.id]?.hints_used ?? 0);
        setAttemptCount(nextRun?.steps[nextStep.id]?.attempts ?? 0);
        setResult(null);
        setFlash(null);
        startedAt.current = performance.now();
      }
      return;
    }

    let checked: LessonCheckResult;
    const legacyStep = legacyLesson?.steps[stepIndex];
    if (legacyStep) {
      const legacyResult = checkStep(legacyStep, submittedCells);
      checked = { status: legacyResult.ok ? "correct" : "incorrect", feedbackKey: legacyResult.ok ? "correct" : "legacy-check", message: legacyResult.ok ? legacyResult.message : [legacyResult.message, legacyResult.diagnosis].filter(Boolean).join(" ") };
    } else if (sheetStep) {
      checked = validateLessonStep(step, submittedCells);
    } else if (step.type === "shortcut" && step.validation.mode === "shortcut") {
      const accepted = step.validation.accepted_sequences[platform];
      const captured = Array.isArray(interaction.sequence) ? interaction.sequence as string[] : [];
      const expected = step.validation.expected;
      const destinationMatches = expected?.type === "active_cell" ? sheetInteraction.current.active === expected.cell
        : expected?.type === "selection" ? sheetInteraction.current.range === expected.range
        : expected?.type === "value" && expected.cells ? Object.entries(expected.cells).every(([address, value]) => {
          if (typeof value === "string" && value.startsWith("$")) return (submittedCells[address] ?? "") !== "";
          return new Workbook(submittedCells).get(address) === value;
        }) : true;
      const correct = shortcutMatches(captured, accepted) && destinationMatches;
      checked = correct
        ? { status: "correct", feedbackKey: "correct", message: step.explanation }
        : { status: "incorrect", feedbackKey: "shortcut-mismatch", message: shortcutFeedback(step, captured, submittedCells, sheetInteraction.current, platform) };
    } else if (step.type === "mcq" && step.validation.mode === "mcq") {
      const correct = interaction.choice === step.validation.accepted_choice;
      checked = correct
        ? { status: "correct", feedbackKey: "correct", message: step.explanation }
        : { status: "incorrect", feedbackKey: "choice-mismatch", message: "Choose the answer that best matches the question." };
    } else if (isMenuActionStep(step) && step.validation.mode === "state") {
      const expected = step.validation.expect;
      const correct = Object.entries(expected).every(([key, value]) => deepEqual(interaction[key], value));
      checked = correct
        ? { status: "correct", feedbackKey: "correct", message: step.explanation }
        : { status: "incorrect", feedbackKey: "state-mismatch", message: "The selected command or its settings do not match the requested menu action." };
    } else {
      checked = { status: "error", feedbackKey: "unsupported-step", message: "This step cannot be checked with the available lesson controls." };
    }
    setResult(checked);
    if (checked.status === "correct") requestAnimationFrame(() => primary.current?.focus());
    if (targetCells[0]) {
      setFlash({ cell: targetCells[0], kind: checked.status === "correct" ? "correct" : "wrong", key: Date.now() });
      setTimeout(() => setFlash(null), checked.status === "correct" ? 600 : 1500);
    }
    setAttemptCount((count) => count + 1);
    const formula = sheetStep
      ? targetCells.map((target) => submittedCells[target] ?? "").join(" | ")
      : JSON.stringify(interaction);
    recordLessonAttempt({
      lesson_id: lesson.id,
      step_id: step.id,
      formula,
      result: checked.message,
      correct: checked.status === "correct",
      time_ms: Math.max(0, Math.round(performance.now() - startedAt.current)),
      hints_used: hintsUsed,
      timestamp: new Date().toISOString(),
    });
    if (checked.status === "correct") {
      setPassed((items) => items.includes(step.id) ? items : [...items, step.id]);
      recordComplete(step.id, attemptCount === 0, hintsUsed);
    } else {
      recordMistake(step.id);
    }
  };

  const maxHints = step.difficulty === "guided"
    ? 3
    : step.difficulty === "independent" && attemptCount > 0
      ? 3
      : step.difficulty === "apply"
        ? 1
        : 0;
  const canRevealHint = hintsUsed < maxHints && !(hintsUsed === 2 && attemptCount === 0);
  const revealHint = () => {
    const nextHint = hintsUsed + 1;
    setHintsUsed(nextHint);
    const previousStep = progress.lessonRuns[lesson.id]?.steps[step.id];
    recordLessonProgress(lesson.id, {
      status: "in_progress",
      current_step: step.id,
      steps: {
        [step.id]: {
          status: previousStep?.status ?? "in_progress",
          attempts: attemptCount,
          hints_used: nextHint,
          time_ms: previousStep?.time_ms ?? 0,
        },
      },
    });
  };

  const updateCells = (nextCells: CellMap) => {
    setCellsByStep(current => ({ ...current, [step.id]: { ...(current[step.id] ?? stepSheets), [activeSheet.name]: nextCells } }));
    if (step.workbook.sheets.length === 1) recordLessonProgress(lesson.id, { status: "in_progress", current_step: step.id, sheets: { [step.id]: nextCells } });
    if (result?.status !== "correct") setResult(null);
  };
  const changed = !deepEqual(cells, toSheetMaps(step)[activeSheet.name]) || Object.keys(interaction).length > 0;
  const submit = (submitted = cells) => {
    if (checking) return;
    if (result?.status === "correct") { check(submitted); return; }
    setChecking(true);
    checkTimer.current = setTimeout(() => { check(submitted); setChecking(false); }, 300);
  };
  const reset = () => {
    const maps = toSheetMaps(step);
    setCellsByStep(current => ({ ...current, [step.id]: maps }));
    if (step.workbook.sheets.length === 1) recordLessonProgress(lesson.id, { sheets: { [step.id]: maps[activeSheet.name] ?? {} } });
    setInteractionAnswers(current => ({ ...current, [step.id]: {} })); setKeys([]); setResult(null); setFlash(null); setResetKey(k=>k+1);
  };
  const sequence = Array.isArray(interaction.sequence) ? interaction.sequence as string[] : [];
  const checklist = step.validation.mode === "shortcut" ? shortcutChecklist(expectedKeyEvents(step.validation.accepted_sequences[platform][0] ?? []), sequence) : [{ id: step.id, label: targetCells.length ? `Complete ${targetCells.join(", ")}` : "Complete this task", done: result?.status === "correct" }];
  const practice = complete ? <div className="lp-complete"><Check aria-hidden/><h2>Lesson complete</h2><p>{lesson.recap}</p>{next ? <Button asChild><Link to="/practice/$lessonId" params={{ lessonId: next.id }}>Next lesson<ArrowRight/></Link></Button> : <Button asChild><Link to="/learn">Back to lessons</Link></Button>}</div> : <>
    <header className="lp-practice-header"><div><p className="lp-eyebrow">{step.difficulty}</p><div className="lp-step-title-row"><h2 id="step-title">Step {stepIndex+1} of {lesson.steps.length}</h2><div className="lp-step-segments" aria-label="Step progress">{lesson.steps.map((s,i)=><span key={s.id} role="img" aria-label={`Step ${i+1}, ${passed.includes(s.id)?"completed":i===stepIndex?"current":"upcoming"}`} data-state={passed.includes(s.id)?"done":i===stepIndex?"current":"upcoming"} />)}</div></div></div><SegmentedControl label="Shortcut platform" value={platform} onValueChange={value=> { if(value!=="mac"&&value!=="windows")return;setPlatform(value);try{localStorage.setItem("gridwise.platform",value);}catch{} setInteractionAnswers(current=>({...current,[step.id]:{}}));setKeys([]);setResetKey(k=>k+1); }} options={[{value:"windows",label:"Windows"},{value:"mac",label:"Mac"}]} /></header>
    <div className="lp-practice-scroll">
      <div className="lp-task"><p><ShortcutText text={step.prompt} platform={platform}/></p><ul className="lp-checklist" aria-label="Step checklist">{checklist.map(item=><li key={item.id} data-done={item.done}><span className="lp-check-circle" aria-hidden>{item.done?<Check/>:null}</span><span>{item.label.startsWith("TYPE:")?`Type ${item.label.slice(5)}`:<ShortcutText text={item.label} platform={platform}/>}<span className="sr-only"> · {item.done?"done":"not done"}</span></span></li>)}</ul></div>
      {hintsUsed>0 && <div className="lp-hints">{hintsUsed>1 && <details><summary>Previous hints</summary>{step.hints.slice(0,hintsUsed-1).map((h,i)=><p key={i}><ShortcutText text={h} platform={platform}/></p>)}</details>}<p><strong>Hint {hintsUsed}:</strong> <ShortcutText text={step.hints[hintsUsed-1] ?? ""} platform={platform}/></p></div>}
      {!!unavailableFunctions.length && <p className="lp-feedback lp-feedback-error">Preview mode: {unavailableFunctions.join(", ")} is not supported yet.</p>}
      <p className="lp-keyboard-notice">Shortcut practice works best with a physical keyboard.</p>
      {step.workbook.sheets.length>1 && <SegmentedControl label="Workbook sheets" value={activeSheet.name} onValueChange={setSelectedSheet} options={step.workbook.sheets.map(s=>({value:s.name,label:s.name}))}/>}
      {step.type==="mcq" && step.validation.mode==="mcq" && <fieldset className="lp-choice-list"><legend>Choose one answer</legend>{step.validation.choices.map(choice=><label key={choice.id}><input type="radio" name={step.id} checked={interaction.choice===choice.id} onChange={()=>setInteractionAnswers(current=>({...current,[step.id]:{choice:choice.id}}))}/>{choice.label}</label>)}</fieldset>}
      {isMenuActionStep(step) && step.validation.mode==="state" && <MenuActionControl key={`${step.id}:${resetKey}`} step={step} expected={step.validation.expect} answers={interaction} onChange={(key,value)=>setInteractionAnswers(current=>({...current,[step.id]:{...(current[step.id]??{}),[key]:value}}))}/>}
      <div className="lp-live-sheet">{step.type==="shortcut" && step.validation.mode==="shortcut" ? <ShortcutControl key={`${step.id}:${platform}:${resetKey}`} accepted={step.validation.accepted_sequences[platform]} onChange={sequence=>setInteractionAnswers(current=>({...current,[step.id]:{...(current[step.id]??{}),sequence}}))} cells={cells} onCellsChange={updateCells} cols={size.cols} rows={size.rows} startCell={step.validation.start_cell} onInteraction={(active,range)=>{sheetInteraction.current={active,range};}} platform={platform} onKeys={setKeys} allowEscape={allowsDoubleEscape(step,platform)} flash={flash}/> : <Sheet key={`${step.id}:${activeSheet.name}:${resetKey}`} cells={cells} onChange={sheetStep?updateCells:()=>undefined} cols={size.cols} rows={size.rows} initialSelected={targetCells[0] ?? "A1"} editableCells={sheetStep?targetCells:[]} highlight={targetCells} flash={flash} variant="practice" scale={1} onEnterCheck={submit} enterChecks workspaceCapture onKeys={setKeys}/> }</div>
      <div className="lp-keys-strip" role="status" aria-live="polite"><span>Keys pressed</span><div>{keys.slice(-4).map((key,i)=><KeycapCombo key={`${key}-${i}`} keys={key.split("+")} platform={platform}/>)}</div><Button variant="ghost" size="sm" onClick={()=>setKeys([])} disabled={!keys.length}>Clear</Button></div>
      <div className="lp-feedback-slot" aria-live="polite" aria-atomic="true">{result && <div className={`lp-feedback ${result.status==="correct"?"lp-feedback-success":"lp-feedback-error"}`}>{result.status==="correct"?<Check aria-hidden/>:<AlertCircle aria-hidden/>}<div><strong>{result.status==="correct"?"Correct":null}</strong><p><ShortcutText text={result.message} platform={platform}/></p></div></div>}</div>
    </div>
    <footer className="lp-actionbar"><Button variant="ghost" onClick={revealHint} disabled={!canRevealHint || checking || result?.status==="correct"} title={canRevealHint?"Revealing a hint reduces step XP by 3 (minimum 2 XP)":hintsUsed>=maxHints?"No more hints":"Hints unlock after an attempt"}><Lightbulb/><span>{hintsUsed>=maxHints?"No more hints":`Hint ${hintsUsed+1} of ${maxHints}`}</span>{canRevealHint && <small>−3 XP</small>}</Button><Button variant="ghost" onClick={reset} disabled={checking}><RotateCcw/>Reset</Button><Button ref={primary} onClick={()=>submit()} disabled={checking || (result?.status!=="correct" && (!changed || (sheetStep&&!supported)))} title={!changed?"Make a change in the sheet first":undefined}>{checking?<><LoaderCircle className="lp-spinner"/>Checking</>:result?.status==="correct"?stepIndex===lesson.steps.length-1?"Finish lesson":"Next step":"Check"}</Button></footer>
  </>;
  return <WorkspaceShell lesson={lesson} learn={<LearnPane lesson={lesson} platform={platform}/>} practice={practice}/>;
}

export function InvalidContentLesson({ id }: { id: string }) {
  return <div role="status" className="mx-auto max-w-xl px-6 py-24 text-center" data-lesson-id={id}><h1 className="font-serif text-3xl">This lesson is being updated</h1><p className="mt-3 text-muted-foreground">Please check back soon.</p><Button asChild className="mt-6"><Link to="/learn">Back to lessons</Link></Button></div>;
}
