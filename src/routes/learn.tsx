import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { LESSONS, type Lesson } from "@/lib/lessons";
import { useProgress, type Progress } from "@/lib/progress";

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
  title: string;
  subtext: string;
  lessonId: string;
};

export const SKILL_CARDS: SkillCard[] = [
  {
    id: "sum-functions",
    title: "SUM FUNCTIONS",
    subtext: "SUM, SUMIF, SUMIFS",
    lessonId: "intro-to-excel",
  },
  {
    id: "count-functions",
    title: "COUNT FUNCTIONS",
    subtext: "COUNT, COUNTIF, COUNTIFS",
    lessonId: "logical",
  },
  {
    id: "logical-functions",
    title: "LOGICAL FUNCTIONS",
    subtext: "True/False, AND/OR, IF, IS, IFS, SWITCH",
    lessonId: "logical",
  },
  {
    id: "lookup-functions",
    title: "LOOKUP FUNCTIONS",
    subtext: "VLOOKUP, HLOOKUP, XLOOKUP",
    lessonId: "lookups",
  },
  {
    id: "text-search-functions",
    title: "TEXT SEARCH FUNCTIONS",
    subtext: "LEN, LEFT, RIGHT, MID, FIND, WILDCARDS, SEARCH",
    lessonId: "text",
  },
  {
    id: "intro-to-shortcuts",
    title: "INTRO TO SHORTCUTS",
    subtext: "Introductory Keyboard Shortcuts",
    lessonId: "basics",
  },
  {
    id: "cell-selection-shortcuts",
    title: "CELL SELECTION SHORTCUTS",
    subtext: "Cell Selection Keyboard Shortcuts",
    lessonId: "intro-to-excel",
  },
  {
    id: "text-manipulation-functions",
    title: "TEXT MANIPULATION FUNCTIONS",
    subtext: "CONCAT, TEXTJOIN, UPPER, LOWER, PROPER, SUBSTITUTE",
    lessonId: "text",
  },
  {
    id: "date-functions",
    title: "DATE FUNCTIONS",
    subtext: "DATE, TODAY, DATEDIF, DAYS",
    lessonId: "basics",
  },
  {
    id: "index-match-lookup",
    title: "INDEX MATCH LOOKUP",
    subtext: "INDEX, MATCH, INDEX+MATCH",
    lessonId: "lookups",
  },
  {
    id: "statistical-functions",
    title: "STATISTICAL FUNCTIONS",
    subtext: "AVERAGE, MIN, MAX, LARGE, SMALL, FLOOR, CEILING, MEDIAN, MODE",
    lessonId: "math",
  },
  {
    id: "tables",
    title: "TABLES",
    subtext: "Filters, Pivot Tables",
    lessonId: "basics",
  },
  {
    id: "other-excel-skills",
    title: "OTHER EXCEL SKILLS",
    subtext: "Conditional Formatting, Worksheets",
    lessonId: "cleaning",
  },
  {
    id: "array-formulas",
    title: "ARRAY FORMULAS",
    subtext: "UNIQUE, FILTER, SORT",
    lessonId: "lookups",
  },
  {
    id: "combined-skills",
    title: "COMBINED SKILLS",
    subtext: "Real-world Practice & Capstones",
    lessonId: "cleaning",
  },
];

function Learn() {
  const p = useProgress();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header matching Screenshot 1 */}
        <div className="mb-6">
          <div className="flex items-center justify-between border-b pb-3.5">
            <h1 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              LESSONS
            </h1>
            <span className="text-xs font-medium text-muted-foreground">
              {SKILL_CARDS.length} Skills • All Unlocked
            </span>
          </div>
        </div>

        {/* 3-column Grid matching Screenshot 1 */}
        <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {SKILL_CARDS.map((card) => {
            const lesson = LESSONS.find((l) => l.id === card.lessonId);
            const doneCount = lesson ? lesson.steps.filter((s) => p.completed[s.id]).length : 0;
            const totalCount = lesson ? lesson.steps.length : 1;
            const pct = Math.round((doneCount / totalCount) * 100);

            return (
              <Link
                key={card.id}
                to="/practice/$lessonId"
                params={{ lessonId: card.lessonId }}
                className="group flex flex-col justify-between rounded-xl border border-slate-200/90 dark:border-border/80 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 cursor-pointer"
              >
                <div>
                  <h2 className="text-sm sm:text-[15px] font-bold text-[#1e293b] dark:text-foreground tracking-wide uppercase font-sans group-hover:text-primary transition-colors">
                    {card.title}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-muted-foreground font-medium tracking-wide leading-relaxed">
                    {card.subtext}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${pct}%` }}
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
