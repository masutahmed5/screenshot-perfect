import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const formula = '=SUMIF(B2:B6,"North",C2:C6)';
const rows = [
  ["Rep", "Region", "Sales", "Target"],
  ["Maya", "North", "120", "100"],
  ["Ben", "South", "90", "100"],
  ["Ola", "North", "150", "120"],
  ["Sam", "East", "80", "100"],
  ["Lia", "North", "60", "90"],
];

export function RecognitionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [typed, setTyped] = useState(formula);
  const [complete, setComplete] = useState(true);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setTyped("");
    setComplete(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setStarted(true);
      let length = 0;
      const tick = () => {
        length++;
        setTyped(formula.slice(0, length));
        if (length < formula.length) timer = setTimeout(tick, 85);
        else timer = setTimeout(() => setComplete(true), 550);
      };
      timer = setTimeout(tick, 700);
    }, { threshold: 0.25 });
    observer.observe(section);
    return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
  }, []);

  return (
    <section ref={sectionRef} className={`gw-recognition mx-auto max-w-6xl px-6 py-24 ${started ? "gw-recognition-started" : ""}`} aria-labelledby="gw-recognition-title">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SOUND FAMILIAR?</p>
        <h2 id="gw-recognition-title" className="mt-4 font-serif text-4xl md:text-5xl">You watched the tutorial. Then you <em className="text-primary">froze at the formula bar.</em></h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">You've seen how Excel formulas work, but actually using them is a different story. Watching someone solve a spreadsheet problem doesn't mean you can solve it yourself. That's why Gridwise lets you practice Excel online with interactive exercises, type formulas into a real spreadsheet, and see instantly whether they work. No more just watching and hoping it sticks. Learn by doing, one exercise at a time.</p>
      </div>

      <div className="relative mt-12 grid items-stretch gap-5 lg:grid-cols-2 lg:gap-16">
        <article className="gw-watching min-w-0 rounded-lg border bg-muted/50 p-5 sm:p-7" aria-label="Watching">
          <h3 className="text-xl font-semibold">WATCHING</h3>
          <p className="mt-2 text-lg font-semibold">Feels like learning. Gone by Thursday.</p>
          <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">You follow every step in the tutorial, but when it's your turn to use the formula, you don't know where to start.</p>
          <div className="relative mt-6 flex aspect-video flex-col justify-between overflow-hidden rounded border bg-card p-4" aria-label="Paused tutorial video at 3 minutes 42 seconds">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground" />Paused</div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground"><Play className="size-7" aria-hidden="true" /><span className="font-mono text-lg sm:text-xl">=VLOOKUP(</span></div>
            <div>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">&quot;...and then you just apply the formula.&quot;</p>
              <div className="mt-4 flex items-center gap-3"><span className="text-[11px] tabular-nums text-muted-foreground">3:42</span><div className="h-1 flex-1 rounded bg-border"><div className="relative h-1 w-2/5 rounded bg-muted-foreground"><span className="absolute -right-1 -top-1 size-3 rounded-full bg-muted-foreground" /></div></div></div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span className="gw-forgotten font-mono" aria-hidden="true">=VLOOKUP(</span><span>Your turn.</span></div>
          <div className="mt-2 flex h-11 items-center gap-3 rounded border bg-card px-3" aria-label="Empty formula bar"><span className="border-r pr-3 font-serif italic text-muted-foreground">fx</span><span className="gw-empty-cursor h-5 border-l border-foreground" aria-hidden="true" /></div>
        </article>

        <div className="gw-comparison-note flex items-center justify-center gap-3 text-primary lg:absolute lg:left-1/2 lg:top-1/2 lg:z-10 lg:w-24 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col">
          <svg width="58" height="30" viewBox="0 0 58 30" fill="none" className="shrink-0" aria-hidden="true"><path d="M3 23C15 6 35 5 52 13M42 5L53 13L43 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <p className="max-w-40 text-center font-serif text-lg italic leading-tight lg:text-base">Same formula. Different outcome.</p>
        </div>

        <article className="gw-practicing min-w-0 rounded-lg border-2 border-primary bg-card p-5 shadow-lift sm:p-7" aria-label="Practicing">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">PRACTICING</h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">recommended</span>
          </div>
          <p className="mt-2 text-lg font-semibold">Type it yourself. Know it for good.</p>
          <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">Practice real Excel formulas, get instant feedback, and understand what works as you solve each spreadsheet exercise.</p>
          <div className="mt-6 overflow-hidden rounded border">
            <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-xs" aria-label="Sales spreadsheet">
              <thead><tr className="bg-cell-header text-center text-[10px] text-muted-foreground"><th className="w-6 border-b border-r py-1" aria-label="Row number" />{["A", "B", "C", "D"].map((col) => <th key={col} className="border-b border-r py-1 font-normal last:border-r-0" scope="col">{col}</th>)}</tr></thead>
              <tbody>{rows.map((row, index) => <tr key={index}>{<th scope="row" className="border-b border-r bg-cell-header py-1.5 text-center text-[10px] font-normal text-muted-foreground">{index + 1}</th>}{row.map((value, col) => <td key={col} className={`border-b border-r px-2 py-1.5 last:border-r-0 ${index === 0 ? "bg-cell-header font-semibold" : ""} ${col >= 2 ? "text-right tabular-nums" : ""} ${complete && index > 0 && row[1] === "North" && col > 0 && col < 3 ? "bg-success-soft text-accent-foreground" : ""}`}>{value}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded border bg-background px-2.5" aria-label="Animated SUMIF formula"><span className="shrink-0 border-r pr-2 font-serif italic text-muted-foreground">fx</span><span className="min-w-0 break-all font-mono text-[11px] leading-relaxed sm:text-xs">{typed}<span className="gw-typing-cursor" aria-hidden="true">{!complete ? "|" : ""}</span></span></div>
            <div className="w-16 shrink-0 text-center"><span className="block text-[10px] text-muted-foreground">E2</span><output aria-label="SUMIF result" className={`mt-1 flex h-11 items-center justify-center rounded border-2 font-semibold tabular-nums ${complete ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{complete ? "330" : ""}</output></div>
          </div>
          <div className="mt-4 min-h-7" aria-live="polite">{complete && <span className="inline-flex items-center gap-1.5 rounded bg-success-soft px-2.5 py-1 text-xs font-medium text-accent-foreground"><Check className="size-3.5" aria-hidden="true" />That's the one.</span>}</div>
        </article>
      </div>

      <div className="mx-auto mt-10 max-w-xl text-center">
        <p className="text-base leading-relaxed">Watching is borrowing someone else's confidence. Typing it yourself is how you keep it.</p>
        <Button asChild size="lg" className="mt-6"><Link to="/practice/$lessonId" params={{ lessonId: "intro-to-excel" }}>Type your first formula<ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </section>
  );
}