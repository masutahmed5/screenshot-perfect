import { useSyncExternalStore } from "react";

export type Progress = {
  xp: number;
  streak: number;
  lastDay: string | null;
  completed: Record<string, { firstTry: boolean; hints: number; at: number }>;
  mistakes: Record<string, number>; // stepId -> count (review queue)
};
const KEY = "gridwise.progress.v1";
const empty: Progress = { xp: 0, streak: 0, lastDay: null, completed: {}, mistakes: {} };
let state: Progress = empty;
let loaded = false;
const subs = new Set<() => void>();

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
