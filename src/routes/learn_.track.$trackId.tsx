import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSkillTrack } from "@/lib/skill-tracks";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/learn_/track/$trackId")({
  loader: ({ params }) => {
    const track = getSkillTrack(params.trackId);
    if (!track) throw notFound();
    return { id: track.id, title: track.title, summary: track.summary };
  },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.title ?? "Unavailable track"} · Gridwise` },
    { name: "description", content: loaderData?.summary ?? "Explore Excel skill tracks on Gridwise." },
    { property: "og:title", content: `${loaderData?.title ?? "Unavailable track"} · Gridwise` },
    { property: "og:description", content: loaderData?.summary ?? "Explore Excel skill tracks on Gridwise." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TrackLessons,
});
function TrackLessons() {
  const { trackId } = Route.useParams();
  const track = getSkillTrack(trackId);
  const [query, setQuery] = useState("");
  const progress = useProgress();
  const lessons = useMemo(() => track?.lessons.filter((lesson) => `${lesson.id} ${lesson.title}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [], [track, query]);
  if (!track) return null;
  return <AppShell><div className="mx-auto max-w-5xl px-6 py-10">
    <Button asChild variant="ghost" className="mb-6"><Link to="/learn"><ArrowLeft aria-hidden className="size-4" />All tracks</Link></Button>
    <p className="font-mono text-xs text-primary">Track {track.id}</p>
    <h1 className="mt-3 font-serif text-4xl">{track.title}</h1>
    <p className="mt-3 text-muted-foreground">{track.summary}</p>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{track.lessons.length} {track.lessons.length === 1 ? "lesson" : "lessons"} · <span className="capitalize">{track.level}</span></p>
      {track.lessons.length > 0 && <div className="relative w-full sm:w-64"><Search aria-hidden className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search track lessons" placeholder="Search lessons" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" /></div>}
    </div>
    <div className="mt-4 divide-y border-y">
      {lessons.map((lesson) => <Button key={lesson.id} asChild variant="ghost" className="h-auto w-full justify-start gap-4 whitespace-normal rounded-none px-3 py-5 text-left">
        <Link to="/practice/$lessonId" params={{ lessonId: lesson.id }}><span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">{String(track.lessons.indexOf(lesson) + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{lesson.title}</span><span className="mt-1 block text-xs font-normal capitalize text-muted-foreground">{lesson.level} · {progress.lessonRuns[lesson.id]?.status === "completed" ? "Completed" : progress.lessonRuns[lesson.id] ? "In progress" : "New"}</span></span><ArrowUpRight aria-hidden className="size-4 shrink-0 text-primary" /></Link>
      </Button>)}
    </div>
    {lessons.length === 0 && <p role="status" className="py-10 text-muted-foreground">{track.lessons.length ? "No lessons match your search." : "Lessons for this track are coming soon."}</p>}
  </div></AppShell>;
}
