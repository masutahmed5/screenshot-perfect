import type { LessonIndexEntry } from "./lesson-schema";
import { JSON_TRACK_LESSONS } from "./jsonLessons";

export const LESSON_INDEX: LessonIndexEntry[] = [
  ...JSON_TRACK_LESSONS.map((lesson) => ({
    id: lesson.id, number: lesson.number, title: lesson.title, track: lesson.track,
    level: lesson.level, version_badge: lesson.version_badge,
    step_types: [...new Set(lesson.steps.map((step) => step.type))],
  })),
  { id: "L018", number: 18, title: "Relative and absolute references", track: "02", level: "beginner", version_badge: null, step_types: ["formula"] },
  { id: "L024", number: 24, title: "SUM: add a range", track: "03", level: "beginner", version_badge: null, step_types: ["formula"] },
  { id: "L078", number: 78, title: "Introduction to SUMIF", track: "07", level: "intermediate", version_badge: null, step_types: ["formula"] },
];
