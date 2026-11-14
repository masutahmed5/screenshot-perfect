import { LESSON_INDEX } from "./lesson-index";
import { lessonSchema, type LessonContent, type LessonIndexEntry } from "./lesson-schema";

const trackModules = import.meta.glob("../../content/lessons/track-*.json", {
  import: "default",
}) as Record<string, () => Promise<unknown>>;

const trackCache = new Map<string, Promise<LessonContent[]>>();
const invalidById = new Map<string, string>();

function logInvalid(file: string, issue: string) {
  if (import.meta.env.DEV) console.error(`[lessons] ${file} is invalid: ${issue}`);
}

async function loadTrack(track: string): Promise<LessonContent[]> {
  const cached = trackCache.get(track);
  if (cached) return cached;

  const file = Object.keys(trackModules).find((path) => path.includes(`/track-${track}-`));
  if (!file) return [];

  const task = trackModules[file]!()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logInvalid(file, message);
      for (const entry of LESSON_INDEX.filter((item) => item.track === track)) invalidById.set(entry.id, message);
      return [];
    })
    .then((raw) => {
      if (!Array.isArray(raw)) {
        logInvalid(file, "Expected an array of lessons.");
        for (const entry of LESSON_INDEX.filter((item) => item.track === track)) invalidById.set(entry.id, "Expected an array of lessons.");
        return [];
      }

      const lessons: LessonContent[] = [];
      raw.forEach((value, index) => {
        const parsed = lessonSchema.safeParse(value);
        if (parsed.success) {
          lessons.push(parsed.data);
          return;
        }
        const message = parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join("; ");
        const id = typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
          ? value.id
          : undefined;
        if (id) invalidById.set(id, message);
        logInvalid(`${file}[${index}]`, message);
      });
      return lessons;
    });

  trackCache.set(track, task);
  return task;
}

export async function loadContentLesson(id: string): Promise<{
  lesson: LessonContent | null;
  indexEntry: LessonIndexEntry | null;
  error: string | null;
}> {
  const entry = LESSON_INDEX.find((item) => item.id === id) ?? null;
  if (!entry) return { lesson: null, indexEntry: null, error: null };
  const lessons = await loadTrack(entry.track);
  const lesson = lessons.find((item) => item.id === id) ?? null;
  return {
    lesson,
    indexEntry: entry,
    error: lesson ? null : invalidById.get(id) ?? "Lesson content is not available yet.",
  };
}

export function getContentIndexEntry(id: string) {
  return LESSON_INDEX.find((item) => item.id === id) ?? null;
}
