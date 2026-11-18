import { describe, expect, it } from "vitest";
import { buildSkillTracks, firstTrackLessons, getSkillTrack, SKILL_TRACKS } from "./skill-tracks";

describe("skill track browsing", () => {
  it("shows only the updated Track 01 while other tracks have no content", () => {
    expect(SKILL_TRACKS.map((track) => track.id)).toEqual(["01"]);
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
    expect(first.map((item) => item.track.level)).toEqual(["beginner"]);
  });
  it("adds future tracks with their actual counts and lesson level", () => {
    const tracks = buildSkillTracks([
      { id: "L014", number: 14, title: "References", track: "02", level: "intermediate", version_badge: null, step_types: ["formula"] },
      { id: "L015", number: 15, title: "Arithmetic", track: "02", level: "intermediate", version_badge: null, step_types: ["formula"] },
      { id: "L024", number: 24, title: "Totals", track: "03", level: "advanced", version_badge: null, step_types: ["formula"] },
    ]);
    expect(tracks.map(({ id, lessons, level }) => ({ id, count: lessons.length, level }))).toEqual([
      { id: "02", count: 2, level: "intermediate" }, { id: "03", count: 1, level: "advanced" },
    ]);
  });
});
