import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Player } from "@/components/Player";
import { Button } from "@/components/ui/button";
import { ALL_STEPS } from "@/lib/lessons";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review · Gridwise" },
      { name: "description", content: "A 5-minute review built from the formulas you missed." },
      { property: "og:title", content: "Review · Gridwise" },
      { property: "og:description", content: "Spaced review of your past Excel mistakes." },
    ],
  }),
  component: Review,
});

function Review() {
  const p = useProgress();
  const steps = ALL_STEPS.filter((s) => p.mistakes[s.id]).sort((a, b) => p.mistakes[b.id] - p.mistakes[a.id]).slice(0, 5);
  return (
    <AppShell>
      {steps.length ? <Player steps={steps} title="Daily review" exitTo="/dashboard" /> : (
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-serif text-4xl">Nothing to review</h1>
          <p className="mt-3 text-muted-foreground">Exercises you miss on the first try show up here for practice.</p>
          <Button asChild className="mt-8"><Link to="/learn">Start a lesson</Link></Button>
        </div>
      )}
    </AppShell>
  );
}
