import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lightbulb, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "./Sheet";
import type { Step } from "@/lib/lessons";
import { checkStep, type CheckResult } from "@/lib/validate";
import { recordComplete, recordMistake, xpFor } from "@/lib/progress";
import { cn } from "@/lib/utils";

// Safely render **bold** key terms and `inline code` without raw HTML injection
function FormattedText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      tokens.push(
        <strong key={match.index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      tokens.push(
        <code
          key={match.index}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] font-medium text-foreground"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return <p className={className}>{tokens}</p>;
}

function FormattedContent({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) {
    return <FormattedText text={text} className={className} />;
  }
  return (
    <div className="space-y-4">
      {paragraphs.map((p, idx) => (
        <FormattedText key={idx} text={p} className={className} />
      ))}
    </div>
  );
}

type PracticalExample = {
  formula: string;
  description: string;
};

// Safe built-in practical examples that use different cells/values than the task
function getPracticalExample(step: Step): PracticalExample | null {
  // 1. Explicit example from JSON if present
  if ((step as any).example && typeof (step as any).example === "object") {
    return (step as any).example as PracticalExample;
  }

  // 2. Built-in map keyed by step title
  const exampleMap: Record<string, PracticalExample> = {
    // Intro to Excel
    "Your first formula": {
      formula: "=10+4",
      description: "calculates the sum of 10 and 4 directly in the cell.",
    },
    "Cell references": {
      formula: "=A1+A2",
      description: "adds the values stored in cells A1 and A2 together.",
    },
    "Functions": {
      formula: "=SUM(A1, B1)",
      description: "uses the SUM function to add values separated by commas.",
    },
    "Ranges": {
      formula: "=SUM(A1:A5)",
      description: "adds every number from cell A1 through cell A5.",
    },

    // Formulas & Arithmetic (Basics)
    "Subtraction": {
      formula: "=A1-B2",
      description: "subtracts the value in B2 from the value in A1.",
    },
    "Order of operations": {
      formula: "=A1*(B1-5)",
      description: "uses parentheses to calculate the subtraction before multiplying.",
    },
    "Percentages": {
      formula: "=A2*(1+10%)",
      description: "multiplies by (1 + rate) to apply a percentage increase in one step.",
    },
    "Absolute references": {
      formula: "=A2*$C$1",
      description: "locks column C and row 1 with $ signs so the rate stays fixed when copied.",
    },

    // Math & Stats
    "SUM a range": {
      formula: "=SUM(D2:D8)",
      description: "adds up all values in the column range D2 through D8.",
    },
    "AVERAGE": {
      formula: "=AVERAGE(B2:B8)",
      description: "calculates the arithmetic mean of numbers in B2:B8.",
    },
    "MAX": {
      formula: "=MAX(A2:A10)",
      description: "returns the highest number from the range A2:A10.",
    },
    "ROUND": {
      formula: "=ROUND(AVERAGE(A1:A5), 2)",
      description: "computes the average and rounds the result to 2 decimal places.",
    },
    "COUNTA": {
      formula: "=COUNTA(B1:B10)",
      description: "counts all cells containing text or numbers, ignoring blanks.",
    },

    // Decisions with IF (Logical)
    "Simple IF": {
      formula: '=IF(A1>=50, "Pass", "Fail")',
      description: 'evaluates a condition and returns "Pass" if true, otherwise "Fail".',
    },
    "IF with math": {
      formula: '=IF(A2="East", 100, 0)',
      description: 'checks if text matches "East" and returns 100 or 0.',
    },
    "AND": {
      formula: '=IF(AND(A1>0, B1>0), "Valid", "")',
      description: "evaluates to true only if both conditions inside AND() are met.",
    },
    "SUMIF": {
      formula: '=SUMIF(A2:A10, "North", D2:D10)',
      description: 'sums values in D2:D10 where column A matches "North".',
    },
    "COUNTIF": {
      formula: '=COUNTIF(A2:A10, ">50")',
      description: 'counts the number of cells in A2:A10 with values over 50.',
    },

    // Lookups
    "VLOOKUP exact": {
      formula: '=VLOOKUP(A1, C1:E10, 2, FALSE)',
      description: 'searches for A1 in column C and retrieves the value from column D.',
    },
    "XLOOKUP": {
      formula: '=XLOOKUP(A1, B1:B10, C1:C10)',
      description: 'looks up A1 in B1:B10 and returns the matching item from C1:C10.',
    },
    "Look left": {
      formula: '=XLOOKUP(A1, D1:D10, B1:B10)',
      description: 'retrieves data from column B to the left of the lookup column D.',
    },
    "INDEX + MATCH": {
      formula: '=INDEX(A1:A10, MATCH(B1, C1:C10, 0))',
      description: 'uses MATCH to locate the row index and INDEX to fetch the value.',
    },
    "Handle missing IDs": {
      formula: '=XLOOKUP(A1, B1:B10, C1:C10, "Missing")',
      description: 'specifies a fallback value when the lookup key is not found.',
    },

    // Text
    "Join with &": {
      formula: '=C1&" "&D1',
      description: 'joins two text cells together separated by a space.',
    },
    "LEFT": {
      formula: '=LEFT(A1, 2)',
      description: 'extracts the first 2 characters from the beginning of cell A1.',
    },
    "TRIM": {
      formula: '=TRIM(C1)',
      description: 'removes extra leading, trailing, and repeated spaces from text.',
    },
    "PROPER": {
      formula: '=PROPER(C1)',
      description: 'converts text to title case with initial capital letters.',
    },
    "LEN": {
      formula: '=LEN(C1)',
      description: 'returns the total count of characters in cell C1.',
    },

    // Cleaning
    "Numbers stored as text": {
      formula: '=VALUE(SUBSTITUTE(C1, "$", ""))',
      description: 'strips currency symbols and converts the string into a numeric value.',
    },
    "SUBSTITUTE": {
      formula: '=SUBSTITUTE(C1, "/", "-")',
      description: 'replaces all occurrences of "/" with "-" in cell C1.',
    },
    "Guard #DIV/0!": {
      formula: '=IFERROR(C1/D1, 0)',
      description: 'returns 0 if the calculation results in an error.',
    },
    "Fix the range": {
      formula: '=SUM(A1:A10)',
      description: 'ensures the range covers all intended rows without missing the last row.',
    },
    "Flag duplicates": {
      formula: '=IF(COUNTIF($B$1:$B$10, B1) > 1, "Duplicate", "")',
      description: 'flags items that appear more than once in the locked range.',
    },
  };

  if (exampleMap[step.title]) {
    return exampleMap[step.title];
  }

  // 3. Fallback to required function
  const reqFn = step.validation?.requiredFunctions?.[0];
  if (reqFn) {
    const fnMap: Record<string, PracticalExample> = {
      SUM: { formula: "=SUM(A1:A5)", description: "adds all values in the range A1:A5." },
      AVERAGE: { formula: "=AVERAGE(A1:A5)", description: "calculates the average of the range." },
      MAX: { formula: "=MAX(A1:A5)", description: "returns the maximum value in A1:A5." },
      MIN: { formula: "=MIN(A1:A5)", description: "returns the minimum value in A1:A5." },
      ROUND: { formula: "=ROUND(A1, 1)", description: "rounds the number to 1 decimal place." },
      COUNTA: { formula: "=COUNTA(A1:A10)", description: "counts non-empty cells in the range." },
      COUNT: { formula: "=COUNT(A1:A10)", description: "counts numeric cells in the range." },
      IF: { formula: '=IF(A1>10, "Yes", "No")', description: 'returns "Yes" if A1 > 10, else "No".' },
      AND: { formula: '=IF(AND(A1>0, B1>0), 1, 0)', description: "checks if both conditions are true." },
      SUMIF: { formula: '=SUMIF(A1:A10, "X", B1:B10)', description: 'sums B1:B10 where column A is "X".' },
      COUNTIF: { formula: '=COUNTIF(A1:A10, ">0")', description: "counts cells with values greater than 0." },
      VLOOKUP: { formula: '=VLOOKUP(A1, D1:F10, 2, FALSE)', description: "finds A1 in column D and returns column E." },
      XLOOKUP: { formula: '=XLOOKUP(A1, C1:C10, D1:D10)', description: "matches A1 in C and returns value from D." },
      INDEX: { formula: '=INDEX(A1:A10, 3)', description: "returns the value in the 3rd row of A1:A10." },
      MATCH: { formula: '=MATCH(A1, B1:B10, 0)', description: "finds the row position of A1 in B1:B10." },
      LEFT: { formula: '=LEFT(A1, 3)', description: "takes the first 3 characters from A1." },
      TRIM: { formula: '=TRIM(A1)', description: "removes extra whitespace from text in A1." },
      PROPER: { formula: '=PROPER(A1)', description: "formats text in A1 with capitalized words." },
      LEN: { formula: '=LEN(A1)', description: "counts the number of characters in A1." },
      SUBSTITUTE: { formula: '=SUBSTITUTE(A1, "a", "b")', description: 'replaces "a" with "b" in cell A1.' },
      IFERROR: { formula: '=IFERROR(A1/B1, 0)', description: "returns 0 if the formula errors." },
    };
    if (fnMap[reqFn]) return fnMap[reqFn];
  }

  // 4. Fallback to multiplication if formula has *
  if (step.solution?.includes("*") && !step.solution?.includes("SUM")) {
    return { formula: "=B2*C2", description: "multiplies Units by Price to compute revenue." };
  }

  return null;
}

export function Player({
  steps,
  title,
  exitTo = "/learn",
}: {
  steps: Step[];
  title: string;
  exitTo?: "/learn" | "/dashboard" | "/review";
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const [cells, setCells] = useState(step?.workbook ?? {});
  const [hints, setHints] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [flash, setFlash] = useState<{ cell: string; kind: "correct" | "wrong"; key: number } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!step) return;
    setCells(step.workbook);
    setHints(0);
    setAttempts(0);
    setResult(null);
    setFlash(null);
  }, [step]);

  if (!step || done) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center animate-rise">
        <div className="mx-auto mb-6 grid size-12 place-items-center rounded-full bg-success-soft text-success">
          <Check className="size-6" />
        </div>
        <h1 className="font-serif text-4xl">{title} complete</h1>
        <p className="mt-3 text-muted-foreground">Nicely done. Mistakes you made are queued for review tomorrow.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline" className="text-[var(--font-size-btn,16px)]">
            <Link to="/dashboard">Back to Today</Link>
          </Button>
          <Button asChild className="text-[var(--font-size-btn,16px)]">
            <Link to="/learn">Next lesson</Link>
          </Button>
        </div>
      </div>
    );
  }

  const check = () => {
    if (result?.ok) return next();
    const r = checkStep(step, cells);
    setResult(r);
    setAttempts((a) => a + 1);
    setFlash({ cell: step.targetCells[0]!, kind: r.ok ? "correct" : "wrong", key: Date.now() });
    if (r.ok) recordComplete(step.id, attempts === 0, hints);
    else if (attempts === 0) recordMistake(step.id);
  };

  const next = () => (i + 1 >= steps.length ? setDone(true) : setI(i + 1));
  const showSolution = hints >= 3 && attempts > 0;

  // Single text field handling
  const hasScenario = Boolean(step.scenario && step.scenario.trim());
  const hasPrompt = Boolean(step.prompt && step.prompt.trim());

  let explanationText = "";
  let calloutText = "";

  if (hasScenario && hasPrompt) {
    explanationText = step.scenario;
    calloutText = step.prompt;
  } else if (hasScenario && !hasPrompt) {
    explanationText = step.scenario;
    calloutText = "Calculate the result according to the scenario above.";
  } else if (!hasScenario && hasPrompt) {
    explanationText = step.prompt;
    calloutText = "Enter the required formula in the designated cell to continue.";
  } else {
    explanationText = step.title;
    calloutText = "Complete the formula in the highlighted cell.";
  }

  const practicalExample = getPracticalExample(step);
  const progressPercent = Math.round((i / steps.length) * 100);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background p-4 lg:p-6 pb-24 lg:pb-28">
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-4 flex-1 min-h-0">
        {/* Title & Continuous Progress Bar (matching screenshot) */}
        <div className="flex flex-col gap-2 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">
            {title}
          </h1>
          <div className="flex items-center gap-3 w-full">
            <span className="text-sm sm:text-base font-semibold tabular-nums text-foreground/80 shrink-0">
              {progressPercent}%
            </span>
            <div className="flex-1 h-2.5 sm:h-3 rounded-full bg-slate-200/90 dark:bg-muted overflow-hidden shadow-inner">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. LESSON EXPLANATION PANEL (One wide clean card above the spreadsheet) */}
        <section
          aria-label="Lesson explanation and task"
          className="w-full rounded-xl border border-slate-300/80 dark:border-border bg-card p-6 shadow-xs max-h-[38vh] overflow-y-auto shrink-0 flex flex-col gap-4"
        >
          {/* Explanation paragraphs */}
          <FormattedContent
            text={explanationText}
            className="text-[var(--font-size-explanation,21px)] leading-relaxed text-foreground/90 selection:bg-primary/20"
          />

          {/* Practical example: inline */}
          {practicalExample && (
            <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                Example:
              </span>
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold text-primary">
                {practicalExample.formula}
              </code>
              <span className="text-sm text-foreground/80">
                — {practicalExample.description}
              </span>
            </div>
          )}

          {/* Task line in prominent bold, just like screenshot */}
          <div className="pt-1">
            <p className="text-xl sm:text-[22px] font-bold text-foreground leading-snug">
              {calloutText}
            </p>
          </div>

          {/* e) Hints and Correct/Not-quite feedback appear right under the task */}
          {hints > 0 && (
            <div className="space-y-2.5">
              {step.hints.slice(0, hints).map((h, k) => (
                <div key={k} className="animate-rise rounded-xl border bg-background p-3.5 text-sm">
                  <span className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {["Nudge", "Hint", "Walkthrough"][k]}
                  </span>
                  {k === 2 && !showSolution ? (
                    <span className="text-muted-foreground">Try once more to unlock the full solution.</span>
                  ) : (
                    <span className={k === 2 ? "font-mono font-medium" : ""}>{h}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {result && (
            <div
              role="status"
              className={cn(
                "animate-rise rounded-xl border p-4 text-sm",
                result.ok ? "border-success/30 bg-success-soft" : "border-destructive/20 bg-error-soft"
              )}
            >
              <p className={cn("font-semibold text-[15px]", result.ok ? "text-success" : "text-destructive")}>
                {result.ok ? `Correct · +${xpFor(attempts === 1, hints)} XP` : result.message}
              </p>
              <p className="mt-1 text-foreground/85 leading-normal">
                {result.ok ? result.message : result.diagnosis}
              </p>
            </div>
          )}
        </section>

        {/* 3. TABLE: Spreadsheet card below the panel */}
        <div className="flex-1 min-h-[300px] flex flex-col min-w-0">
          <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-300/80 dark:border-border shadow-xs bg-card flex flex-col min-h-[300px]">
            <Sheet
              cells={cells}
              onChange={(c) => {
                setCells(c);
                if (result && !result.ok) setResult(null);
              }}
              cols={step.cols}
              rows={step.rows}
              initialSelected={step.targetCells[0]!}
              highlight={step.targetCells}
              flash={flash}
              onEnterCheck={check}
            />
          </div>

          {/* Keyboard tip moved under the table */}
          <p className="mt-2.5 text-xs text-muted-foreground text-center sm:text-left px-2">
            Type in a cell, press <kbd className="rounded border px-1.5 py-0.5 font-mono bg-muted/60">Enter</kbd> to confirm,{" "}
            <kbd className="rounded border px-1.5 py-0.5 font-mono bg-muted/60">⌘/Ctrl+Enter</kbd> to check.
          </p>
        </div>
      </div>

      {/* Fixed Bottom Bar (Hint, Skip, Check/Continue) */}
      <footer className="fixed bottom-0 inset-x-0 z-20 flex items-center justify-between border-t bg-card/95 px-6 py-3.5 backdrop-blur-md shadow-lg">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHints((h) => Math.min(3, h + 1))}
            disabled={hints >= 3 || result?.ok}
            className="text-[var(--font-size-btn,16px)] h-10 px-4"
          >
            <Lightbulb className="size-4 mr-1.5" />
            Hint {hints > 0 && <span className="ml-1 text-muted-foreground">({hints}/3)</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={next}
            className="text-[var(--font-size-btn,16px)] h-10 px-4"
          >
            <SkipForward className="size-4 mr-1.5" />
            Skip
          </Button>
        </div>
        <Button
          onClick={check}
          className="min-w-36 h-10 text-[var(--font-size-btn,16px)] font-medium"
        >
          {result?.ok ? (
            <>
              Continue <ArrowRight className="size-4 ml-1.5" />
            </>
          ) : (
            "Check"
          )}
        </Button>
      </footer>
    </div>
  );
}
