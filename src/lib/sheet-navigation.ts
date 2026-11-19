import { addr, indexToCol, parseRef, type CellMap } from "./formula";

export type Position = { c: number; r: number };
export type Selection = { anchor: Position; end: Position; kind: "cells" | "rows" | "cols" };

export function selectionBounds(selection: Selection, cols: number, rows: number) {
  return {
    left: selection.kind === "rows" ? 0 : Math.min(selection.anchor.c, selection.end.c),
    right: selection.kind === "rows" ? cols - 1 : Math.max(selection.anchor.c, selection.end.c),
    top: selection.kind === "cols" ? 0 : Math.min(selection.anchor.r, selection.end.r),
    bottom: selection.kind === "cols" ? rows - 1 : Math.max(selection.anchor.r, selection.end.r),
  };
}

export function selectionLabel(selection: Selection) {
  const { anchor: a, end: b, kind } = selection;
  if (kind === "rows") return `${Math.min(a.r, b.r) + 1}:${Math.max(a.r, b.r) + 1}`;
  if (kind === "cols") return `${indexToCol(Math.min(a.c, b.c))}:${indexToCol(Math.max(a.c, b.c))}`;
  const first = addr(Math.min(a.c, b.c), Math.min(a.r, b.r));
  const last = addr(Math.max(a.c, b.c), Math.max(a.r, b.r));
  return first === last ? first : `${first}:${last}`;
}

export function readSelection(value: string, cols: number, rows: number): Selection | null {
  const clean = value.toUpperCase().replace(/\$/g, "").trim();
  const [first, last = first] = clean.split(":");
  if (!first || !last) return null;
  const a = parseRef(first), b = parseRef(last);
  if (a && b && a.col < cols && b.col < cols && a.row < rows && b.row < rows) {
    return { anchor: { c: a.col, r: a.row }, end: { c: b.col, r: b.row }, kind: "cells" };
  }
  if (/^\d+:\d+$/.test(clean)) {
    const r1 = Number(first) - 1, r2 = Number(last) - 1;
    if (r1 >= 0 && r2 >= 0 && r1 < rows && r2 < rows) return { anchor: { c: 0, r: r1 }, end: { c: 0, r: r2 }, kind: "rows" };
  }
  if (/^[A-Z]+:[A-Z]+$/.test(clean)) {
    const c1 = parseRef(`${first}1`), c2 = parseRef(`${last}1`);
    if (c1 && c2 && c1.col < cols && c2.col < cols) return { anchor: { c: c1.col, r: 0 }, end: { c: c2.col, r: 0 }, kind: "cols" };
  }
  return null;
}

export function jumpPosition(start: Position, dc: number, dr: number, cells: CellMap, cols: number, rows: number): Position {
  const occupied = (p: Position) => (cells[addr(p.c, p.r)] ?? "") !== "";
  const valid = (p: Position) => p.c >= 0 && p.c < cols && p.r >= 0 && p.r < rows;
  let current = start;
  let next = { c: current.c + dc, r: current.r + dr };
  if (!valid(next)) return start;
  const contiguous = occupied(start) && occupied(next);
  while (valid(next)) {
    if (contiguous && !occupied(next)) break;
    current = next;
    if (!contiguous && occupied(current)) break;
    next = { c: current.c + dc, r: current.r + dr };
  }
  return current;
}

export function usedEnd(cells: CellMap): Position {
  const positions = Object.entries(cells).filter(([, value]) => value !== "").flatMap(([key]) => {
    const ref = parseRef(key);
    return ref ? [ref] : [];
  });
  return { c: Math.max(0, ...positions.map((p) => p.col)), r: Math.max(0, ...positions.map((p) => p.row)) };
}

export function currentRegion(start: Position, cells: CellMap, cols: number, rows: number): Selection {
  let left = start.c, right = start.c, top = start.r, bottom = start.r;
  const occupied = (c: number, r: number) => (cells[addr(c, r)] ?? "") !== "";
  let changed = true;
  while (changed) {
    changed = false;
    if (left > 0 && Array.from({ length: bottom - top + 1 }, (_, i) => occupied(left - 1, top + i)).some(Boolean)) { left--; changed = true; }
    if (right < cols - 1 && Array.from({ length: bottom - top + 1 }, (_, i) => occupied(right + 1, top + i)).some(Boolean)) { right++; changed = true; }
    if (top > 0 && Array.from({ length: right - left + 1 }, (_, i) => occupied(left + i, top - 1)).some(Boolean)) { top--; changed = true; }
    if (bottom < rows - 1 && Array.from({ length: right - left + 1 }, (_, i) => occupied(left + i, bottom + 1)).some(Boolean)) { bottom++; changed = true; }
  }
  return { anchor: { c: left, r: top }, end: { c: right, r: bottom }, kind: "cells" };
}