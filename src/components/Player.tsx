import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lightbulb, SkipForward, X } from "lucide-react";
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

// Detect example formula to display as a monospace chip under explanation
function getExampleFormula(s: Step): string | null {
  if ((s as any).exampleFormula) return (s as any).exampleFormula;
  const promptMatch = s.prompt?.match(/(?:typing|type|formula)\s+(=[A-Za-z0-9_+$:*/^&,() -]+)/i);
  if (promptMatch) return promptMatch[1].trim();
  const scenarioMatch = s.scenario?.match(/(?:typing|type|formula|try)\s+(=[A-Za-z0-9_+$:*/^&,() -]+)/i);
  if (scenarioMatch) return scenarioMatch[1].trim();
  const rawMatch = s.scenario?.match(/(?:^|\s)(=[A-Z0-9_]+(?:\([^)]*\)|[+*/^& -][A-Z0-9_$]+)?)(?:\s|$|[.])/i);
  if (rawMatch && !rawMatch[1].includes(" ")) return rawMatch[1].trim();
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

  // Single text field rule: show single text in explanation zone, keep callout populated
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

  const exampleFormula = getExampleFormula(step);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Main Practice Container */}
      <div className="flex-1 p-4 lg:p-6 pb-24 lg:pb-28">
        <div className="mx-auto flex max-w-[1780px] flex-col gap-6 lg:grid lg:grid-cols-[clamp(340px,28vw,440px)_1fr] items-stretch">
          {/* LEFT COLUMN: Lesson Card (clamp(340px, 28vw, 440px) on desktop) */}
          <section
            className="w-full rounded-2xl border bg-card p-6 shadow-soft flex flex-col justify-between"
            aria-labelledby="task-title"
          >
            <div>
              {/* Skill label with close X */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
                <Link
                  to={exitTo}
                  aria-label="Exit lesson"
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </Link>
              </div>

              {/* Segmented progress bar */}
              <div className="mt-3 flex gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>
                {steps.map((s, k) => (
                  <span
                    key={s.id}
                    className={cn(
                      "h-1.5 flex-1 rounded-full bg-muted transition-colors",
                      k < i && "bg-primary",
                      k === i && "bg-primary/50"
                    )}
                  />
                ))}
              </div>

              {/* Lesson title (30px) */}
              <h1
                id="task-title"
                className="mt-5 text-[var(--font-size-title,30px)] font-serif tracking-tight leading-tight text-foreground"
              >
                {step.title}
              </h1>

              {/* Green task callout ("what to do", 18px with generous padding) */}
              <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-50/85 dark:bg-emerald-950/25 dark:border-emerald-800/40 p-5 text-[var(--font-size-callout,18px)] leading-relaxed text-emerald-950 dark:text-emerald-100 font-medium shadow-xs">
                {calloutText}
              </div>

              {/* Hints */}
              {hints > 0 && (
                <div className="mt-5 space-y-2.5">
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

              {/* Correct / Not-quite feedback */}
              {result && (
                <div
                  role="status"
                  className={cn(
                    "mt-5 animate-rise rounded-xl border p-4 text-sm",
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
            </div>

            {/* Keyboard tip pinned to bottom */}
            <p className="mt-8 pt-4 border-t text-xs text-muted-foreground">
              Type in a cell, press <kbd className="rounded border px-1.5 py-0.5 font-mono bg-muted/60">Enter</kbd> to confirm,{" "}
              <kbd className="rounded border px-1.5 py-0.5 font-mono bg-muted/60">⌘/Ctrl+Enter</kbd> to check.
            </p>
          </section>

          {/* RIGHT COLUMN: Split Vertically (Explanation Zone on top, Spreadsheet below) */}
          <div className="flex flex-col min-w-0 gap-6">
            {/* a) TOP: Explanation Zone (max-height 40vh, scrolls internally, 22px / clamp(20px, 1.8vw, 24px)) */}
            <section
              aria-label="Lesson explanation"
              className="w-full rounded-2xl border bg-card p-6 shadow-soft max-h-[40vh] overflow-y-auto shrink-0 flex flex-col justify-center"
            >
              <FormattedText
                text={explanationText}
                className="text-[var(--font-size-explanation,22px)] leading-[1.5] text-foreground/90 selection:bg-primary/20"
              />
              {exampleFormula && (
                <div className="mt-4">
                  <span className="inline-block font-mono text-[var(--font-size-chip,20px)] font-medium text-[var(--color-chip-text)] bg-[var(--color-chip-bg)] border border-rose-200/80 dark:border-rose-900/50 rounded-xl px-4 py-2 shadow-xs select-all">
                    {exampleFormula}
                  </span>
                </div>
              )}
            </section>

            {/* b) BELOW: Spreadsheet Card (takes remaining height, min-height 320px) */}
            <div className="w-full flex-1 min-h-[320px] rounded-2xl overflow-hidden border shadow-soft bg-card flex flex-col">
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
          </div>
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
