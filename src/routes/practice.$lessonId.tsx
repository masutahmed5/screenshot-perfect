import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ContentLessonPlayer, InvalidContentLesson } from "@/components/ContentLessonPlayer";
import { getContentIndexEntry, loadContentLesson } from "@/lib/lesson-content";
import { getLesson, LESSONS } from "@/lib/lessons";
import { structuredLegacy } from "@/lib/structured-legacy";

export const Route = createFileRoute("/practice/$lessonId")({
  loader: async ({ params }) => {
    const indexEntry = getContentIndexEntry(params.lessonId);
    if (indexEntry) {
      const { lesson } = await loadContentLesson(params.lessonId);
      return { title: lesson?.title ?? indexEntry.title, lesson, invalidContent: !lesson };
    }
    const legacyLesson = getLesson(params.lessonId);
    if (!legacyLesson) throw notFound();
    return { title: legacyLesson.title, lesson: null, invalidContent: false };
  },
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
const { lesson, invalidContent } = Route.useLoaderData();
  if (invalidContent) return <AppShell practiceLessonId={lessonId}><InvalidContentLesson id={lessonId} /></AppShell>;
  if (lesson) return <AppShell practiceLessonId={lessonId}><ContentLessonPlayer key={lessonId} lesson={lesson} /></AppShell>;
  const legacyLesson = getLesson(lessonId);
  if (!legacyLesson) return <AppShell practiceLessonId={lessonId}><InvalidContentLesson id={lessonId} /></AppShell>;
  return <AppShell practiceLessonId={lessonId}><ContentLessonPlayer key={lessonId} lesson={structuredLegacy(legacyLesson, LESSONS.indexOf(legacyLesson))} legacyLesson={legacyLesson} /></AppShell>;
}
