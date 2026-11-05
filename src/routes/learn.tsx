import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LESSONS, type Lesson } from "@/lib/lessons";
import { useProgress, type Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Skill map · Gridwise" },
      { name: "description", content: "Six Excel skills, from basic formulas to lookups and data cleaning." },
      { property: "og:title", content: "Skill map · Gridwise" },
      { property: "og:description", content: "Pick an Excel skill and start practicing in a real spreadsheet." },
    ],
  }),
  component: Learn,
});

export function mastery(l: Lesson, p: Progress) {
  const done = l.steps.filter((s) => p.completed[s.id]).length;
  const missed = l.steps.filter((s) => p.mistakes[s.id]).length;
  if (done === 0 && missed === 0) return { label: "New", pct: 0, tone: "muted" as const };
  const pct = Math.round((done / l.steps.length) * 100);
  if (missed > 1) return { label: "Needs review", pct, tone: "warning" as const };
  if (pct === 100) return { label: "Strong", pct, tone: "success" as const };
  return { label: "Learning", pct, tone: "primary" as const };
}

function Learn() {
  const p = useProgress();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-serif text-5xl tracking-tight">Skill map</h1>
        <p className="mt-2 text-muted-foreground">Each skill is five short exercises. Start anywhere.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LESSONS.map((l, k) => {
            const m = mastery(l, p);
            return (
              <Link key={l.id} to="/practice/$lessonId" params={{ lessonId: l.id }}
                className="group relative flex flex-col rounded-2xl border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">0{k + 1} · {l.track}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight">{l.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{l.summary}</p>
                <div className="mt-6 flex items-center justify-between text-xs">
                  <span className={cn("rounded-full px-2 py-0.5 font-medium",
                    m.tone === "muted" && "bg-muted text-muted-foreground",
                    m.tone === "primary" && "bg-accent text-accent-foreground",
                    m.tone === "success" && "bg-success-soft text-success",
                    m.tone === "warning" && "bg-warning-soft text-foreground")}>{m.label}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3" />{l.estimatedMinutes} min</span>
                </div>
                <div className="mt-3 h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${m.pct}%` }} /></div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
