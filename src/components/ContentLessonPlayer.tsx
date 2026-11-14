import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LESSON_INDEX } from "@/lib/lesson-index";
import { missingEngineFunctions, validateLessonStep, type LessonCheckResult } from "@/lib/lesson-validation";
import { formatValue, parseRef, type CellMap } from "@/lib/formula";
import type { LessonContent, LessonContentStep } from "@/lib/lesson-schema";
import { recordComplete, recordLessonAttempt, recordLessonProgress, recordMistake, useProgress } from "@/lib/progress";
import { Sheet } from "./Sheet";

type Props = { lesson: LessonContent };
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
  };
  return aliases[value.toLowerCase()] ?? value.toUpperCase();
}

function canonicalChord(parts: string[]) {
  const normalized = parts.map(canonicalShortcutKey);
  const order = ["CTRL", "ALT", "SHIFT", "CMD"];
  const modifiers = order.filter((modifier) => normalized.includes(modifier));
  const keys = normalized.filter((key) => !order.includes(key));
  return [...modifiers, ...keys].join("+");
}

function expectedKeyEvents(sequence: string[]) {
  const events: string[] = [];
  let modifiers: string[] = [];
  for (const token of sequence) {
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
  return key.split("+").map((part) => ({ CTRL: "Ctrl", CMD: "⌘", ALT: "Alt", SHIFT: "Shift", SPACE: "Space" }[part] ?? part)).join("+");
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

function ShortcutControl({ accepted, onChange }: { accepted: string[][]; onChange: (value: string[]) => void }) {
  const platform = platformShortcutKey();
  const [captured, setCaptured] = useState<string[]>([]);
  const [lastCapture, setLastCapture] = useState<string[]>([]);
  const candidates = accepted.map(expectedKeyEvents);

  const capture = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const key = canonicalShortcutKey(event.key);
    if (["CTRL", "ALT", "SHIFT", "CMD"].includes(key)) return;
    const chord = canonicalChord([
      ...(event.ctrlKey ? ["CTRL"] : []),
      ...(event.altKey ? ["ALT"] : []),
      ...(event.shiftKey ? ["SHIFT"] : []),
      ...(event.metaKey ? ["CMD"] : []),
      key,
    ]);
    const next = [...captured, chord];
    const prefixMatches = candidates.some((candidate) => next.every((part, index) => candidate[index] === part));
    const sequence = prefixMatches ? next : [chord];
    setCaptured(sequence);
    setLastCapture(sequence);
    onChange(sequence);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <p className="font-medium">Shortcut practice · {platform === "mac" ? "Mac" : "Windows"}</p>
      <label className="block text-sm font-medium" htmlFor="shortcut-capture">Press the requested shortcut</label>
      <input
        id="shortcut-capture"
        aria-label="Shortcut key capture"
        className="w-full rounded-md border bg-background px-3 py-2"
        autoComplete="off"
        onKeyDown={capture}
        placeholder="Focus here, then press the shortcut"
        value={lastCapture.map(displayKey).join(", ")}
        onChange={() => undefined}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {lastCapture.length ? `Captured: ${lastCapture.map(displayKey).join(", ")}` : "Browser or system shortcuts may be intercepted before they reach this practice field."}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => { setCaptured([]); setLastCapture([]); onChange([]); }}>Reset</Button>
      </div>
    </div>
  );
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
              ? <textarea aria-label={label} className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm" rows={3} value={typeof answer === "string" ? answer : ""} placeholder="Enter a JSON value" onChange={(event) => {
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
    maps[step.workbook.sheets[0]!.name] = savedCells;
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
  const positions = [...Object.keys(cells), ...step.target_cells].map(parseRef).filter((value) => value !== null);
  return {
    cols: Math.max(8, ...positions.map((position) => position!.col + 1)),
    rows: Math.max(10, ...positions.map((position) => position!.row + 1)),
  };
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function examplesFor(lesson: LessonContent) {
  return lesson.examples.map((example, index) => (
    <article key={`${example.formula}-${index}`} className="rounded-lg border bg-background p-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <tbody>{example.data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`border border-grid-line px-2 py-1 ${rowIndex === 0 ? "bg-cell-header font-medium" : ""}`}>
                  {typeof cell === "object" && cell !== null ? ("formula" in cell ? cell.formula : cell.date) : formatValue(cell)}
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <code className="mt-3 block font-mono text-sm">{example.formula}</code>
      <p className="mt-1 text-sm"><span className="font-medium">Result:</span> {String(example.result)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{example.why}</p>
    </article>
  ));
}

export function ContentLessonPlayer({ lesson }: Props) {
  const progress = useProgress();
  const savedRun = progress.lessonRuns[lesson.id];
  const savedStepIndex = Math.max(0, lesson.steps.findIndex((item) => item.id === savedRun?.current_step));
  const initialStep = lesson.steps[savedStepIndex]!;
  const savedStep = savedRun?.steps[initialStep.id];
  const [stepIndex, setStepIndex] = useState(savedStepIndex);
  const [cellsByStep, setCellsByStep] = useState<Record<string, Record<string, CellMap>>>(() => ({
    [initialStep.id]: savedSheetMaps(initialStep, savedRun?.sheets[initialStep.id]),
  }));
  const [selectedSheet, setSelectedSheet] = useState(() => preferredSheet(initialStep));
  const [interactionAnswers, setInteractionAnswers] = useState<Record<string, InteractionAnswers>>({});
  const [hintsUsed, setHintsUsed] = useState(savedStep?.hints_used ?? 0);
  const [attemptCount, setAttemptCount] = useState(savedStep?.attempts ?? 0);
  const [result, setResult] = useState<LessonCheckResult | null>(null);
  const [flash, setFlash] = useState<{ cell: string; kind: "correct" | "wrong"; key: number } | null>(null);
  const [passed, setPassed] = useState<string[]>(() => lesson.steps.filter((item) => savedRun?.steps[item.id]?.status === "completed").map((item) => item.id));
  const [complete, setComplete] = useState(savedRun?.status === "completed");
  const startedAt = useRef(performance.now());
  const step = lesson.steps[stepIndex]!;
  const stepSheets = cellsByStep[step.id] ?? savedSheetMaps(step, savedRun?.sheets[step.id]);
  const activeSheet = step.workbook.sheets.find((sheet) => sheet.name === selectedSheet) ?? step.workbook.sheets[0]!;
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
        const nextStep = lesson.steps[nextStepIndex]!;
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
    if (sheetStep) {
      checked = validateLessonStep(step, submittedCells);
    } else if (step.type === "shortcut" && step.validation.mode === "shortcut") {
      const accepted = step.validation.accepted_sequences[platformShortcutKey()];
      const captured = Array.isArray(interaction.sequence) ? interaction.sequence as string[] : [];
      const correct = shortcutMatches(captured, accepted);
      checked = correct
        ? { status: "correct", feedbackKey: "correct", message: step.explanation }
        : { status: "incorrect", feedbackKey: "shortcut-mismatch", message: `That shortcut was not recognized. Try the ${platformShortcutKey() === "mac" ? "Mac" : "Windows"} sequence and check again.` };
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
    if (targetCells[0] && sheetStep) {
      setFlash({ cell: targetCells[0], kind: checked.status === "correct" ? "correct" : "wrong", key: Date.now() });
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

  if (complete) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border bg-card p-8 shadow-soft">
          <div className="flex items-center gap-2 text-success"><Check aria-hidden className="size-5" /><span className="font-medium">Lesson complete</span></div>
          <h1 className="mt-4 font-serif text-4xl">{lesson.title}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{lesson.recap}</p>
          <div className="mt-8 flex flex-wrap justify-between gap-3">
            {previous ? <Button asChild variant="outline"><Link to="/practice/$lessonId" params={{ lessonId: previous.id }}><ArrowLeft aria-hidden />Previous lesson</Link></Button> : <span />}
            {next ? <Button asChild><Link to="/practice/$lessonId" params={{ lessonId: next.id }}>Next lesson<ArrowRight aria-hidden /></Link></Button> : <Button asChild><Link to="/learn">Back to lessons<ArrowRight aria-hidden /></Link></Button>}
          </div>
        </div>
      </div>
    );
  }

  const versionTooltip = "Needs Excel 2019/2021/Microsoft 365. Older versions: see the fallback in Watch out.";

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
      <section className="max-h-[calc(100vh-7rem)] overflow-auto rounded-xl border bg-card p-5 shadow-soft" aria-labelledby="lesson-title">
        <header className="border-b pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lesson {String(lesson.number).padStart(2, "0")} · {titleCase(lesson.level)} · ~{lesson.estimated_minutes} min</p>
          <div className="mt-2 flex items-center gap-2">
            <h1 id="lesson-title" className="text-xl font-semibold">{lesson.title}</h1>
            {lesson.version_badge && <Badge variant="outline" title={versionTooltip}>{lesson.version_badge}</Badge>}
          </div>
        </header>
        <div className="space-y-5 py-5">
          <div><h2 className="text-sm font-semibold">Goal</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lesson.objectives[0]}</p></div>
          <div><h2 className="text-sm font-semibold">About</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lesson.about}</p></div>
          <div><h2 className="text-sm font-semibold">Syntax</h2><code className="mt-2 block rounded bg-muted px-3 py-2 font-mono text-sm">{lesson.syntax}</code></div>
          <div><h2 className="text-sm font-semibold">Examples</h2><div className="mt-2 space-y-3">{examplesFor(lesson)}</div></div>
          <div><h2 className="text-sm font-semibold">Watch out</h2><ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{lesson.watch_out.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </section>

      <section className="min-w-0" aria-labelledby="step-title">
        <div className="mb-3 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Do it yourself · {step.difficulty}</p>
              <h2 id="step-title" className="mt-1 text-lg font-semibold">Step {stepIndex + 1} of {lesson.steps.length}</h2>
            </div>
            <div className="flex gap-1.5" aria-label={`Step ${stepIndex + 1} of ${lesson.steps.length}`}>
              {lesson.steps.map((item, index) => (
                <span key={item.id} className={`mt-2 size-2.5 rounded-full ${passed.includes(item.id) ? "bg-success" : index === stepIndex ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
          <p className="mt-3 leading-relaxed">{step.prompt}</p>
          {unavailableFunctions.length > 0 && (
            <p role="status" className="mt-3 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm">
              Preview mode: the engine does not support {unavailableFunctions.join(", ")} yet. Check is disabled.
            </p>
          )}
          {canRevealHint && (
            <Button className="mt-3" size="sm" variant="outline" onClick={revealHint}>
              <Lightbulb aria-hidden className="size-4" />Hint {hintsUsed + 1}
            </Button>
          )}
          {hintsUsed > 0 && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm"><span className="mr-2 font-medium">Hint {hintsUsed}:</span>{step.hints[hintsUsed - 1]}</p>}
          {result && (
            <div role="status" className={`mt-3 rounded-md border px-3 py-2 text-sm ${result.status === "correct" ? "border-success/30 bg-success-soft" : "border-destructive/20 bg-error-soft"}`}>
              <p className="font-medium">{result.status === "correct" ? "Correct" : result.message}</p>
              {result.status === "correct" && <p className="mt-1">{result.message}</p>}
            </div>
          )}
        </div>

        {sheetStep ? (
          <>
            {step.workbook.sheets.length > 1 && (
              <div className="mb-2 flex gap-2 border-b" role="tablist" aria-label="Workbook sheets">
                {step.workbook.sheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    type="button"
                    role="tab"
                    aria-selected={activeSheet.name === sheet.name}
                    className={`border-b-2 px-3 py-2 text-sm ${activeSheet.name === sheet.name ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}
                    onClick={() => setSelectedSheet(sheet.name)}
                  >{sheet.name}</button>
                ))}
              </div>
            )}
            <div className="h-[min(62vh,680px)] min-h-[360px]">
              <Sheet
                key={`${step.id}:${activeSheet.name}`}
                cells={cells}
                onChange={(nextCells) => {
                  setCellsByStep((current) => ({
                    ...current,
                    [step.id]: { ...(current[step.id] ?? stepSheets), [activeSheet.name]: nextCells },
                  }));
                  if (step.workbook.sheets.length === 1) {
                    recordLessonProgress(lesson.id, { status: "in_progress", current_step: step.id, sheets: { [step.id]: nextCells } });
                  }
                  if (result?.status !== "correct") setResult(null);
                }}
                cols={size.cols}
                rows={size.rows}
                initialSelected={targetCells[0] ?? "A1"}
                highlight={targetCells}
                flash={flash}
                editableCells={targetCells}
                onEnterCheck={check}
                enterChecks
                variant="practice"
              />
            </div>
          </>
        ) : step.type === "shortcut" && step.validation.mode === "shortcut" ? (
          <ShortcutControl
            accepted={step.validation.accepted_sequences[platformShortcutKey()]}
            onChange={(sequence) => setInteractionAnswers((current) => ({
              ...current,
              [step.id]: { ...(current[step.id] ?? {}), sequence },
            }))}
          />
        ) : step.type === "mcq" && step.validation.mode === "mcq" ? (
          <fieldset className="space-y-3 rounded-lg border bg-card p-5">
            <legend className="px-1 text-sm font-medium">Choose one answer</legend>
            {step.validation.choices.map((choice) => (
              <label key={choice.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
                <input
                  type="radio"
                  name={`choice-${step.id}`}
                  value={choice.id}
                  checked={interaction.choice === choice.id}
                  onChange={() => setInteractionAnswers((current) => ({ ...current, [step.id]: { ...(current[step.id] ?? {}), choice: choice.id } }))}
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </fieldset>
        ) : isMenuActionStep(step) && step.validation.mode === "state" ? (
          <MenuActionControl
            step={step}
            expected={step.validation.expect}
            answers={interaction}
            onChange={(key, value) => setInteractionAnswers((current) => ({ ...current, [step.id]: { ...(current[step.id] ?? {}), [key]: value } }))}
          />
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{sheetStep ? "Press Enter to check your formula." : "Check your answer when you are ready."}</p>
          <Button onClick={() => check()} disabled={sheetStep && !supported}>{result?.status === "correct" ? stepIndex === lesson.steps.length - 1 ? "Finish lesson" : "Next step" : "Check"}</Button>
        </div>
      </section>
    </div>
  );
}

export function InvalidContentLesson({ id }: { id: string }) {
  return <div role="status" className="mx-auto max-w-xl px-6 py-24 text-center" data-lesson-id={id}><h1 className="font-serif text-3xl">This lesson is being updated</h1><p className="mt-3 text-muted-foreground">Please check back soon.</p><Button asChild className="mt-6"><Link to="/learn">Back to lessons</Link></Button></div>;
}
