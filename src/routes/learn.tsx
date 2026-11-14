import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LESSON_INDEX } from "@/lib/lesson-index";
import { filterLessonIndex, lessonTracks } from "@/lib/lesson-catalog";
import { LESSONS, type Lesson } from "@/lib/lessons";
import { useProgress, type Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Excel lessons · Gridwise" },
      { name: "description", content: `${LESSON_INDEX.length} structured Excel lessons, from spreadsheet basics to advanced formulas.` },
      { property: "og:title", content: "Excel lessons · Gridwise" },
      { property: "og:description", content: "Search the lesson library and practice Excel in an interactive spreadsheet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("all");
  const tracks = useMemo(() => lessonTracks(LESSON_INDEX), []);
  const visibleLessons = useMemo(() => filterLessonIndex(LESSON_INDEX, query, track), [query, track]);
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-serif text-5xl tracking-tight">Excel lessons</h1>
        <p className="mt-2 text-muted-foreground">Search the lesson library or choose a track to practice Excel one exercise at a time.</p>
        <section className="mt-10" aria-labelledby="structured-lessons-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="structured-lessons-heading" className="text-xl font-semibold">Excel lessons</h2>
              <p className="mt-1 text-sm text-muted-foreground">{LESSON_INDEX.length} lessons across {tracks.length} tracks</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <label className="relative min-w-56 flex-1 sm:flex-none">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons" aria-label="Search lessons" className="pl-9" />
              </label>
              <select aria-label="Filter by track" value={track} onChange={(event) => setTrack(event.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="all">All tracks</option>
                {tracks.map((item) => <option key={item} value={item}>Track {item}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleLessons.map((lesson) => (
              <Link key={lesson.id} to="/practice/$lessonId" params={{ lessonId: lesson.id }}
                className="group rounded-2xl border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                <p className="font-mono text-xs text-muted-foreground">Lesson {String(lesson.number).padStart(2, "0")} · Track {lesson.track}</p>
                <h3 className="mt-3 font-semibold">{lesson.title}</h3>
                <p className="mt-2 text-sm capitalize text-muted-foreground">{lesson.level} · {p.lessonRuns[lesson.id]?.status === "completed" ? "Completed" : p.lessonRuns[lesson.id] ? "In progress" : "New"}</p>
              </Link>
            ))}
            {visibleLessons.length === 0 && <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No lessons match your search. Try another title or track.</p>}
          </div>
        </section>
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
