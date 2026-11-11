import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tracks = [
  { id: "intro-to-excel", title: "Intro to Excel", outcome: "Cells, rows, and moving around fast.", formula: "A1", level: "Beginner" },
  { id: "basics", title: "Formulas & arithmetic", outcome: "Build your first formulas with confidence.", formula: "=B2*C2", level: "Beginner" },
  { id: "math", title: "Summaries that matter", outcome: "Totals, averages, and counts in seconds.", formula: "=SUM(B2:B9)", level: "Beginner" },
  { id: "logical", title: "Decisions with IF", outcome: "Make your sheet think for you.", formula: '=IF(B2>100,"High","Low")', level: "Intermediate" },
  { id: "lookups", title: "VLOOKUP, XLOOKUP & INDEX/MATCH", outcome: "Find anything in any table.", formula: "=XLOOKUP(A2,F:F,G:G)", level: "Intermediate" },
  { id: "text", title: "Clean & reshape text", outcome: "Fix messy names, codes and dates.", formula: "=TRIM(A2)", level: "Intermediate" },
  { id: "cleaning", title: "Debug & clean", outcome: "Track down errors and fix broken sheets.", formula: "#N/A", level: "Advanced" },
];

const principles = [
  ["Learn by doing", "Every concept is a short exercise in a real spreadsheet."],
  ["Instant, specific feedback", "Know exactly what went wrong, not just that it did."],
  ["3-7 minute sessions", "Small enough to fit a coffee break. Consistent enough to stick."],
];

export function LearningPathSection() {
  return (
    <section className="gw-premium gw-learning border-y" aria-labelledby="gw-level-heading">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24 lg:py-28" data-gw-reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="gw-premium-eyebrow">For every level</p>
          <h2 id="gw-level-heading" className="gw-premium-heading mt-4">Never typed a formula? <em className="text-primary">Perfect.</em></h2>
          <p className="mt-5 font-medium">Already comfortable? Keep going.</p>
          <p className="mt-4 leading-relaxed text-muted-foreground">Start with simple arithmetic and build step by step toward the skills that make colleagues ask "how did you do that?" Each track builds on the last, so you're never thrown into the deep end and never stuck repeating what you already know.</p>
        </div>
        <div className="gw-track-grid relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {tracks.map((track, index) => (
            <Button key={track.id} asChild variant="outline" className={`gw-track group ${index < 4 ? "lg:col-span-3" : "lg:col-span-4"}`}>
              <Link to="/practice/$lessonId" params={{ lessonId: track.id }}>
                <div className="flex items-center gap-2">
                  <span className="bg-card font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <span className="rounded-full border px-2 py-1 text-[11px] font-normal text-muted-foreground">{track.level}</span>
                  <ArrowUpRight aria-hidden className="ml-auto text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                </div>
                <h3 className="mt-5 text-lg font-medium leading-snug">{track.title}</h3>
                <p className="mt-3 text-sm font-normal leading-relaxed text-muted-foreground">{track.outcome}</p>
                <code className="gw-formula-chip mt-auto self-start pt-6 font-mono text-[11px] font-normal">{track.formula}</code>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function FormulaProof() {
  return (
    <div className="gw-formula-proof mx-auto mt-10 flex max-w-md flex-wrap items-center justify-center gap-3 rounded-xl border bg-card p-3 shadow-soft" role="img" aria-label="Formula SUM of B2 to B6, with a selected result cell showing 347, marked correct">
      <span className="border-r pr-3 font-mono text-xs text-muted-foreground">fx</span>
      <code className="font-mono text-xs">=SUM(B2:B6)</code>
      <span className="gw-proof-cell ml-auto px-4 py-2 font-mono text-sm text-primary">347</span>
      <span className="flex items-center gap-1 text-xs font-medium text-primary"><Check aria-hidden className="size-3.5" />Correct</span>
    </div>
  );
}

export function WhyGridwiseSection({ founderNote }: { founderNote: string }) {
  return (
    <section className="gw-premium relative overflow-hidden bg-card" aria-labelledby="gw-why-heading">
      <div className="gw-premium-grid absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24 lg:py-28" data-gw-reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="gw-premium-eyebrow">Why Gridwise</p>
          <h2 id="gw-why-heading" className="gw-premium-heading mt-4">We built the practice <em className="text-primary">we wished existed.</em></h2>
          <p className="mt-6 leading-relaxed text-muted-foreground">Gridwise started with one simple belief: you don't learn Excel by watching, you learn it by using it. So we turned lessons into short exercises in a real spreadsheet, with instant checking, no videos and no fluff.</p>
          <FormulaProof />
          {founderNote && <blockquote className="mt-8 font-serif text-xl italic">{founderNote}</blockquote>}
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-0">
          {principles.map(([title, description], index) => (
            <div key={title} className="gw-principle border-t pt-6 md:border-l md:border-t-0 md:px-8 md:pt-0">
              <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosingSection() {
  return (
    <section className="gw-premium relative overflow-hidden border-t bg-background" aria-labelledby="gw-closing-heading">
      <div className="gw-premium-grid absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-6 py-20 text-center md:py-28" data-gw-reveal>
        <div className="gw-selected-heading relative px-4 py-6 sm:px-8">
          <span className="gw-selection-handle gw-handle-tl" aria-hidden="true" /><span className="gw-selection-handle gw-handle-tr" aria-hidden="true" />
          <span className="gw-selection-handle gw-handle-bl" aria-hidden="true" /><span className="gw-selection-handle gw-handle-br" aria-hidden="true" />
          <h2 id="gw-closing-heading" className="gw-premium-heading">Spreadsheet skills are your <em className="text-primary">quiet advantage.</em></h2>
        </div>
        <p className="mx-auto mt-8 max-w-xl leading-relaxed text-muted-foreground">Finance, operations, marketing, sales, admin: almost every team runs on spreadsheets. The person who can build a formula, clean messy data and catch an error in seconds saves hours and gets noticed. Start becoming that person today.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gw-closing-button group h-12 rounded-xl shadow-soft">
            <Link to="/practice/$lessonId" params={{ lessonId: "basics" }}>Try the first lesson <ArrowRight aria-hidden className="transition-transform group-hover:translate-x-1" /></Link>
          </Button>
          <Button asChild variant="link" className="h-12"><a href="#gw-hands-on">See how it works</a></Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">No sign-up needed to start. Practice in your browser.</p>
      </div>
    </section>
  );
}