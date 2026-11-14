import type { LessonIndexEntry } from "./lesson-schema";

export function lessonTracks(lessons: LessonIndexEntry[]) {
  return [...new Set(lessons.map((lesson) => lesson.track))].sort((a, b) => Number(a) - Number(b));
}

export function filterLessonIndex(lessons: LessonIndexEntry[], query: string, track: string) {
  const search = query.trim().toLocaleLowerCase();
  return lessons.filter((lesson) => {
    if (track !== "all" && lesson.track !== track) return false;
    if (!search) return true;
    return [lesson.id, lesson.title, lesson.track, lesson.level].some((value) =>
      value.toLocaleLowerCase().includes(search),
    );
  });
}
