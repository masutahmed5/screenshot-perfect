import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Keyboard, ListChecks, MessageSquareText, ScanSearch, Target, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/Logo";
import { Sheet } from "@/components/Sheet";
import { Workbook } from "@/lib/formula";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gridwise · Learn Excel by doing, in a real spreadsheet" },
      { name: "description", content: "Become confident in Excel in days. Practice formulas, lookups and data cleaning in a real spreadsheet with instant feedback." },
      { property: "og:title", content: "Gridwise · Learn Excel by doing" },
      { property: "og:description", content: "Practice in a real spreadsheet, not through videos. Instant, specific feedback on every formula." },
    ],
  }),
  component: Landing,
});

const demo = { A1: "Store", B1: "Units", A2: "Harbor St", B2: "120", A3: "Elm Ave", B3: "85", A4: "Pier 9", B4: "142", A5: "Total" };

function Landing() {
  const [cells, setCells] = useState<Record<string, string>>(demo);
  const b5 = cells.B5 ?? "";
  const solved = b5.startsWith("=") && new Workbook(cells).get("B5") === 347;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#how" className="hidden hover:text-foreground sm:inline">How it works</a>
          <a href="#pricing" className="hidden hover:text-foreground sm:inline">Pricing</a>
          <Button asChild size="sm"><Link to="/dashboard">Start practicing</Link></Button>
        </nav>
      </header>

      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-[520px] grid-motif" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />No sign-up needed</span>
            <h1 className="mt-6 font-serif text-6xl leading-[1.02] tracking-tight md:text-7xl">Become confident in Excel <em className="text-primary">in days.</em></h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">Practice in a real spreadsheet, not through videos. Every formula is checked instantly, with feedback that tells you exactly what went wrong.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg"><Link to="/practice/$lessonId" params={{ lessonId: "basics" }}>Try the first lesson <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="ghost"><Link to="/learn">See all skills</Link></Button>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">30 exercises · 6 skills · 3–7 minute sessions</p>
          </div>

          <div className="animate-rise [animation-delay:80ms]">
            <div className="rounded-2xl border bg-card p-4 shadow-lift">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-sm"><span className="font-medium">Try it:</span> <span className="text-muted-foreground">total the units in</span> <span className="font-mono">B5</span></p>
                {solved && <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success animate-rise"><Check className="size-3" />Correct</span>}
              </div>
              <div className="h-[260px]">
                <Sheet cells={cells} onChange={setCells} cols={4} rows={7} initialSelected="B5" highlight={["B5"]} compact
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

      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="max-w-xl font-serif text-5xl tracking-tight">Feedback that reads like a patient senior analyst.</h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
          {[
            { n: "01", t: "Read the brief", d: "A real scenario: a coffee chain, an HR export, a messy CRM file." },
            { n: "02", t: "Write the formula", d: "In a real grid with a formula bar, autocomplete and keyboard navigation." },
            { n: "03", t: "Get specific feedback", d: "Wrong range? Missing $? Text instead of numbers? We'll tell you which one." },
          ].map((s) => (
            <div key={s.n} className="bg-card p-8"><span className="font-mono text-xs text-primary">{s.n}</span><h3 className="mt-4 text-lg font-semibold">{s.t}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p></div>
          ))}
        </div>

        <div className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: ListChecks, t: "Real formula checking", d: "Checks both the value and the formula. Rejects typed answers and accepts any correct alternative." },
            { i: ScanSearch, t: "Error diagnosis", d: "Spots off-by-one ranges, wrong match types and #N/A causes, and explains each one." },
            { i: MessageSquareText, t: "Three-step hints", d: "A nudge, then a hint, then a walkthrough. The full answer only appears after you've tried." },
            { i: Target, t: "Daily review", d: "Exercises you missed come back until you get them right on the first try." },
            { i: Wrench, t: "Debug Lab", d: "Fix broken workbooks with bad ranges, circular references and numbers stored as text.", soon: true },
            { i: Keyboard, t: "Shortcut trainer", d: "Timed drills for the shortcuts you actually use, on Mac or Windows.", soon: true },
          ].map(({ i: I, t, d, soon }) => (
            <div key={t}>
              <I className="size-5 text-primary" />
              <h3 className="mt-4 flex items-center gap-2 font-semibold">{t}{soon && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Soon</span>}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-serif text-5xl tracking-tight">Simple pricing</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { n: "Free", p: "$0", d: "Start today", f: ["Core lessons", "Daily review", "Basic shortcuts", "Limited AI hints"] },
              { n: "Pro", p: "$12", d: "per month", f: ["Unlimited AI tutor", "Missions & Debug Lab", "Interview Mode", "Certificates & badges"], hl: true },
              { n: "Teams", p: "Custom", d: "for companies & classrooms", f: ["Seats & invites", "Cohort analytics", "Custom content", "CSV export"] },
            ].map((t) => (
              <div key={t.n} className={t.hl ? "rounded-2xl border-2 border-primary bg-background p-7 shadow-lift" : "rounded-2xl border bg-background p-7"}>
                <div className="text-sm font-medium">{t.n}</div>
                <div className="mt-4 font-serif text-4xl">{t.p}</div>
                <div className="text-sm text-muted-foreground">{t.d}</div>
                <ul className="mt-6 space-y-2.5 text-sm">{t.f.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 text-primary" />{x}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

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
