import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Player } from "@/components/Player";
import { getLesson } from "@/lib/lessons";

export const Route = createFileRoute("/practice/$lessonId")({
  loader: ({ params }) => { const l = getLesson(params.lessonId); if (!l) throw notFound(); return { title: l.title }; },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Practice"} · Gridwise` },
      { name: "description", content: `Practice ${loaderData?.title ?? "Excel"} in a real spreadsheet with instant feedback.` },
      { property: "og:title", content: `${loaderData?.title ?? "Practice"} · Gridwise` },
      { property: "og:description", content: "Hands-on Excel practice with instant, specific feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Practice,
});

function Practice() {
  const { lessonId } = Route.useParams();
  const lesson = getLesson(lessonId)!;
  return <AppShell><Player key={lessonId} steps={lesson.steps} title={lesson.title} /></AppShell>;
}
