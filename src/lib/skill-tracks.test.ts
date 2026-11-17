import { describe, expect, it } from "vitest";
import { firstTrackLessons, getSkillTrack, SKILL_TRACKS } from "./skill-tracks";

describe("skill track browsing", () => {
  it("shows exactly ten numbered tracks", () => {
    expect(SKILL_TRACKS.map((track) => track.id)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
  });
  it("keeps all thirteen beginner lessons in Track 01", () => {
    const track = getSkillTrack("01");
    expect(track?.lessons.map((lesson) => lesson.id)).toEqual(Array.from({ length: 13 }, (_, index) => `L${String(index + 1).padStart(3, "0")}`));
    expect(track?.lessons.every((lesson) => lesson.level === "beginner")).toBe(true);
  });
  it("offers only the first available lesson of each populated track", () => {
    const first = firstTrackLessons();
    expect(first.find((item) => item.track.id === "01")?.lesson.id).toBe("L001");
    expect(first.map((item) => item.track.id)).toEqual(SKILL_TRACKS.filter((track) => track.lessons.length > 0).map((track) => track.id));
    expect(first.every(({ track, lesson }) => lesson.id === track.lessons[0]?.id)).toBe(true);
    expect(new Set(first.map((item) => item.track.level))).toEqual(new Set(["beginner", "intermediate", "advanced"]));
  });
});
