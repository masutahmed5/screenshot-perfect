import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LESSONS, type Lesson } from "@/lib/lessons";
import { useProgress, type Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Skill map • Gridwise" },
      { name: "description", content: "Pick an Excel skill and start practicing in a real spreadsheet." },
      { property: "og:title", content: "Skill map • Gridwise" },
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

export type SkillCard = {
  id: string;
  number: string;
  track: string;
  title: string;
  subtext: string;
  lessonId: string;
  estimatedMinutes: number;
};

export const SKILL_CARDS: SkillCard[] = [
  {
    id: "sum-functions",
    number: "01",
    track: "Arithmetic",
    title: "Sum Functions",
    subtext: "SUM, SUMIF, SUMIFS",
    lessonId: "intro-to-excel",
    estimatedMinutes: 4,
  },
  {
    id: "count-functions",
    number: "02",
    track: "Counting",
    title: "Count Functions",
    subtext: "COUNT, COUNTIF, COUNTIFS",
    lessonId: "logical",
    estimatedMinutes: 5,
  },
  {
    id: "logical-functions",
    number: "03",
    track: "Logic",
    title: "Logical Functions",
    subtext: "True/False, AND/OR, IF, IS, IFS, SWITCH",
    lessonId: "logical",
    estimatedMinutes: 6,
  },
  {
    id: "lookup-functions",
    number: "04",
    track: "Lookups",
    title: "Lookup Functions",
    subtext: "VLOOKUP, HLOOKUP, XLOOKUP",
    lessonId: "lookups",
    estimatedMinutes: 6,
  },
  {
    id: "text-search-functions",
    number: "05",
    track: "Text",
    title: "Text Search Functions",
    subtext: "LEN, LEFT, RIGHT, MID, FIND, Wildcards, SEARCH",
    lessonId: "text",
    estimatedMinutes: 5,
  },
  {
    id: "intro-to-shortcuts",
    number: "06",
    track: "Speed",
    title: "Intro to Shortcuts",
    subtext: "Introductory Keyboard Shortcuts",
    lessonId: "basics",
    estimatedMinutes: 4,
  },
  {
    id: "cell-selection-shortcuts",
    number: "07",
    track: "Navigation",
    title: "Cell Selection Shortcuts",
    subtext: "Cell Selection Keyboard Shortcuts",
    lessonId: "intro-to-excel",
    estimatedMinutes: 4,
  },
  {
    id: "text-manipulation-functions",
    number: "08",
    track: "Data Prep",
    title: "Text Manipulation",
    subtext: "CONCAT, TEXTJOIN, UPPER, LOWER, PROPER, SUBSTITUTE",
    lessonId: "text",
    estimatedMinutes: 5,
  },
  {
    id: "date-functions",
    number: "09",
    track: "Time",
    title: "Date Functions",
    subtext: "DATE, TODAY, DATEDIF, DAYS",
    lessonId: "basics",
    estimatedMinutes: 5,
  },
  {
    id: "index-match-lookup",
    number: "10",
    track: "Advanced Lookups",
    title: "INDEX + MATCH Lookup",
    subtext: "INDEX, MATCH, INDEX+MATCH",
    lessonId: "lookups",
    estimatedMinutes: 7,
  },
  {
    id: "statistical-functions",
    number: "11",
    track: "Stats",
    title: "Statistical Functions",
    subtext: "AVERAGE, MIN, MAX, LARGE, SMALL, FLOOR, CEILING, MEDIAN",
    lessonId: "math",
    estimatedMinutes: 6,
  },
  {
    id: "tables",
    number: "12",
    track: "Organization",
    title: "Tables & Filtering",
    subtext: "Filters, Pivot Tables, Structured References",
    lessonId: "basics",
    estimatedMinutes: 5,
  },
  {
    id: "other-excel-skills",
    number: "13",
    track: "Formatting",
    title: "Other Excel Skills",
    subtext: "Conditional Formatting, Worksheets, Data Validation",
    lessonId: "cleaning",
    estimatedMinutes: 6,
  },
  {
    id: "array-formulas",
    number: "14",
    track: "Modern Excel",
    title: "Array Formulas",
    subtext: "UNIQUE, FILTER, SORT, Dynamic Spill Arrays",
    lessonId: "lookups",
    estimatedMinutes: 6,
  },
  {
    id: "combined-skills",
    number: "15",
    track: "Capstone",
    title: "Combined Skills",
    subtext: "Real-world Exercises, Multi-formula Workflows",
    lessonId: "cleaning",
    estimatedMinutes: 8,
  },
];

function Learn() {
  const p = useProgress();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header in Gridwise Style */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
                Skill map
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                Master 15 essential Excel skill areas. Each module focuses on hands-on formula exercises with instant feedback. Start anywhere.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-xs font-mono text-muted-foreground shadow-xs shrink-0 self-start sm:self-auto">
              <Sparkles className="size-3.5 text-primary" />
              <span>15 Skills • All Unlocked</span>
            </div>
          </div>
        </div>

        {/* 15 Skill Cards Grid in Gridwise Card Style */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_CARDS.map((card) => {
            const lesson = LESSONS.find((l) => l.id === card.lessonId);
            const m = lesson ? mastery(lesson, p) : { label: "New", pct: 0, tone: "muted" as const };

            return (
              <Link
                key={card.id}
                to="/practice/$lessonId"
                params={{ lessonId: card.lessonId }}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift hover:border-primary/40 cursor-pointer"
              >
                <div>
                  {/* Top Meta: Number + Track + Arrow */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground font-medium">
                      {card.number} • {card.track}
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>

                  {/* Title & Function Subtext */}
                  <h2 className="mt-3.5 text-lg font-semibold tracking-tight text-card-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] font-mono text-muted-foreground leading-relaxed">
                    {card.subtext}
                  </p>
                </div>

                {/* Bottom Meta & Progress Bar */}
                <div className="mt-6 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-medium text-[11px]",
                        m.tone === "muted" && "bg-muted text-muted-foreground",
                        m.tone === "primary" && "bg-accent text-accent-foreground",
                        m.tone === "success" && "bg-success-soft text-success",
                        m.tone === "warning" && "bg-warning-soft text-foreground"
                      )}
                    >
                      {m.label}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                      <Clock className="size-3" />
                      {card.estimatedMinutes} min
                    </span>
                  </div>

                  {/* Clean rounded progress bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
