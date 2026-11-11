import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/Logo";
import { Sheet } from "@/components/Sheet";
import { LandingStory } from "@/components/LandingStory";
import { Workbook } from "@/lib/formula";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gridwise · Learn Excel by doing, in a real spreadsheet" },
      { name: "description", content: "Become confident in Excel in days. Practice formulas, lookups and data cleaning in a real spreadsheet with instant feedback." },
      { property: "og:title", content: "Gridwise · Learn Excel by doing" },
      { property: "og:description", content: "Practice in a real spreadsheet, not through videos. Instant, specific feedback on every formula." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const demo = {
  A1: "Store", B1: "Units", C1: "Price", D1: "Region", E1: "Revenue",
  A2: "Harbor St", B2: "120", C2: "$4.50", D2: "North",
  A3: "Elm Ave", B3: "85", C3: "$4.50", D3: "South",
  A4: "Pier 9", B4: "142", C4: "$5.00", D4: "North",
  A5: "Total", B5: "",
};

function Landing() {
  const [cells, setCellsRaw] = useState<Record<string, string>>(demo);
  const [touched, setTouched] = useState(false);
  const [ghost, setGhost] = useState<{ cell: string; text: string; refs?: string[] } | null>(null);
  const setCells = (c: Record<string, string>) => { setTouched(true); setGhost(null); setCellsRaw(c); };

  // Looping demo: type =B2*C2 into E2 (Units * Price = Revenue), until the visitor interacts
  useEffect(() => {
    if (touched) return;
    // Each demo: cell, formula, references (with the char length at which each appears), result
    const demos: { cell: string; formula: string; refs: [string, number][]; result: string }[] = [
      { cell: "E2", formula: "=B2*C2", refs: [["B2", 3], ["C2", 6]], result: "$540.00" },
      { cell: "B5", formula: "=SUM(B2:B4)", refs: [["B2:B4", 10]], result: "347" },
      { cell: "C5", formula: "=COUNT(B2:B4)", refs: [["B2:B4", 12]], result: "3" },
    ];
    const frames: { cell: string; text: string; refs?: string[]; ms: number }[] = [];
    for (const d of demos) {
      frames.push({ cell: d.cell, text: "", ms: 700 });
      for (let i = 1; i <= d.formula.length; i++) {
        const t = d.formula.slice(0, i);
        frames.push({ cell: d.cell, text: t, refs: d.refs.map(([r, n]) => (t.length >= n ? r : "")), ms: 200 });
      }
      frames.push({ cell: d.cell, text: d.formula, refs: d.refs.map(([r]) => r), ms: 900 });
      frames.push({ cell: d.cell, text: d.result, ms: 2200 });
    }
    let i = 0, timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const f = frames[i % frames.length]!;
      setGhost({ cell: f.cell, text: f.text, refs: f.refs });
      i++;
      timer = setTimeout(tick, f.ms);
    };
    tick();
    return () => clearTimeout(timer);
  }, [touched]);
  const b5 = cells.B5 ?? "";
  const solved = b5.startsWith("=") && new Workbook(cells).get("B5") === 347;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Button asChild size="sm"><Link to="/dashboard">Start practicing</Link></Button>
        </nav>
      </header>

      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-[520px] grid-motif" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-24 pt-16 lg:grid-cols-[0.95fr_1.15fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />No sign-up needed</span>
            <h1 className="mt-6 font-serif text-6xl leading-[1.02] tracking-tight md:text-7xl">Become confident in Excel <em className="text-primary">in days.</em></h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">Practice Excel online with interactive exercises in a real spreadsheet, not through boring videos. Learn Excel formulas, functions, and keyboard shortcuts as you work through practical challenges. Every formula is checked instantly, with helpful feedback that shows you exactly what went wrong.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg"><Link to="/practice/$lessonId" params={{ lessonId: "basics" }}>Try the first lesson <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="ghost"><Link to="/learn">See all skills</Link></Button>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">30 exercises · 6 skills · 3–7 minute sessions</p>
          </div>

          <div className="animate-rise [animation-delay:80ms] w-full">
            <div className="rounded-2xl border bg-card p-5 shadow-lift">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-sm"><span className="font-medium">Try it:</span> <span className="text-muted-foreground">total the units in</span> <span className="font-mono">B5</span></p>
                {solved && <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success animate-rise"><Check className="size-3" />Correct</span>}
              </div>
              <div className="h-[322px] sm:h-[326px] w-full [&_*]:!font-sans">
                <Sheet cells={cells} onChange={setCells} cols={6} rows={6} initialSelected="B5" highlight={["B5"]} compact ghost={touched ? null : ghost}
                  flash={solved ? { cell: "B5", kind: "correct", key: 1 } : null} />
              </div>
              <p className="mt-3 px-1 text-xs text-muted-foreground">
                {solved ? "That's it. Formulas update automatically when the data changes." : b5 && !b5.startsWith("=") ? "Close. Start with = so Excel calculates it for you." : <>Start typing: <span className="font-mono">=SUM(</span>…</>}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 text-center md:grid-cols-4">
          {[["3–7 min", "per session"], ["Instant", "formula checking"], ["Any", "correct formula accepted"], ["0", "videos to sit through"]].map(([a, b]) => (
            <div key={b}><div className="font-serif text-3xl">{a}</div><div className="mt-1 text-sm text-muted-foreground">{b}</div></div>
          ))}
        </div>
      </section>

      <LandingStory />

      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="font-serif text-4xl tracking-tight">Questions</h2>
        <Accordion type="single" collapsible className="mt-8">
          {[
            ["Do I need Excel installed?", "No. Everything runs in your browser, in a spreadsheet that behaves like Excel."],
            ["Do I need an account?", "No. Progress is saved on your device. Accounts for syncing are coming soon."],
            ["Will this help with Excel assessments for jobs?", "Yes. Lookups, IF logic, text cleaning and summaries are what most assessments test."],
            ["What if my formula differs from the solution?", "That's fine. We check the result and the structure, so any correct approach passes."],
          ].map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger className="text-left">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground"><Logo /><span>Learn by doing.</span></div>
      </footer>
    </div>
  );
}
