import { useSyncExternalStore } from "react";

export type Progress = {
  xp: number;
  streak: number;
  lastDay: string | null;
  completed: Record<string, { firstTry: boolean; hints: number; at: number }>;
  mistakes: Record<string, number>; // stepId -> count (review queue)
  attempts: LessonAttempt[];
  lessonRuns: Record<string, LessonRun>;
};
export type LessonRun = {
  status: "in_progress" | "completed";
  current_step: string;
  last_opened: number;
  steps: Record<string, { status: "in_progress" | "completed"; attempts: number; hints_used: number; time_ms: number }>;
  sheets: Record<string, Record<string, string>>;
  workbooks?: Record<string, Record<string, Record<string, string>>>;
};
export type LessonAttempt = {
  lesson_id?: string;
  step_id: string;
  formula: string;
  result: string;
  correct: boolean;
  time_ms: number;
  hints_used: number;
  timestamp: string;
};
const KEY = "gridwise.progress.v1";
const empty: Progress = { xp: 0, streak: 0, lastDay: null, completed: {}, mistakes: {}, attempts: [], lessonRuns: {} };
let state: Progress = empty;
let loaded = false;
const subs = new Set<() => void>();

function mergeWorkbooks(
  previous: LessonRun["workbooks"] = {},
  patch: LessonRun["workbooks"] = {},
) {
  const merged = { ...previous };
  for (const [stepId, sheets] of Object.entries(patch)) {
    merged[stepId] = { ...merged[stepId], ...sheets };
  }
  return merged;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...empty, ...JSON.parse(raw) }; } catch { /* ignore */ }
}
function save(next: Progress) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
const today = () => new Date().toISOString().slice(0, 10);

export function useProgress() {
  return useSyncExternalStore(
    (cb) => { load(); subs.add(cb); cb(); return () => subs.delete(cb); },
    () => { load(); return state; },
    () => empty,
  );
}

export function recordMistake(stepId: string) {
  load();
  save({ ...state, mistakes: { ...state.mistakes, [stepId]: (state.mistakes[stepId] ?? 0) + 1 } });
}

export function recordLessonAttempt(attempt: LessonAttempt) {
  load();
  const lessonRun = attempt.lesson_id ? state.lessonRuns[attempt.lesson_id] ?? {
    status: "in_progress" as const,
    current_step: attempt.step_id,
    last_opened: Date.now(),
    steps: {},
    sheets: {},
    workbooks: {},
  } : null;
  const previous = lessonRun?.steps[attempt.step_id] ?? { status: "in_progress" as const, attempts: 0, hints_used: 0, time_ms: 0 };
  const nextRun = lessonRun ? {
    ...lessonRun,
    steps: {
      ...lessonRun.steps,
      [attempt.step_id]: {
        status: attempt.correct ? "completed" as const : "in_progress" as const,
        attempts: previous.attempts + 1,
        hints_used: Math.max(previous.hints_used, attempt.hints_used),
        time_ms: previous.time_ms + attempt.time_ms,
      },
    },
    last_opened: Date.now(),
  } : lessonRun;
  save({
    ...state,
    attempts: [...state.attempts, attempt],
    ...(attempt.lesson_id && nextRun ? { lessonRuns: { ...state.lessonRuns, [attempt.lesson_id]: nextRun } } : {}),
  });
}

export function recordLessonProgress(lessonId: string, patch: Partial<LessonRun>) {
  load();
  const previous = state.lessonRuns[lessonId] ?? {
    status: "in_progress" as const,
    current_step: "",
    last_opened: Date.now(),
    steps: {},
    sheets: {},
    workbooks: {},
  };
  save({
    ...state,
    lessonRuns: {
      ...state.lessonRuns,
      [lessonId]: {
        ...previous,
        ...patch,
        steps: patch.steps ? { ...previous.steps, ...patch.steps } : previous.steps,
        sheets: patch.sheets ? { ...previous.sheets, ...patch.sheets } : previous.sheets,
        workbooks: patch.workbooks ? mergeWorkbooks(previous.workbooks, patch.workbooks) : previous.workbooks,
        last_opened: Date.now(),
      },
    },
  });
}

export function xpFor(firstTry: boolean, hints: number) {
  return Math.max(2, (firstTry ? 15 : 8) - hints * 3);
}

export function recordComplete(stepId: string, firstTry: boolean, hints: number) {
  load();
  const already = !!state.completed[stepId];
  const d = today();
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const streak = state.lastDay === d ? state.streak : state.lastDay === y ? state.streak + 1 : 1;
  const mistakes = { ...state.mistakes };
  if (firstTry && mistakes[stepId]) delete mistakes[stepId];
  save({
    ...state,
    xp: state.xp + (already ? 2 : xpFor(firstTry, hints)),
    streak,
    lastDay: d,
    mistakes,
    completed: { ...state.completed, [stepId]: { firstTry, hints, at: Date.now() } },
  });
}

export function resetProgress() { save(empty); }
