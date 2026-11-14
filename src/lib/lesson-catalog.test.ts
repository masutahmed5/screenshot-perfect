import { describe, expect, it } from "vitest";
import { filterLessonIndex, lessonTracks } from "./lesson-catalog";
import type { LessonIndexEntry } from "./lesson-schema";

const lessons: LessonIndexEntry[] = [
  { id: "L001", number: 1, title: "Formula basics", track: "01", level: "beginner", version_badge: null, step_types: ["formula"] },
  { id: "L011", number: 11, title: "Lookup tables", track: "02", level: "intermediate", version_badge: "365", step_types: ["formula", "scenario"] },
];

describe("lesson catalog filtering", () => {
  it("filters by title, lesson id, and track without changing the catalog", () => {
    expect(filterLessonIndex(lessons, "lookup", "all").map((lesson) => lesson.id)).toEqual(["L011"]);
    expect(filterLessonIndex(lessons, "L001", "all").map((lesson) => lesson.id)).toEqual(["L001"]);
    expect(filterLessonIndex(lessons, "", "02").map((lesson) => lesson.id)).toEqual(["L011"]);
    expect(filterLessonIndex(lessons, "formula", "02")).toEqual([]);
    expect(lessons).toHaveLength(2);
  });

  it("returns tracks in numeric order", () => {
    expect(lessonTracks(lessons)).toEqual(["01", "02"]);
  });
});
