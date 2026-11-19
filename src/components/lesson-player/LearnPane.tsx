import { Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet } from "@/components/Sheet";
import type { LessonContent } from "@/lib/lesson-schema";
import { addr, formatValue, type CellMap } from "@/lib/formula";
import { KeycapCombo, type ShortcutPlatform } from "./primitives";

/** Tokenizes display only; source content and accepted keyboard chords stay intact. */
export function ShortcutText({ text, platform }: { text: string; platform: ShortcutPlatform }) {
  const parts = text.split(/(\{\{\w+\}\}(?:\+\w+)+|(?:Ctrl|Cmd|Command|Control|Alt|Shift|Fn|Meta)(?:\+(?:[\w;]+|[↑↓←→]))+|\bF[2-5]\b|\bEsc\b)/gi);
  return <>{parts.map((part,i) => /^(?:\{\{\w+\}\}(?:\+\w+)+|(?:Ctrl|Cmd|Command|Control|Alt|Shift|Fn|Meta)(?:\+(?:[\w;]+|[↑↓←→]))+|F[2-5]|Esc)$/i.test(part) ? <KeycapCombo key={i} keys={part.split("+").map(k => /^(Ctrl|Cmd|Command|Control|Meta)$/i.test(k) ? "{{Mod}}" : k)} platform={platform} /> : <span key={i}>{part}</span>)}</>;
}

function exampleMaps(example: LessonContent["examples"][number]) {
  const before:CellMap={}; example.data.forEach((row,r)=>row.forEach((cell,c)=> { before[addr(c,r)]=cell===null?"":typeof cell==="object" ? "formula" in cell?cell.formula:cell.date:String(cell); }));
  const after={...before};
  const text=String(example.result); const match=/([A-Z]+\d+)\s+(?:shows|reads|keeps|returns to)\s+(.+?)(?:\s+again)?$/i.exec(text);
  if(match?.[1] && match[2]) after[match[1]]=match[2];
  else if(example.formula.startsWith("=")) { const row=Math.max(1,example.data.length-1); after[addr(Math.max(1,(example.data[0]?.length ?? 2)-1),row)]=typeof example.result === "number" || typeof example.result === "string" || typeof example.result === "boolean" ? formatValue(example.result) : String(example.result); }
  return {before,after};
}

export function LearnPane({ lesson, platform }: { lesson: LessonContent; platform: ShortcutPlatform }) {
  const shortcuts = lesson.steps.filter(s=>s.validation.mode==="shortcut").flatMap(s=>s.validation.mode==="shortcut" ? s.validation.accepted_sequences[platform].flat().filter(k=>!/^Type:/i.test(k) && (/\+/.test(k)||/^F\d+$|^Esc$/i.test(k))).map(keys=>({keys,explanation:s.explanation,when:s.prompt})) : []).filter((s,i,all)=>s.keys && all.findIndex(x=>x.keys===s.keys)===i);
  return <div className="lp-learn-content">
    <p className="lp-eyebrow">Lesson {String(lesson.number).padStart(2,"0")} · {lesson.level} · {lesson.estimated_minutes} min</p>
    <h1 id="lesson-title">{lesson.title}</h1>
    <div className="lp-goal"><Target aria-hidden /><p><ShortcutText text={lesson.objectives[0] ?? ""} platform={platform} /></p></div>
    <p className="lp-intro"><ShortcutText text={lesson.about.split(/(?<=[.!?])\s/)[0] ?? lesson.about} platform={platform} /></p>
    <details className="lp-details"><summary>About this lesson</summary><p><ShortcutText text={lesson.about} platform={platform}/></p></details>
    {shortcuts.length>0 && <section><h2>Shortcut cheat sheet</h2><div className="lp-cheat-table">{shortcuts.map(s=><div key={s.keys}><KeycapCombo keys={s.keys.split("+")} platform={platform}/><span><ShortcutText text={s.explanation} platform={platform}/></span><span className="lp-caption"><ShortcutText text={s.when.split(/(?<=[.!?])\s/)[0] ?? s.when} platform={platform}/></span></div>)}</div></section>}
    {lesson.syntax!=="—" && <section><h2>Syntax</h2><code className="lp-syntax">{lesson.syntax}</code></section>}
    <section><h2>Examples</h2><Tabs defaultValue="0"><TabsList className="lp-example-tabs" aria-label="Lesson examples">{lesson.examples.map((e,i)=><TabsTrigger key={i} value={String(i)}>{/Ctrl\+Y|Cmd\+Y/i.test(e.formula)?"Redo":/Ctrl\+Z|Cmd\+Z/i.test(e.formula)?"Undo":/Esc/i.test(e.formula)?"Cancel":/F2/i.test(e.formula)?"Edit":`Example ${i+1}`}</TabsTrigger>)}</TabsList>{lesson.examples.map((e,i)=> { const maps=exampleMaps(e);return <TabsContent key={i} value={String(i)}><div className="lp-example-pair" aria-hidden="true" inert><div><p className="lp-caption">Before</p><div className="lp-mini-sheet"><Sheet cells={maps.before} onChange={()=>undefined} rows={Math.max(3,e.data.length)} cols={Math.max(3,e.data[0]?.length ?? 3)} editableCells={[]} compact variant="standard" /></div></div><span aria-hidden>→</span><div><p className="lp-caption">After</p><div className="lp-mini-sheet"><Sheet cells={maps.after} onChange={()=>undefined} rows={Math.max(3,e.data.length)} cols={Math.max(3,e.data[0]?.length ?? 3)} editableCells={[]} compact variant="standard" /></div></div></div><p className="lp-example-keys"><ShortcutText text={e.formula} platform={platform}/></p><p>{String(e.result)}</p><p className="lp-secondary"><ShortcutText text={e.why} platform={platform}/></p></TabsContent>; })}</Tabs></section>
    <section><h2>Watch out</h2><ul className="lp-watch-out">{lesson.watch_out.map(item=><li key={item}><ShortcutText text={item} platform={platform}/></li>)}</ul></section>
  </div>;
}