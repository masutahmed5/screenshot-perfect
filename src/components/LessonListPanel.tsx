import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Circle, CircleDot, Search } from "lucide-react";
import { LESSONS, type Lesson } from "@/lib/lessons";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export type LessonLevel = "Beginner" | "Intermediate" | "Advanced";

/**
 * Level split for the current catalog. The curriculum spec targets 120 lessons
 * (Beginner 01-40, Intermediate 41-80, Advanced 81-120); with the lessons that
 * exist today the split is Beginner 01-04, Intermediate 05-07, Advanced 08-10.
 */
export function lessonLevel(index: number): LessonLevel {
  if (index < 4) return "Beginner";
  if (index < 7) return "Intermediate";
  return "Advanced";
}

type Status = "completed" | "in-progress" | "not-started";

export function LessonListPanel({ currentId, onNavigate, className }: { currentId?: string; onNavigate?: () => void; className?: string }) {
  const [query, setQuery] = useState("");
  const { completed } = useProgress();
  const currentRef = useRef<HTMLAnchorElement>(null);

  const statusOf = (lesson: Lesson): Status => {
    const done = lesson.steps.filter((s) => completed[s.id]).length;
    return done === 0 ? "not-started" : done === lesson.steps.length ? "completed" : "in-progress";
  };

  const completedLessons = LESSONS.filter((l) => statusOf(l) === "completed").length;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = LESSONS.map((lesson, i) => ({ lesson, num: String(i + 1).padStart(2, "0"), level: lessonLevel(i) })).filter(
      ({ lesson, num }) => !q || lesson.title.toLowerCase().includes(q) || num.includes(q),
    );
    return (["Beginner", "Intermediate", "Advanced"] as const)
      .map((level) => ({ level, items: items.filter((it) => it.level === level) }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  // Auto-scroll the current lesson into view on load
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, [currentId]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-soft", className)}>
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons"
            aria-label="Search lessons"
            className="w-full rounded-md border bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={completedLessons} aria-valuemin={0} aria-valuemax={LESSONS.length} aria-label="Lessons completed">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completedLessons / LESSONS.length) * 100}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {completedLessons}/{LESSONS.length}
          </span>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-auto" aria-label="Lesson list">
        {groups.map((g) => (
          <div key={g.level}>
            <h3 className="sticky top-0 z-10 border-b bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.level}</h3>
            <ul>
              {g.items.map(({ lesson, num }) => {
                const status = statusOf(lesson);
                const current = lesson.id === currentId;
                return (
                  <li key={lesson.id}>
                    <Link
                      to="/practice/$lessonId"
                      params={{ lessonId: lesson.id }}
                      ref={current ? currentRef : undefined}
                      onClick={onNavigate}
                      aria-current={current ? "page" : undefined}
                      className={cn("flex items-center gap-2.5 border-b border-grid-line px-3 py-2.5 text-left transition-colors hover:bg-accent/60", current && "bg-accent")}
                    >
                      <span className={cn("font-mono text-[11px] tabular-nums", current ? "text-primary" : "text-muted-foreground")}>{num}</span>
                      <span className={cn("min-w-0 flex-1 truncate text-sm", current && "font-medium")}>{lesson.title}</span>
                      {status === "completed" ? (
                        <Check className="size-3.5 shrink-0 text-success" aria-label="Completed" />
                      ) : status === "in-progress" ? (
                        <CircleDot className="size-3.5 shrink-0 text-primary" aria-label="In progress" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-muted-foreground/40" aria-label="Not started" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {groups.length === 0 && <p className="p-4 text-sm text-muted-foreground">No lessons match &ldquo;{query}&rdquo;.</p>}
      </nav>
    </div>
  );
}
