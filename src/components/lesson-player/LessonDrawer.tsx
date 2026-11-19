import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SKILL_TRACKS } from "@/lib/skill-tracks";
import { JSON_TRACK_LESSONS } from "@/lib/jsonLessons";
import { useProgress } from "@/lib/progress";
import { ProgressRing, SegmentedControl, StatusGlyph } from "./primitives";

export function LessonDrawer({ open, onOpenChange, currentId, trackId, theme, trigger }: { open: boolean; onOpenChange: (open: boolean) => void; currentId: string; trackId: string; theme: string; trigger: React.RefObject<HTMLButtonElement | null> }) {
  const progress = useProgress();
  const [query, setQuery] = useState("");
  const current = SKILL_TRACKS.flatMap(t => t.lessons).find(l => l.id === currentId);
  const [level, setLevel] = useState<string>(current?.level ?? "beginner");
  const [expanded, setExpanded] = useState([trackId]);
  const search = useRef<HTMLInputElement>(null);
  const active = useRef<HTMLAnchorElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const all = SKILL_TRACKS.flatMap(t => t.lessons);
  const completed = all.filter(l => progress.lessonRuns[l.id]?.status === "completed").length;
  const resume = all.filter(l => l.id !== currentId && progress.lessonRuns[l.id]?.status === "in_progress").sort((a,b) => (progress.lessonRuns[b.id]?.last_opened ?? 0) - (progress.lessonRuns[a.id]?.last_opened ?? 0))[0];
  useEffect(() => { if (open) { setExpanded([trackId]); setQuery(""); setLevel(current?.level ?? "beginner"); setTimeout(() => active.current?.scrollIntoView({ block: "center" }), 100); } }, [open, trackId, current?.level]);
  const filtered = SKILL_TRACKS.map(track => ({ ...track, lessons: track.lessons.filter(l => query.trim() ? `${l.title} ${track.title} ${l.number}`.toLowerCase().includes(query.trim().toLowerCase()) : l.level === level) })).filter(t => t.lessons.length);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="lp-drawer-scrim" />
    <Dialog.Content ref={content} id="lesson-drawer" className={`gw-lesson-player lp-drawer ${theme === "dark" ? "dark" : ""}`} onOpenAutoFocus={e => { e.preventDefault(); search.current?.focus(); }} onCloseAutoFocus={e => { e.preventDefault(); trigger.current?.focus(); }} aria-describedby={undefined}>
      <header className="lp-drawer-header"><Dialog.Title>Lessons</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close lessons" title="Close lessons"><X /></Button></Dialog.Close></header>
      <div className="lp-search"><Search aria-hidden /><input ref={search} aria-label="Search lessons" placeholder="Search lessons" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const links = content.current?.querySelectorAll<HTMLAnchorElement>(".lp-lesson-row"); (e.key === "ArrowDown" ? links?.[0] : links?.[links.length - 1])?.focus(); }
        if (e.key === "Enter") content.current?.querySelector<HTMLAnchorElement>(".lp-lesson-row")?.click();
      }} /></div>
      {resume && <div className="lp-resume"><p className="lp-caption">Continue where you left off</p><p>{resume.title}</p><Button asChild size="sm"><Link to="/practice/$lessonId" params={{ lessonId: resume.id }} onClick={() => onOpenChange(false)}>Resume</Link></Button></div>}
      <div className="lp-drawer-progress"><ProgressRing value={completed} max={all.length} label="Lessons completed" /><span>{completed} of {all.length} lessons</span></div>
      <SegmentedControl label="Lesson level" value={level} onValueChange={setLevel} options={["beginner", "intermediate", "advanced"].map(value => ({ value, label: `${value[0]?.toUpperCase()}${value.slice(1)} (${all.filter(l => l.level === value).length})` }))} />
      <nav className="lp-drawer-scroll" aria-label="Lesson list" onKeyDown={e => {
        if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
        const links = Array.from(content.current?.querySelectorAll<HTMLAnchorElement>(".lp-lesson-row") ?? []); const index = links.indexOf(document.activeElement as HTMLAnchorElement); if (index < 0) return;
        e.preventDefault(); links[(index + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length]?.focus();
      }}>
        <Accordion.Root type="multiple" value={query ? filtered.map(t => t.id) : expanded} onValueChange={setExpanded}>
          {filtered.map(track => <Accordion.Item value={track.id} key={track.id}>
            <Accordion.Header><Accordion.Trigger asChild><Button variant="ghost" className="lp-track-toggle"><ChevronRight aria-hidden /><span>{track.title}</span><ProgressRing value={track.lessons.filter(l => progress.lessonRuns[l.id]?.status === "completed").length} max={track.lessons.length} label={`${track.title} progress`} /><span className="lp-caption">{track.lessons.filter(l => progress.lessonRuns[l.id]?.status === "completed").length}/{track.lessons.length}</span></Button></Accordion.Trigger></Accordion.Header>
            <Accordion.Content className="lp-track-content">{track.lessons.map(l => {
              const done = progress.lessonRuns[l.id]?.status === "completed"; const lesson = JSON_TRACK_LESSONS.find(item => item.id === l.id);
              const status = done ? "completed" : l.id === currentId ? "current" : "not-started";
              const at = query ? l.title.toLowerCase().indexOf(query.toLowerCase()) : -1;
              return <Link ref={l.id === currentId ? active : undefined} key={l.id} to="/practice/$lessonId" params={{ lessonId: l.id }} onClick={() => onOpenChange(false)} aria-current={l.id === currentId ? "page" : undefined} className="lp-lesson-row">
                <StatusGlyph status={status} /><span><span className="lp-lesson-row-title">{at >= 0 ? <>{l.title.slice(0,at)}<mark>{l.title.slice(at,at+query.length)}</mark>{l.title.slice(at+query.length)}</> : l.title}</span><span className="lp-caption">{String(l.number).padStart(2,"0")} · {lesson?.estimated_minutes ?? "—"} min{!done && progress.lessonRuns[l.id] ? " · In progress" : ""}</span></span>
              </Link>;
            })}</Accordion.Content>
          </Accordion.Item>)}
        </Accordion.Root>
        {!filtered.length && <p className="lp-empty">No lessons match “{query}”. Try a shorter word.</p>}
      </nav>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}