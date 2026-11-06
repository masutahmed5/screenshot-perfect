import { useState, useEffect, useRef } from "react";
import { Check, Copy, HelpCircle, Lock, Sparkles, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Step } from "@/lib/lessons";
import { cn } from "@/lib/utils";

// Safely render **bold** and `code` without raw HTML injection
function SafeFormatted({ text, className }: { text: string; className?: string }) {
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
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] font-medium text-foreground"
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

export type ExplanationData = {
  understand: string;
  answer: string;
  steps: string[];
  why: string;
  mistakes: string[];
  tryIt?: string;
};

// Case-insensitive field reader helper
function getField(obj: Record<string, any>, names: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = Object.keys(obj);
  for (const name of names) {
    const found = keys.find((k) => k.toLowerCase() === name.toLowerCase());
    if (found && obj[found] !== undefined && obj[found] !== null && obj[found] !== "") {
      return obj[found];
    }
  }
  return undefined;
}

// Auto-build rich explanation from the step data or solution formula
export function resolveExplanationData(step: Step, lessonTitle: string): ExplanationData {
  const raw = step as Record<string, any>;
  const target = step.targetCells?.[0] || "the cell";
  const solution = (getField(raw, ["answer", "solution", "expected", "formula"]) || step.solution || "").trim();

  // 1. Direct fields if present in JSON
  const rawUnderstand = getField(raw, ["understand", "explanation", "concept", "theory", "intro"]);
  const rawSteps = getField(raw, ["steps", "walkthrough", "howto"]);
  const rawWhy = getField(raw, ["why", "reason", "logic"]);
  const rawMistakes = getField(raw, ["mistakes", "commonerrors", "pitfalls"]);
  const rawTryIt = getField(raw, ["tryit", "example", "practice", "variation"]);

  // 2. Built-in function knowledge map
  const sUpper = solution.toUpperCase();
  let defaultUnderstand = "";
  let defaultWhy = "";
  let defaultMistakes: string[] = [
    "Forgetting to start the formula with an **`=`** sign.",
    "Typing hardcoded values instead of referencing cells.",
  ];
  let defaultTryIt: string | undefined = undefined;

  if (sUpper.includes("SUM(")) {
    defaultUnderstand = "The **`SUM`** function adds up numbers across a range of cells automatically. A **range** like `C1:C4` represents a rectangular group of cells from the top-left to the bottom-right.";
    defaultWhy = `Entering **\`${solution}\`** into cell **${target}** instructs Excel to sum the specified cells together, keeping the total updated if any number changes.`;
    defaultMistakes = [
      "Using a comma instead of a colon (e.g. `C1, C4` only adds two cells, while `C1:C4` adds all cells in between).",
      "Forgetting the closing parenthesis **`)`** at the end.",
      "Leaving off the leading **`=`** sign.",
    ];
    defaultTryIt = "Try adding a fixed number to the sum: add `+ 10` at the end.";
  } else if (sUpper.includes("AVERAGE(")) {
    defaultUnderstand = "The **`AVERAGE`** function calculates the arithmetic mean of a group of numbers by adding them all together and dividing by the total count.";
    defaultWhy = `The formula **\`${solution}\`** reads all numbers in the designated range and displays their average in cell **${target}**.`;
    defaultMistakes = [
      "Including blank header rows or text cells in the range.",
      "Misspelling the function name as `AVG` instead of `AVERAGE`.",
    ];
    defaultTryIt = "Try wrapping the formula in `ROUND(..., 1)` to round to one decimal place.";
  } else if (sUpper.includes("IF(")) {
    defaultUnderstand = "The **`IF`** function allows Excel to make decisions. It evaluates a logical condition (like whether a score is >= 50): if true, it outputs one value; if false, it outputs another.";
    defaultWhy = `In cell **${target}**, the formula tests the condition and dynamically returns the correct label or number based on the table data.`;
    defaultMistakes = [
      "Forgetting double quotes around text results (e.g. `\"Pass\"` instead of `Pass`).",
      "Misplacing the commas that separate the condition, the true value, and the false value.",
    ];
  } else if (sUpper.includes("VLOOKUP(")) {
    defaultUnderstand = "The **`VLOOKUP`** function searches vertically down the first column of a table to match a key (like an ID or Name), then retrieves data from another column in that row.";
    defaultWhy = `The formula searches the first column of the table range and pulls the matching value into **${target}**.`;
    defaultMistakes = [
      "Leaving off `FALSE` as the 4th argument when you need an exact match.",
      "Counting column numbers incorrectly (column 1 is always the leftmost column of the lookup range).",
    ];
  } else if (sUpper.includes("XLOOKUP(")) {
    defaultUnderstand = "The **`XLOOKUP`** function is Excel's modern, flexible lookup tool. It pairs a lookup column with a return column, works in any direction, and defaults to exact matches.";
    defaultWhy = `The lookup key is matched in the search range and returns the corresponding value directly to **${target}**.`;
    defaultMistakes = [
      "Providing lookup and return ranges that have different heights or lengths.",
      "Reversing the lookup range and return range arguments.",
    ];
  } else if (sUpper.includes("*")) {
    defaultUnderstand = "In Excel, multiplication is written with the asterisk **`*`** symbol. When multiplying two cells (like **Units × Price**), cell references keep the calculated revenue accurate whenever quantities change.";
    defaultWhy = `Multiplying the two cell values in **${target}** calculates the total for that row. If prices or units are adjusted later, the total recalculates automatically.`;
    defaultMistakes = [
      "Typing the letter `x` instead of the asterisk `*` for multiplication.",
      "Typing raw numbers instead of cell references.",
    ];
    defaultTryIt = "Try applying a 10% discount by multiplying the formula by `0.9`.";
  } else if (sUpper.includes("+") || sUpper.includes("-") || sUpper.includes("/")) {
    defaultUnderstand = "Excel formulas always begin with an **equals sign (=)**. A **cell reference** (like `B1`) acts as the address of a cell, reading whatever number is stored inside.";
    defaultWhy = `The formula performs the arithmetic calculation using the values from the referenced cells and displays the result in **${target}**.`;
    defaultMistakes = [
      "Forgetting the initial **`=`** sign, causing Excel to display the text literally.",
      "Referencing the wrong row or column coordinate.",
    ];
  } else {
    defaultUnderstand = step.scenario || `This exercise practices **${step.title}** in ${lessonTitle}. Enter the required formula into cell ${target}.`;
    defaultWhy = `Applying the formula **\`${solution}\`** correctly resolves the prompt for cell **${target}**.`;
  }

  // Final structured object
  const understand = typeof rawUnderstand === "string" ? rawUnderstand : (step.scenario || defaultUnderstand);
  const answer = solution;

  let stepsList: string[] = [];
  if (Array.isArray(rawSteps)) {
    stepsList = rawSteps.map(String);
  } else if (typeof rawSteps === "string") {
    stepsList = rawSteps.split(/\n+/).map((s) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
  } else {
    stepsList = [
      `Click on cell **${target}** to select it.`,
      `Type **\`${solution}\`** into the cell.`,
      `Press **Enter** to confirm the formula.`,
    ];
  }

  let mistakesList: string[] = [];
  if (Array.isArray(rawMistakes)) {
    mistakesList = rawMistakes.map((m: any) => (typeof m === "string" ? m : m.message || JSON.stringify(m)));
  } else if (Array.isArray(step.commonMistakes)) {
    mistakesList = step.commonMistakes.map((m) => m.message);
  } else {
    mistakesList = defaultMistakes;
  }

  const why = typeof rawWhy === "string" ? rawWhy : (step.explanation || defaultWhy);
  const tryIt = typeof rawTryIt === "string" ? rawTryIt : defaultTryIt;

  return {
    understand,
    answer,
    steps: stepsList,
    why,
    mistakes: mistakesList,
    tryIt,
  };
}

export function AnswerExplanationPanel({
  step,
  lessonTitle,
  attempts,
  result,
  isOpen,
  onClose,
  isCompleted,
  onSkip,
}: {
  step: Step;
  lessonTitle: string;
  attempts: number;
  result: { ok: boolean; message?: string } | null;
  isOpen: boolean;
  onClose: () => void;
  isCompleted: boolean;
  onSkip?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Persistent unlocks per step using dedicated localStorage key
  const [unlockedMap, setUnlockedMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("gridwise_unlocked_answers");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const isUnlocked = isCompleted || Boolean(unlockedMap[step.id]) || Boolean(result?.ok);

  // Auto-unlock when correct or completed
  useEffect(() => {
    if ((result?.ok || isCompleted) && !unlockedMap[step.id]) {
      setUnlockedMap((prev) => {
        const next = { ...prev, [step.id]: true };
        try {
          localStorage.setItem("gridwise_unlocked_answers", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [result?.ok, isCompleted, step.id, unlockedMap]);

  // Reset scroll to top when step changes
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step.id]);

  const handleManualUnlock = () => {
    setUnlockedMap((prev) => {
      const next = { ...prev, [step.id]: true };
      try {
        localStorage.setItem("gridwise_unlocked_answers", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const copyAnswer = async () => {
    if (!data.answer) return;
    try {
      await navigator.clipboard.writeText(data.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const data = resolveExplanationData(step, lessonTitle);

  // Close overlay on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const content = (
    <div
      ref={panelRef}
      className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-[18px] leading-[1.6] text-foreground/90"
    >
      {/* A) Understand the idea (Always visible) */}
      <section aria-labelledby="section-understand" className="space-y-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-primary shrink-0" />
          <h2 id="section-understand" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Understand the idea
          </h2>
        </div>
        <SafeFormatted text={data.understand} className="text-[18px] leading-[1.6] text-foreground/90" />
      </section>

      <hr className="border-border/60" />

      {/* B) Show the answer (Locked by default, auto-unlocks after correct/skip or manual unlock) */}
      <section aria-labelledby="section-answer" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 id="section-answer" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Answer
            </h2>
          </div>
          {isUnlocked && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Unlocked
            </span>
          )}
        </div>

        {isUnlocked ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 p-3.5 flex items-center justify-between gap-3 shadow-xs">
            <code className="font-mono text-lg font-bold text-emerald-950 dark:text-emerald-200 select-all">
              {data.answer}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={copyAnswer}
              className="h-8 px-2.5 text-xs font-medium shrink-0 bg-card hover:bg-accent"
              title="Copy formula"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 mr-1 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5 mr-1" /> Copy
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-4 text-center space-y-2">
            <Lock className="size-4 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">
              Locked to encourage trying first. Solve the challenge or reveal when ready.
            </p>
            {attempts >= 2 && (
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 py-1 px-2 rounded-lg">
                Stuck? You can view the answer.
              </p>
            )}
            <Button
              size="sm"
              variant={attempts >= 2 ? "default" : "outline"}
              onClick={handleManualUnlock}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              Show Answer
            </Button>
          </div>
        )}
      </section>

      <hr className="border-border/60" />

      {/* C) Step by step (Unlocks with the answer) */}
      <section aria-labelledby="section-steps" className="space-y-3">
        <h2 id="section-steps" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Step by step
        </h2>
        {isUnlocked ? (
          <ol className="space-y-2.5">
            {data.steps.map((stepItem, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[19px] sm:text-[20px] font-medium leading-relaxed">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <SafeFormatted text={stepItem} className="text-[19px] sm:text-[20px] font-medium text-foreground" />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-center">
            <span className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="size-3.5" /> Unlocks with the answer
            </span>
          </div>
        )}
      </section>

      <hr className="border-border/60" />

      {/* D) Why it works (Unlocks with the answer) */}
      <section aria-labelledby="section-why" className="space-y-2">
        <h2 id="section-why" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Why it works
        </h2>
        {isUnlocked ? (
          <SafeFormatted text={data.why} className="text-[18px] leading-[1.6] text-foreground/90" />
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-center">
            <span className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="size-3.5" /> Unlocks with the answer
            </span>
          </div>
        )}
      </section>

      <hr className="border-border/60" />

      {/* E) Common mistakes (Always visible) */}
      {data.mistakes.length > 0 && (
        <section aria-labelledby="section-mistakes" className="space-y-2.5">
          <h2 id="section-mistakes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Common mistakes
          </h2>
          <ul className="space-y-2 text-[18px] leading-[1.6]">
            {data.mistakes.map((m, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-destructive font-bold text-base leading-snug shrink-0">✕</span>
                <SafeFormatted text={m} className="text-[18px] text-foreground/85 leading-[1.6]" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* F) Try it yourself (Optional mini-variation) */}
      {data.tryIt && (
        <>
          <hr className="border-border/60" />
          <section aria-labelledby="section-tryit" className="space-y-2">
            <h2 id="section-tryit" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Try it yourself
            </h2>
            {isUnlocked ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[18px] leading-[1.6] text-foreground/90">
                <SafeFormatted text={data.tryIt} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-center">
                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Lock className="size-3.5" /> Unlocks with the answer
                </span>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP PANEL (at >= 1280px / xl: sits right in the flex layout) */}
      {isOpen && (
        <aside
          id="answer-explanation-panel"
          role="region"
          aria-label="Answer & Explanation"
          className="hidden xl:flex w-[360px] shrink-0 flex-col border-l bg-card/60 transition-all duration-200 z-10"
        >
          {/* Header styled like the left All Lessons header */}
          <div className="px-4 py-3.5 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Answer & Explanation
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close explanation panel"
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
          {content}
        </aside>
      )}

      {/* 2. OVERLAY / TABLET DRAWER (between 768px and 1279px) & MOBILE BOTTOM SHEET (< 768px) */}
      {/* Scrim Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 xl:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tablet Slide-in Drawer (768px to 1279px) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Answer & Explanation"
        className={cn(
          "fixed inset-y-0 right-0 z-50 hidden sm:flex xl:hidden w-[360px] max-w-[85vw] flex-col border-l bg-card shadow-2xl transition-transform duration-250 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
      >
        <div className="px-4 py-3.5 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Answer & Explanation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close explanation panel"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>
        {content}
      </aside>

      {/* Mobile Bottom Sheet (< 768px) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Answer & Explanation"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex sm:hidden max-h-[80vh] flex-col rounded-t-2xl border-t bg-card shadow-2xl transition-transform duration-250 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Answer & Explanation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close explanation panel"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>
        {content}
      </aside>
    </>
  );
}
