import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lightbulb, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "./Sheet";
import type { Step } from "@/lib/lessons";
import { checkStep, type CheckResult } from "@/lib/validate";
import { recordComplete, recordMistake, xpFor } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function Player({ steps, title, exitTo = "/learn" }: { steps: Step[]; title: string; exitTo?: "/learn" | "/dashboard" | "/review" }) {
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
    setCells(step.workbook); setHints(0); setAttempts(0); setResult(null); setFlash(null);
  }, [step]);

  if (!step || done) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center animate-rise">
        <div className="mx-auto mb-6 grid size-12 place-items-center rounded-full bg-success-soft text-success"><Check className="size-6" /></div>
        <h1 className="font-serif text-4xl">{title} complete</h1>
        <p className="mt-3 text-muted-foreground">Nicely done. Mistakes you made are queued for review tomorrow.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline"><Link to="/dashboard">Back to Today</Link></Button>
          <Button asChild><Link to="/learn">Next lesson</Link></Button>
        </div>
      </div>
    );
  }

  const check = () => {
    if (result?.ok) return next();
    const r = checkStep(step, cells);
    setResult(r);
    setAttempts((a) => a + 1);
    setFlash({ cell: step.targetCells[0], kind: r.ok ? "correct" : "wrong", key: Date.now() });
    if (r.ok) recordComplete(step.id, attempts === 0, hints);
    else if (attempts === 0) recordMistake(step.id);
  };
  const next = () => (i + 1 >= steps.length ? setDone(true) : setI(i + 1));
  const showSolution = hints >= 3 && attempts > 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[380px_1fr]">
        <section className="flex min-h-0 flex-col overflow-auto rounded-xl border bg-card p-6 shadow-soft" aria-labelledby="task-title">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
            <Link to={exitTo} aria-label="Exit lesson" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></Link>
          </div>
          <div className="mt-3 flex gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>
            {steps.map((s, k) => <span key={s.id} className={cn("h-1 flex-1 rounded-full bg-muted transition-colors", k < i && "bg-primary", k === i && "bg-primary/40")} />)}
          </div>
          <h1 id="task-title" className="mt-6 text-xl font-semibold tracking-tight">{step.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.scenario}</p>
          <div className="mt-5 rounded-lg border-l-2 border-primary bg-accent/50 px-4 py-3 text-sm leading-relaxed">{step.prompt}</div>

          {hints > 0 && (
            <div className="mt-5 space-y-2">
              {step.hints.slice(0, hints).map((h, k) => (
                <div key={k} className="animate-rise rounded-lg border bg-background px-3 py-2 text-sm">
                  <span className="mr-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{["Nudge", "Hint", "Walkthrough"][k]}</span>
                  {k === 2 && !showSolution ? <span className="text-muted-foreground">Try once more to unlock the full solution.</span> : <span className={k === 2 ? "font-mono" : ""}>{h}</span>}
                </div>
              ))}
            </div>
          )}

          {result && (
            <div role="status" className={cn("mt-5 animate-rise rounded-lg border px-4 py-3 text-sm", result.ok ? "border-success/30 bg-success-soft" : "border-destructive/20 bg-error-soft")}>
              <p className={cn("font-medium", result.ok ? "text-success" : "text-destructive")}>
                {result.ok ? `Correct · +${xpFor(attempts === 1, hints)} XP` : result.message}
              </p>
              <p className="mt-1 text-foreground/80">{result.ok ? result.message : result.diagnosis}</p>
            </div>
          )}
          <p className="mt-auto pt-6 text-xs text-muted-foreground">Type in a cell, press <kbd className="rounded border px-1 font-mono">Enter</kbd> to confirm, <kbd className="rounded border px-1 font-mono">⌘/Ctrl+Enter</kbd> to check.</p>
        </section>

        <div className="min-h-[360px]">
          <Sheet cells={cells} onChange={(c) => { setCells(c); if (result && !result.ok) setResult(null); }} cols={step.cols} rows={step.rows}
            initialSelected={step.targetCells[0]} highlight={step.targetCells} flash={flash} onEnterCheck={check} />
        </div>
      </div>

      <footer className="flex items-center justify-between border-t bg-card px-5 py-3">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHints((h) => Math.min(3, h + 1))} disabled={hints >= 3 || result?.ok}>
            <Lightbulb className="size-4" />Hint {hints > 0 && <span className="text-muted-foreground">{hints}/3</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={next}><SkipForward className="size-4" />Skip</Button>
        </div>
        <Button onClick={check} className="min-w-32">{result?.ok ? <>Next <ArrowRight className="size-4" /></> : "Check"}</Button>
      </footer>
    </div>
  );
}
