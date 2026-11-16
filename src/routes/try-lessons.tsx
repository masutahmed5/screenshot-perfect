import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { firstTrackLessons } from "@/lib/skill-tracks";

export const Route = createFileRoute("/try-lessons")({
  head: () => ({ meta: [
    { title: "Try the first Excel lessons · Gridwise" },
    { name: "description", content: "Try the first available lesson from each Gridwise Excel track, from beginner to advanced." },
    { property: "og:title", content: "Try the first Excel lessons · Gridwise" },
    { property: "og:description", content: "Choose a beginner, intermediate or advanced Excel lesson and start practicing." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: FirstLessons,
});
function FirstLessons() {
  const [level, setLevel] = useState("all");
  const lessons = firstTrackLessons().filter((item) => level === "all" || item.track.level === level);
  return <AppShell><div className="mx-auto max-w-5xl px-6 py-10">
    <Button asChild variant="ghost" className="mb-6"><Link to="/learn"><ArrowLeft aria-hidden className="size-4" />All tracks</Link></Button>
    <h1 className="font-serif text-4xl">Try the first lessons</h1>
    <p className="mt-3 text-muted-foreground">First lessons from every available track · No sign-up needed</p>
    <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Lesson level">{["all", "beginner", "intermediate", "advanced"].map((item) => <Button key={item} variant={level === item ? "default" : "outline"} size="sm" aria-pressed={level === item} onClick={() => setLevel(item)} className="capitalize">{item === "all" ? "All levels" : item}</Button>)}</div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {lessons.map(({ track, lesson }) => <Button key={track.id} asChild variant="outline" className="h-auto min-h-44 flex-col items-stretch justify-start gap-0 whitespace-normal rounded-lg bg-card p-5 text-left shadow-soft"><Link to="/practice/$lessonId" params={{ lessonId: lesson.id }}><p className="font-mono text-xs font-normal text-muted-foreground">Track {track.id} · First lesson</p><h2 className="mt-4 text-lg font-semibold">{lesson.title}</h2><p className="mt-2 text-sm font-normal text-muted-foreground">{track.title}</p><div className="mt-auto flex items-center justify-between pt-5"><span className="text-xs font-normal capitalize text-primary">{track.level}</span><ArrowRight aria-hidden className="size-4 text-primary" /></div></Link></Button>)}
    </div>
  </div></AppShell>;
}
