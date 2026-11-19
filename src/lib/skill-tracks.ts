import { LESSON_INDEX } from "./lesson-index";
import { LESSONS } from "./lessons";
import type { LessonIndexEntry } from "./lesson-schema";

const definitions = [
  { id: "01", title: "Intro to Excel", summary: "Cells, selections, shortcuts and worksheets.", level: "beginner" },
  { id: "02", title: "Formulas & Arithmetic", summary: "Arithmetic, cell references and reliable formulas.", level: "beginner" },
  { id: "03", title: "Summaries that matter", summary: "Totals, averages, counts and rounded results.", level: "beginner" },
  { id: "04", title: "Decisions with IF", summary: "Logical tests and multi-condition decisions.", level: "intermediate" },
  { id: "05", title: "Lookups", summary: "VLOOKUP, XLOOKUP and INDEX/MATCH.", level: "intermediate" },
  { id: "06", title: "Clean & reshape text", summary: "Join, extract and tidy names and codes.", level: "intermediate" },
  { id: "07", title: "Conditional summaries", summary: "Summarize values that match your criteria.", level: "intermediate" },
  { id: "08", title: "Debug & clean", summary: "Repair formulas and clean imported data.", level: "advanced" },
  { id: "09", title: "Error trapping", summary: "Keep spreadsheet errors out of reports.", level: "advanced" },
  { id: "10", title: "Dynamic filtering", summary: "Work with modern filtering and dynamic arrays.", level: "advanced" },
] as const;

// Legacy lessons stay intact; this mapping only organizes their browsing links.
const legacyTracks: Record<string, string> = {
  "intro-to-excel": "02", basics: "02", math: "03", logical: "04",
  lookups: "05", text: "06", cleaning: "08",
};
const catalog: LessonIndexEntry[] = [
  ...LESSON_INDEX,
  ...LESSONS.filter((lesson) => !LESSON_INDEX.some((entry) => entry.id === lesson.id)).map((lesson, index) => {
    const track = legacyTracks[lesson.id] ?? "02";
    const definition = definitions.find((item) => item.id === track);
    return {
      id: lesson.id, number: lesson.lessonNumber ?? index + 1, title: lesson.title, track,
      level: definition?.level ?? "beginner", version_badge: null, step_types: ["formula" as const],
    };
  }),
];

export function buildSkillTracks(entries: LessonIndexEntry[]) {
  return [...new Set(entries.map((lesson) => lesson.track))].sort().map((id) => {
    const lessons = entries.filter((lesson) => lesson.track === id).sort((a, b) => a.number - b.number);
    const definition = definitions.find((track) => track.id === id);
    return {
      id, title: definition?.title ?? `Excel skills · Track ${id}`,
      summary: definition?.summary ?? lessons.map((lesson) => lesson.title).slice(0, 3).join(" · "),
      level: lessons[0]?.level ?? "beginner", lessons,
    };
  });
}
export const SKILL_TRACKS = buildSkillTracks(catalog);
export function getSkillTrack(id: string) {
  return SKILL_TRACKS.find((track) => track.id === id);
}
export function firstTrackLessons() {
  return SKILL_TRACKS.flatMap((track) => {
    const lesson = track.lessons[0];
    return lesson ? [{ track, lesson }] : [];
  });
}
