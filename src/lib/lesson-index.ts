import type { LessonIndexEntry } from "./lesson-schema";
import { JSON_TRACK_LESSONS } from "./jsonLessons";

export const LESSON_INDEX: LessonIndexEntry[] = [
  ...JSON_TRACK_LESSONS.map((lesson) => ({
    id: lesson.id, number: lesson.number, title: lesson.title, track: lesson.track,
    level: lesson.level, version_badge: lesson.version_badge,
    step_types: [...new Set(lesson.steps.map((step) => step.type))],
  })),
];
