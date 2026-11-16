import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SKILL_TRACKS } from "@/lib/skill-tracks";

export function TrackCards() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {SKILL_TRACKS.map((track) => <Button key={track.id} asChild variant="outline" className="group h-auto min-h-48 flex-col items-stretch justify-start gap-0 whitespace-normal rounded-lg bg-card p-5 text-left shadow-soft">
      <Link to="/learn/track/$trackId" params={{ trackId: track.id }}>
        <div className="flex items-center justify-between text-muted-foreground"><span className="font-mono text-xs">Track {track.id}</span><ArrowUpRight aria-hidden className="size-4 transition-colors group-hover:text-primary" /></div>
        <h2 className="mt-4 text-lg font-semibold">{track.title}</h2>
        <p className="mt-2 text-sm font-normal leading-relaxed text-muted-foreground">{track.summary}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-xs font-normal"><span className="flex items-center gap-1.5 text-muted-foreground"><BookOpen aria-hidden className="size-3.5" />{track.lessons.length} {track.lessons.length === 1 ? "lesson" : "lessons"}{track.lessons.length === 0 ? " · Coming soon" : ""}</span><span className="capitalize text-primary">{track.level}</span></div>
      </Link>
    </Button>)}
  </div>;
}
