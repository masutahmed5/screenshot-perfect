import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { RecognitionSection } from "@/components/RecognitionSection";
import { LearningPathSection, WhyGridwiseSection, ClosingSection } from "@/components/LandingSections";

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
      <RecognitionSection />

      {/* 2 · HANDS-ON */}
      <section id="gw-hands-on" className="border-y bg-card">
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
      <LearningPathSection />

      {/* 5 · TRUST */}
      <WhyGridwiseSection founderNote={GW_CONFIG.founderNote} />

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
      <ClosingSection />
    </div>
  );
}
