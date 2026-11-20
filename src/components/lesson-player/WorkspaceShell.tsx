import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Flame, Home, List, Moon, Sun, UserRound } from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { LESSON_INDEX } from "@/lib/lesson-index";
import { getSkillTrack } from "@/lib/skill-tracks";
import { useProgress } from "@/lib/progress";
import type { LessonContent } from "@/lib/lesson-schema";
import { clampPaneRatio } from "@/lib/lesson-player-presentation";
import { SegmentedControl } from "./primitives";
import { LessonDrawer } from "./LessonDrawer";

export function WorkspaceShell({ lesson, learn, practice }: { lesson: LessonContent; learn: ReactNode; practice: ReactNode }) {
  const p = useProgress(); const [open,setOpen] = useState(false); const [view,setView] = useState("practice"); const [ratio,setRatio] = useState(28); const [theme,setTheme] = useState("light");
  const area = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const previous = LESSON_INDEX.filter(l => l.number < lesson.number).sort((a,b) => b.number-a.number)[0]; const next = LESSON_INDEX.filter(l => l.number > lesson.number).sort((a,b) => a.number-b.number)[0];
  const [displayXP,setDisplayXP] = useState(p.xp);
  useEffect(() => { const from=displayXP; const start=performance.now(); let frame=0; const animate=(now:number)=> { const t=Math.min(1,(now-start)/600); setDisplayXP(Math.round(from+(p.xp-from)*t)); if(t<1) frame=requestAnimationFrame(animate); }; frame=requestAnimationFrame(animate); return()=>cancelAnimationFrame(frame); }, [p.xp]);
  useEffect(() => { try { setRatio(clampPaneRatio(Number(localStorage.getItem("gridwise.pane-ratio.v2") ?? 28),area.current?.clientWidth ?? 1000)); setTheme(localStorage.getItem("gridwise.player-theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")); } catch {} }, []);
  useEffect(() => { const resize=()=>setRatio(r=>clampPaneRatio(r,area.current?.clientWidth ?? 1000)); window.addEventListener("resize",resize); return()=>window.removeEventListener("resize",resize); }, []);
  useEffect(() => { const key=(e:KeyboardEvent)=> { if ((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k" && !(document.activeElement instanceof Element && document.activeElement.closest('[data-keyboard-sheet="true"]'))) { e.preventDefault(); setOpen(v=>!v); } }; window.addEventListener("keydown",key); return()=>window.removeEventListener("keydown",key); }, []);
  const updateRatio=(r:number)=> { const value=clampPaneRatio(r,area.current?.clientWidth ?? 1000); setRatio(value); try { localStorage.setItem("gridwise.pane-ratio.v2",String(value)); } catch {} };
  return <div className={`gw-lesson-player lp-shell ${theme === "dark" ? "dark" : ""}`}>
    <header className="lp-topbar">
      <Button asChild variant="ghost" className="lp-home-link" title="Gridwise home" aria-label="Gridwise home"><Link to="/"><Home aria-hidden /><span>Gridwise</span></Link></Button>
      <Button ref={trigger} variant="ghost" className="lp-lessons-trigger" aria-label="Lessons" title="Browse lessons" aria-expanded={open} aria-controls="lesson-drawer" onClick={()=>setOpen(true)}><List /><span>Lessons</span></Button>
      <nav className="lp-breadcrumb" aria-label="Lesson breadcrumb"><Button variant="ghost" onClick={()=>setOpen(true)}>{lesson.level}</Button><span aria-hidden>›</span><Button variant="ghost" onClick={()=>setOpen(true)}>{getSkillTrack(lesson.track)?.title}</Button><span aria-hidden>›</span><strong>{String(lesson.number).padStart(2,"0")} {lesson.title}</strong></nav>
      <div className="lp-lesson-nav">{previous ? <Button asChild size="icon" variant="ghost" title={previous.title} aria-label={`Previous lesson: ${previous.title}`}><Link to="/practice/$lessonId" params={{ lessonId: previous.id }}><ArrowLeft /></Link></Button> : <Button disabled size="icon" variant="ghost" aria-label="Previous lesson"><ArrowLeft /></Button>}{next ? <Button asChild size="icon" variant="ghost" title={next.title} aria-label={`Next lesson: ${next.title}`}><Link to="/practice/$lessonId" params={{ lessonId: next.id }}><ArrowRight /></Link></Button> : <Button disabled size="icon" variant="ghost" aria-label="Next lesson"><ArrowRight /></Button>}</div>
      <span className="lp-streak" title={`${p.streak}-day streak. Finish a lesson today to keep it going.`}><Flame aria-hidden />{p.streak}</span><span className="lp-xp" title="XP earned from completed practice steps">{displayXP} XP</span>
      <Button variant="ghost" size="icon" aria-label={theme==="dark"?"Use light theme":"Use dark theme"} title="Change theme" onClick={()=> { const next=theme==="dark"?"light":"dark"; setTheme(next); try{localStorage.setItem("gridwise.player-theme",next);}catch{} }}>{theme==="dark"?<Sun/>:<Moon/>}</Button>
      <Dropdown.Root><Dropdown.Trigger asChild><Button variant="ghost" size="icon" aria-label="Guest menu" title="Guest menu"><UserRound /></Button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className={`gw-lesson-player lp-guest-menu ${theme==="dark"?"dark":""}`} sideOffset={8}><Dropdown.Label>Guest mode</Dropdown.Label><Dropdown.Item asChild><Link to="/">Home</Link></Dropdown.Item><Dropdown.Item asChild><Link to="/dashboard">Today</Link></Dropdown.Item><Dropdown.Item asChild><Link to="/learn">All skills</Link></Dropdown.Item><Dropdown.Item asChild><Link to="/review">Review</Link></Dropdown.Item></Dropdown.Content></Dropdown.Portal></Dropdown.Root>
    </header>
    <div className="lp-view-toggle"><SegmentedControl label="Workspace view" value={view} onValueChange={setView} options={[{value:"learn",label:"Learn"},{value:"practice",label:"Practice"}]} /></div>
    <div className="lp-workspace" ref={area} data-view={view} style={{"--lp-learn-ratio":`${ratio}%`} as CSSProperties}>
      <section className="lp-learn-pane" aria-label="Learn">{learn}</section>
      <div className="lp-divider" role="separator" tabIndex={0} aria-label="Resize Learn and Practice panes" aria-orientation="vertical" aria-valuenow={Math.round(ratio)} aria-valuemin={Math.ceil(260/(area.current?.clientWidth ?? 1000)*100)} aria-valuemax={Math.floor(((area.current?.clientWidth ?? 1000)-480)/(area.current?.clientWidth ?? 1000)*100)} onDoubleClick={()=>updateRatio(28)} onKeyDown={e=> { if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();updateRatio(ratio+(e.key==="ArrowRight"?2:-2));} }} onPointerDown={e=> { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e=> { if(e.currentTarget.hasPointerCapture(e.pointerId)){const box=area.current?.getBoundingClientRect();if(box)updateRatio((e.clientX-box.left)/box.width*100);} }} onPointerUp={e=>e.currentTarget.releasePointerCapture(e.pointerId)} />
      <section className="lp-practice-pane" aria-label="Practice">{practice}</section>
    </div>
    <LessonDrawer open={open} onOpenChange={setOpen} currentId={lesson.id} trackId={lesson.track} theme={theme} trigger={trigger} />
  </div>;
}