import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LESSON_INDEX } from "@/lib/lesson-index";
import { type Lesson } from "@/lib/lessons";
import { type Progress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { TrackCards } from "@/components/TrackCards";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Excel skill tracks · Gridwise" },
      { name: "description", content: `${LESSON_INDEX.length} structured Excel lessons, from spreadsheet basics to advanced formulas.` },
      { property: "og:title", content: "Excel skill tracks · Gridwise" },
      { property: "og:description", content: "Explore ten Excel skill tracks, from beginner foundations to advanced spreadsheet skills." },
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
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="font-serif text-5xl">Excel skill tracks</h1><p className="mt-3 text-muted-foreground">10 tracks · Beginner to advanced</p></div>
          <Button asChild variant="outline"><Link to="/try-lessons">Try the first lessons<ArrowUpRight aria-hidden className="size-4" /></Link></Button>
        </div>
        <TrackCards />
      </div>
    </AppShell>
  );
}
