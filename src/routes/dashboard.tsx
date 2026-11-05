import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LESSONS } from "@/lib/lessons";
import { useProgress } from "@/lib/progress";
import { mastery } from "./learn";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Today · Gridwise" },
      { name: "description", content: "Your daily Excel practice: continue, review and track your skills." },
      { property: "og:title", content: "Today · Gridwise" },
      { property: "og:description", content: "Pick up where you left off in Excel practice." },
    ],
  }),
  component: Dashboard,
});

function Radar({ values }: { values: { label: string; v: number }[] }) {
  const n = values.length, R = 90, cx = 120, cy = 110;
  const pt = (k: number, r: number) => [cx + r * Math.sin((2 * Math.PI * k) / n), cy - r * Math.cos((2 * Math.PI * k) / n)];
  const poly = values.map((x, k) => pt(k, R * Math.max(0.04, x.v)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 240 225" className="w-full" role="img" aria-label="Skill radar chart">
      {[0.33, 0.66, 1].map((s) => <polygon key={s} points={values.map((_, k) => pt(k, R * s).join(",")).join(" ")} className="fill-none stroke-border" />)}
      {values.map((_, k) => { const [x, y] = pt(k, R); return <line key={k} x1={cx} y1={cy} x2={x} y2={y} className="stroke-border" />; })}
      <polygon points={poly} className="fill-primary/15 stroke-primary" strokeWidth={1.5} />
      {values.map((x, k) => { const [px, py] = pt(k, R + 16); return <text key={x.label} x={px} y={py} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[9px]">{x.label}</text>; })}
    </svg>
  );
}

function Dashboard() {
  const p = useProgress();
  const next = LESSONS.find((l) => l.steps.some((s) => !p.completed[s.id])) ?? LESSONS[0];
  const nextDone = next.steps.filter((s) => p.completed[s.id]).length;
  const review = Object.keys(p.mistakes).length;
  const total = LESSONS.reduce((a, l) => a + l.steps.length, 0);
  const completed = Object.keys(p.completed).length;
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 font-serif text-5xl tracking-tight">Today</h1>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border bg-secondary p-7 text-secondary-foreground shadow-lift lg:col-span-2">
            <div className="absolute inset-0 grid-motif opacity-10" />
            <div className="relative">
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">{nextDone ? "Continue" : "Up next"} · {next.track}</span>
              <h2 className="mt-3 font-serif text-3xl">{next.title}</h2>
              <p className="mt-2 max-w-md text-sm opacity-75">{next.summary}</p>
              <div className="mt-6 flex items-center gap-4">
                <Button asChild variant="hero"><Link to="/practice/$lessonId" params={{ lessonId: next.id }}>{nextDone ? "Continue" : "Start"} <ArrowRight className="size-4" /></Link></Button>
                <span className="text-sm opacity-70">{nextDone}/{next.steps.length} done · {next.estimatedMinutes} min</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-medium"><RotateCcw className="size-4 text-primary" />5-minute review</div>
            <p className="mt-2 text-sm text-muted-foreground">{review ? `${review} exercise${review > 1 ? "s" : ""} you missed, ready to retry.` : "Nothing yet. Missed exercises appear here."}</p>
            <Button asChild variant="outline" className="mt-auto" disabled={!review}><Link to="/review">Start review</Link></Button>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="text-sm font-medium">Progress</div>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-muted-foreground">XP</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{p.xp}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Streak</dt><dd className="mt-1 flex items-center gap-1 text-2xl font-semibold tabular-nums"><Flame className="size-5 text-warning" />{p.streak}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Exercises</dt><dd className="mt-1 text-sm"><span className="font-semibold tabular-nums">{completed}</span> / {total}</dd>
                <div className="mt-2 h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-primary" style={{ width: `${(completed / total) * 100}%` }} /></div></div>
            </dl>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft lg:col-span-2">
            <div className="text-sm font-medium">Skills</div>
            <div className="grid items-center gap-6 sm:grid-cols-2">
              <Radar values={LESSONS.map((l) => ({ label: l.track, v: mastery(l, p).pct / 100 }))} />
              <ul className="space-y-2.5 text-sm">
                {LESSONS.map((l) => { const m = mastery(l, p); return (
                  <li key={l.id} className="flex items-center justify-between"><span>{l.track}</span><span className="text-xs text-muted-foreground">{m.label}{m.pct > 0 && ` · ${m.pct}%`}</span></li>
                ); })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
