import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Clock, Flame, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

// ===== NEW SECTIONS CONFIG (edit me later) =====
export const GW_CONFIG: {
  testimonials: { quote: string; name: string; place: string }[];
  founderNote: string;
  tracks: string[];
} = {
  testimonials: [],
  founderNote: "",
  tracks: ["Intro to Excel", "Formulas & arithmetic", "Summaries that matter", "Decisions with IF", "VLOOKUP, XLOOKUP & INDEX/MATCH", "Clean & reshape text", "Debug & clean"],
};

const eyebrow = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const h2 = "font-serif text-4xl tracking-tight md:text-5xl";

export function LandingStory() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Optional light fade-in on scroll. Without JS nothing is hidden; reduced motion disables it in CSS.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll("[data-gw-reveal]"));
    els.forEach((el) => el.classList.add("gw-reveal"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("gw-in"); io.unobserve(en.target); }
      }),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef}>
      {/* 1 · RECOGNITION */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center" data-gw-reveal>
        <p className={eyebrow}>Sound familiar?</p>
        <h2 className={`${h2} mx-auto mt-4 max-w-2xl`}>You watched the tutorial. Then you <em className="text-primary">froze at the formula bar.</em></h2>
        <p className="mx-auto mt-6 max-w-xl leading-relaxed text-muted-foreground">Most people don't struggle with Excel because they can't learn it. They struggle because watching someone else click is not the same as doing it yourself. You nod along, pause, rewind, and a day later it's gone.</p>
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-8 shadow-soft">
            <h3 className="text-lg font-semibold">Watching</h3>
            <p className="mt-2 text-sm text-muted-foreground">Pause. Rewind. Forget.</p>
          </div>
          <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-soft">
            <h3 className="text-lg font-semibold">Practicing</h3>
            <p className="mt-2 text-sm text-muted-foreground">Type. Get checked. Remember.</p>
          </div>
        </div>
      </section>

      {/* 2 · HANDS-ON */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div data-gw-reveal>
            <p className={eyebrow}>Hands-on practice</p>
            <h2 className={`${h2} mt-4`}>Learn Excel with <em className="text-primary">your own hands.</em></h2>
            <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">Every lesson puts you in a real spreadsheet. You type the actual formula, see the result instantly, and learn what went wrong the moment it does. One skill at a time, repeated just enough that it sticks.</p>
            <ul className="mt-8 space-y-3 text-sm">
              {["Type real formulas", "Instant feedback on every answer", "One skill at a time"].map((x) => (
                <li key={x} className="flex items-center gap-2"><Check className="size-4 text-primary" />{x}</li>
              ))}
            </ul>
          </div>
          <div data-gw-reveal>
            <div className="rounded-2xl border bg-card p-4 shadow-lift">
              <div className="mb-3 px-1">
                <p className="text-sm"><span className="font-medium">Try it:</span> <span className="text-muted-foreground">total the units in</span> <span className="font-mono">B4</span></p>
              </div>
              <div className="overflow-hidden rounded-lg border font-mono text-[13px]" aria-hidden="true">
                <div className="grid grid-cols-[2.5rem_1fr_1fr] border-b bg-cell-header text-[11px] text-muted-foreground">
                  <span className="border-r px-2 py-1" /><span className="border-r px-2 py-1 text-center">A</span><span className="px-2 py-1 text-center">B</span>
                </div>
                {[["1", "Store", "Units"], ["2", "Harbor St", "120"], ["3", "Elm Ave", "85"]].map(([n, a, b]) => (
                  <div key={n} className="grid grid-cols-[2.5rem_1fr_1fr] border-b">
                    <span className="border-r bg-cell-header px-2 py-1.5 text-center text-[11px] text-muted-foreground">{n}</span>
                    <span className="border-r px-2 py-1.5">{a}</span><span className="px-2 py-1.5 text-right tabular-nums">{b}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[2.5rem_1fr_1fr]">
                  <span className="border-r bg-cell-header px-2 py-1.5 text-center text-[11px] text-muted-foreground">4</span>
                  <span className="border-r px-2 py-1.5" /><span className="px-2 py-1.5 outline outline-2 -outline-offset-2 outline-primary">347</span>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-destructive/20 bg-error-soft px-4 py-3 text-sm">
                <p className="font-medium text-destructive">Not quite</p>
                <p className="mt-1 text-foreground/80">Your cell shows text, not a result. Start the formula with = so Excel knows to calculate.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · BELONGING */}
      <section className="bg-accent">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center" data-gw-reveal>
          <p className={eyebrow}>For every level</p>
          <h2 className={`${h2} mt-4`}>Never typed a formula? <em className="text-primary">Perfect.</em></h2>
          <p className="mt-4 font-medium">Already comfortable? Keep going.</p>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">Start with simple arithmetic and build step by step toward the skills that make colleagues ask "how did you do that?" Each track builds on the last, so you're never thrown into the deep end and never stuck repeating what you already know.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GW_CONFIG.tracks.map((t, k) => (
              <span key={t} className="flex items-center gap-3 rounded-full border bg-card px-4 py-2.5 text-left text-sm shadow-soft">
                <span className="font-mono text-xs text-primary">{String(k + 1).padStart(2, "0")}</span>{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4 · RELIEF + JOY */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-8 shadow-soft" data-gw-reveal>
            <Clock className="size-5 text-primary" />
            <h3 className="mt-4 font-serif text-3xl tracking-tight">Got five minutes? <em className="text-primary">That's a lesson.</em></h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">No long course to clear your calendar for. Sessions take 3-7 minutes, so you can practice on a coffee break, between meetings or before bed. Your progress is saved on your device, so you always pick up where you left off.</p>
          </div>
          <div className="rounded-2xl border bg-card p-8 shadow-soft" data-gw-reveal>
            <Flame className="size-5 text-warning" />
            <h3 className="mt-4 font-serif text-3xl tracking-tight">Make it a <em className="text-primary">habit,</em> not a chore.</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Earn XP for every exercise, keep your daily streak alive and watch your skills stack up. Small wins add up quickly when each one takes only a few minutes.</p>
          </div>
        </div>
      </section>

      {/* 5 · TRUST */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-2xl px-6 py-24 text-center" data-gw-reveal>
          <p className={eyebrow}>Why Gridwise</p>
          <h2 className={`${h2} mt-4`}>We built the practice <em className="text-primary">we wished existed.</em></h2>
          <p className="mt-6 leading-relaxed text-muted-foreground">Gridwise started with one simple belief: you don't learn Excel by watching, you learn it by using it. So we turned lessons into short exercises in a real spreadsheet, with instant checking, no videos and no fluff.</p>
          {GW_CONFIG.founderNote && (
            <figure className="mx-auto mt-10 max-w-md rounded-2xl border bg-background p-6 shadow-soft">
              <Quote className="mx-auto size-5 text-primary" />
              <blockquote className="mt-3 font-serif text-xl italic leading-relaxed">{GW_CONFIG.founderNote}</blockquote>
              <figcaption className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="grid size-8 place-items-center rounded-full bg-accent font-serif text-sm text-accent-foreground">G</span>Founder, Gridwise
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* 6 · SOCIAL PROOF (renders nothing while there are no testimonials) */}
      {GW_CONFIG.testimonials.length > 0 && (
        <section className="bg-accent">
          <div className="mx-auto max-w-6xl px-6 py-24" data-gw-reveal>
            <h2 className={`${h2} text-center`}>What learners <em className="text-primary">are saying</em></h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {GW_CONFIG.testimonials.map((t) => (
                <figure key={t.name} className="rounded-2xl border border-t-2 border-t-primary bg-card p-6 shadow-soft">
                  <blockquote className="text-sm leading-relaxed">"{t.quote}"</blockquote>
                  <figcaption className="mt-4 text-sm text-muted-foreground"><span className="font-medium text-foreground">{t.name}</span> · {t.place}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7 · AMBITION + ACTION */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center" data-gw-reveal>
          <h2 className={h2}>Spreadsheet skills are your <em>quiet advantage.</em></h2>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-primary-foreground/80">Finance, operations, marketing, sales, admin: almost every team runs on spreadsheets. The person who can build a formula, clean messy data and catch an error in seconds saves hours and gets noticed. Start becoming that person today.</p>
          <div className="mt-8">
            <Button asChild size="lg" className="bg-card text-primary hover:bg-card/90">
              <Link to="/practice/$lessonId" params={{ lessonId: "basics" }}>Try the first lesson <ArrowRight /></Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-primary-foreground/70">No sign-up needed. Your first exercise takes just a few minutes.</p>
        </div>
      </section>
    </div>
  );
}
