import { useMemo, useRef, useState, useEffect, type CSSProperties } from "react";
import { addr, formatValue, indexToCol, isError, SUPPORTED_FUNCTIONS, Workbook, type CellMap } from "@/lib/formula";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { currentRegion, jumpPosition, readSelection, selectionBounds, selectionLabel, usedEnd, type Selection } from "@/lib/sheet-navigation";

type Props = {
  cells: CellMap;
  onChange: (cells: CellMap) => void;
  cols: number;
  rows: number;
  initialSelected?: string;
  highlight?: string[];
  flash?: { cell: string; kind: "correct" | "wrong"; key: number } | null;
  onEnterCheck?: (cells?: CellMap) => void;
  enterChecks?: boolean;
  compact?: boolean;
  ghost?: { cell: string; text: string; refs?: string[] } | null;
/** Zoom factor for the grid (1 = original size). Omit to render exactly as before. */
  scale?: number;
  editableCells?: string[];
  variant?: "standard" | "practice";
  onInteraction?: (active: string, range: string) => void;
  onShortcutKey?: (event: React.KeyboardEvent) => void;
  shortcutPractice?: boolean;
};

type Pos = { c: number; r: number };

const REF_COLORS = 5;

function parseCell(a: string): Pos {
  const m = /^([A-Z]+)(\d+)$/.exec(a) ?? ["", "A", "1"];
  let c = 0;
  for (const ch of (m[1] ?? "A")) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c: c - 1, r: parseInt((m[2] ?? "1")) - 1 };
}

function rangeRef(a: Pos, b: Pos): string {
  const c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
  const r1 = Math.min(a.r, b.r), r2 = Math.max(a.r, b.r);
  return c1 === c2 && r1 === r2 ? addr(c1, r1) : `${addr(c1, r1)}:${addr(c2, r2)}`;
}

// Matches A1-style refs and ranges, but not function names like LOG10( or SUM(
const REF_RE = /\$?[A-Za-z]{1,2}\$?\d{1,4}(?::\$?[A-Za-z]{1,2}\$?\d{1,4})?(?!\s*\()/g;

export function cycleReference(formula: string, caret: number) {
  if (((formula.slice(0, caret).match(/"/g)?.length ?? 0) % 2) === 1) return null;
  const refs = [...formula.matchAll(/\$?[A-Z]{1,3}\$?\d+/gi)]
    .filter((item) => ((formula.slice(0, item.index ?? 0).match(/"/g)?.length ?? 0) % 2) === 0);
  const ref = refs.filter((item) => (item.index ?? 0) <= caret).pop();
  if (!ref || ref.index === undefined) return null;
  const parts = /^(\$?)([A-Z]+)(\$?)(\d+)$/i.exec(ref[0]);
  if (!parts) return null;
  const [, colLock, col, rowLock, row] = parts;
  const locks = `${colLock ? "c" : ""}${rowLock ? "r" : ""}`;
  const nextLocks: Record<string, [boolean, boolean]> = {
    "": [true, true],
    "cr": [false, true],
    "r": [true, false],
    "c": [false, false],
  };
  const next = nextLocks[locks];
  if (!next) return null;
  const replacement = `${next[0] ? "$" : ""}${col}${next[1] ? "$" : ""}${row}`;
  return {
    formula: formula.slice(0, ref.index) + replacement + formula.slice(ref.index + ref[0].length),
    caret: ref.index + replacement.length,
  };
}

export function Sheet({ cells, onChange, cols, rows, initialSelected = "A1", highlight = [], flash, onEnterCheck, enterChecks, compact, ghost, scale, editableCells, variant = "standard", onInteraction, onShortcutKey, shortcutPractice }: Props) {
  const [sel, setSel] = useState(initialSelected);
  const [selection, setSelection] = useState<Selection>(() => ({ anchor: parseCell(initialSelected), end: parseCell(initialSelected), kind: "cells" }));
  const [selectionDrag, setSelectionDrag] = useState(false);
  const [lastKey, setLastKey] = useState("");
  const [goTo, setGoTo] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const history = useRef<CellMap[]>([]);
  const redo = useRef<CellMap[]>([]);
  const clipboard = useRef<{ bounds: ReturnType<typeof selectionBounds>; cells: CellMap } | null>(null);
  const [formats, setFormats] = useState<Record<string, { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; number?: string }>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [refDrag, setRefDrag] = useState<{ start: Pos; cur: Pos } | null>(null);
  const [refPick, setRefPick] = useState<{ anchor: Pos; end: Pos; offset: number; length: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const barInputRef = useRef<HTMLInputElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const wb = useMemo(() => new Workbook(cells), [cells]);

  useEffect(() => { setSel(initialSelected); setSelection({ anchor: parseCell(initialSelected), end: parseCell(initialSelected), kind: "cells" }); }, [initialSelected]);
  const range = selectionLabel(selection);
  const bounds = selectionBounds(selection, cols, rows);
  useEffect(() => { onInteraction?.(sel, range); }, [sel, range, onInteraction]);
  useEffect(() => {
    if (!selectionDrag) return;
    const up = () => setSelectionDrag(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [selectionDrag]);
  const select = (position: Pos, extend = false, kind: Selection["kind"] = "cells") => {
    const clamped = { c: Math.max(0, Math.min(cols - 1, position.c)), r: Math.max(0, Math.min(rows - 1, position.r)) };
    setSelection((current) => ({ anchor: extend ? current.anchor : clamped, end: clamped, kind: extend ? current.kind : kind }));
    if (!extend) setSel(addr(clamped.c, clamped.r));
  };
  const updateCells = (next: CellMap) => { history.current.push(cells); redo.current = []; onChange(next); };
  const selectionCells = () => {
    const addresses: string[] = [];
    for (let r = bounds.top; r <= bounds.bottom; r++) for (let c = bounds.left; c <= bounds.right; c++) addresses.push(addr(c, r));
    return addresses;
  };

  const selPos = parseCell(sel);
  const selCol = selPos.c;
  const selRow = selPos.r;
  const canEdit = (cell = sel) => editableCells === undefined || editableCells.includes(cell);

  const formulaMode = editing && draft.startsWith("=");
  const referenceCaret = activeInputRef.current?.selectionStart ?? draft.length;
  const liveDraft = refDrag ? draft.slice(0, referenceCaret) + rangeRef(refDrag.start, refDrag.cur) + draft.slice(referenceCaret) : draft;

  const commit = (val: string, dc = 0, dr = 1) => {
    if (!canEdit()) { setEditing(false); return; }
    updateCells({ ...cells, [sel]: val });
    setEditing(false);
    if (dc || dr) select({ c: selCol + dc, r: selRow + dr });
    gridRef.current?.focus();
  };

  const startEdit = (initial?: string) => {
    if (!canEdit()) return;
    const v = initial ?? cells[sel] ?? "";
    setDraft(v);
    setRefPick(null);
    setEditing(true);
    requestAnimationFrame(() => {
      const el = cellInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(v.length, v.length);
      }
    });
  };

  const insertRef = (ref: string) => {
    const input = activeInputRef.current;
    const pos = input ? (input.selectionStart ?? draft.length) : draft.length;
    const end = input?.selectionEnd ?? pos;
    const next = draft.slice(0, pos) + ref + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      if (input) {
        input.focus();
        input.setSelectionRange(pos + ref.length, pos + ref.length);
      }
    });
  };

  // Finish a click/drag reference pick on mouse release
  useEffect(() => {
    if (!refDrag) return;
    const up = () => {
      insertRef(rangeRef(refDrag.start, refDrag.cur));
      setRefDrag(null);
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refDrag, draft]);

  // Map each cell referenced by the draft formula to a color index (Excel-style)
  const refColorOf = useMemo(() => {
    const map = new Map<string, number>();
    if (!formulaMode) return map;
    const seen = new Map<string, number>();
    for (const m of liveDraft.matchAll(REF_RE)) {
      const key = m[0].replace(/\$/g, "").toUpperCase();
      if (!seen.has(key)) seen.set(key, seen.size % REF_COLORS);
      const idx = (seen.get(key) ?? 0);
      const [a, b] = key.split(":").map(parseCell);
      const p1 = a ?? { c: 0, r: 0 }, p2 = b ?? p1;
      const c1 = Math.max(0, Math.min(p1.c, p2.c)), c2 = Math.min(cols - 1, Math.max(p1.c, p2.c));
      const r1 = Math.max(0, Math.min(p1.r, p2.r)), r2 = Math.min(rows - 1, Math.max(p1.r, p2.r));
      if (c1 > c2 || r1 > r2) continue;
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) map.set(addr(c, r), idx);
    }
    return map;
  }, [formulaMode, liveDraft, cols, rows]);

  const dragCells = useMemo(() => {
    if (!refDrag) return new Set<string>();
    const set = new Set<string>();
    const c1 = Math.min(refDrag.start.c, refDrag.cur.c), c2 = Math.max(refDrag.start.c, refDrag.cur.c);
    const r1 = Math.min(refDrag.start.r, refDrag.cur.r), r2 = Math.max(refDrag.start.r, refDrag.cur.r);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) set.add(addr(c, r));
    return set;
  }, [refDrag]);

  const onGridKey = (e: React.KeyboardEvent) => {
    if (editing) return;
    if (variant !== "practice") {
      const directions: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Tab: [e.shiftKey ? -1 : 1, 0] };
      const direction = directions[e.key];
      if (direction) { e.preventDefault(); select({ c: selCol + direction[0], r: selRow + direction[1] }); return; }
    } else {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const directions: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      const direction = directions[e.key];
      if (direction) {
        e.preventDefault();
        const origin = e.shiftKey ? selection.end : selPos;
        const destination = mod ? jumpPosition(origin, ...direction, cells, cols, rows) : { c: origin.c + direction[0], r: origin.r + direction[1] };
        select(destination, e.shiftKey); return;
      }
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault(); select(mod ? e.key === "Home" ? { c: 0, r: 0 } : usedEnd(cells) : { c: e.key === "Home" ? 0 : cols - 1, r: selRow }, e.shiftKey); return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && shortcutPractice && !mod)) { e.preventDefault(); select({ c: selCol + (e.key === "Tab" ? e.shiftKey ? -1 : 1 : 0), r: selRow + (e.key === "Enter" ? e.shiftKey ? -1 : 1 : 0) }); return; }
      if (e.key === " " && (mod || e.shiftKey)) { e.preventDefault(); setSelection({ anchor: selPos, end: selPos, kind: mod ? "cols" : "rows" }); return; }
      if (mod && (key === "a" || (e.shiftKey && (e.code === "Digit8" || e.key === "*" || e.key === "8")))) { e.preventDefault(); setSelection(currentRegion(selPos, cells, cols, rows)); return; }
      if ((e.ctrlKey && key === "g") || e.key === "F5") { e.preventDefault(); setGoTo(""); requestAnimationFrame(() => { nameRef.current?.focus(); nameRef.current?.select(); }); return; }
      if (mod && (key === "z" || key === "y")) { e.preventDefault(); const backwards = key === "z" && !e.shiftKey; const source = backwards ? history : redo; const target = backwards ? redo : history; const next = source.current.pop(); if (next) { target.current.push(cells); onChange(next); } return; }
      if (mod && ["c", "x", "v"].includes(key)) {
        e.preventDefault();
        if (key !== "v") { clipboard.current = { bounds, cells: { ...cells } }; if (key === "x") updateCells({ ...cells, ...Object.fromEntries(selectionCells().filter(canEdit).map((a) => [a, ""])) }); }
        else if (clipboard.current) { const saved = clipboard.current; const next = { ...cells }; for (let r = saved.bounds.top; r <= saved.bounds.bottom; r++) for (let c = saved.bounds.left; c <= saved.bounds.right; c++) { const a = addr(selCol + c - saved.bounds.left, selRow + r - saved.bounds.top); if (selCol + c - saved.bounds.left < cols && selRow + r - saved.bounds.top < rows && canEdit(a)) next[a] = saved.cells[addr(c, r)] ?? ""; } updateCells(next); } return;
      }
      if (mod && (key === "d" || key === "r")) { e.preventDefault(); const next = { ...cells }; for (const a of selectionCells().filter(canEdit)) { const p = parseCell(a); next[a] = cells[key === "d" ? addr(p.c, bounds.top) : addr(bounds.left, p.r)] ?? ""; } updateCells(next); return; }
      const numberKey = /^Digit[0-9]$/.test(e.code) ? e.code.slice(5) : ({ "!": "1", "#": "3", "$": "4", "%": "5" }[e.key] ?? e.key);
      const format = mod && e.shiftKey ? ({ "1": "number", "3": "date", "4": "currency", "5": "percent" }[numberKey]) : undefined;
      const toggle = mod && !e.shiftKey ? ({ b: "bold", i: "italic", u: "underline", "5": "strike" }[key]) : mod && e.shiftKey && key === "x" ? "strike" : undefined;
      if ((format || toggle) && !(shortcutPractice && e.ctrlKey && key === "u" && /mac/i.test(navigator.platform))) { e.preventDefault(); setFormats((current) => { const next = { ...current }; for (const a of selectionCells()) next[a] = format ? { ...next[a], number: format } : { ...next[a], [toggle ?? "bold"]: !next[a]?.[toggle as "bold"] }; return next; }); return; }
      if (mod && (e.key === ";" || e.key === ":")) { e.preventDefault(); startEdit(e.shiftKey || e.metaKey ? new Date().toLocaleTimeString() : new Date().toLocaleDateString()); return; }
      if (shortcutPractice && e.ctrlKey && key === "u") { e.preventDefault(); startEdit(); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onEnterCheck?.(); }
    else if (!canEdit()) return;
    else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(); }
    else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); updateCells({ ...cells, ...Object.fromEntries(selectionCells().filter(canEdit).map((a) => [a, ""])) }); }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); startEdit(e.key); }
  };

  const onEditorKey = (e: React.KeyboardEvent<HTMLInputElement>, moveOnEnter: boolean) => {
    if (variant === "practice" && formulaMode && /^Arrow/.test(e.key) && (refPick || ((activeInputRef.current?.selectionStart === draft.length) && /[=(,+\-*/:]$/.test(draft)))) {
      e.preventDefault(); e.stopPropagation();
      const direction: Record<string, Pos> = { ArrowLeft: { c: -1, r: 0 }, ArrowRight: { c: 1, r: 0 }, ArrowUp: { c: 0, r: -1 }, ArrowDown: { c: 0, r: 1 } };
      const delta = direction[e.key];
      if (delta) {
        const origin = refPick?.end ?? selPos;
        const end = { c: Math.max(0, Math.min(cols - 1, origin.c + delta.c)), r: Math.max(0, Math.min(rows - 1, origin.r + delta.r)) };
        const anchor = e.shiftKey ? refPick?.anchor ?? selPos : end;
        const ref = rangeRef(anchor, end);
        const offset = refPick?.offset ?? draft.length;
        setDraft(draft.slice(0, offset) + ref + draft.slice(offset + (refPick?.length ?? 0)));
        setRefPick({ anchor, end, offset, length: ref.length });
        const input = e.currentTarget;
        requestAnimationFrame(() => input.setSelectionRange(offset + ref.length, offset + ref.length));
      }
    } else if (shortcutPractice && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); const input = e.currentTarget; const start = input.selectionStart ?? draft.length, end = input.selectionEnd ?? start;
      setDraft(draft.slice(0, start) + e.key + draft.slice(end)); setRefPick(null);
      requestAnimationFrame(() => input.setSelectionRange(start + 1, start + 1));
    } else if (shortcutPractice && e.key === "Backspace") {
      e.preventDefault(); setDraft(draft.slice(0, -1));
    } else if (shortcutPractice && e.key === "Enter" && e.altKey) {
      e.preventDefault(); setDraft(draft + "\n");
    } else if (shortcutPractice && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); updateCells({ ...cells, ...Object.fromEntries(selectionCells().filter(canEdit).map((a) => [a, draft])) }); setEditing(false); gridRef.current?.focus();
    } else if (e.key === "F4" && variant === "practice" && draft.startsWith("=")) {
      e.preventDefault();
      const active = activeInputRef.current;
      const result = cycleReference(draft, active?.selectionStart ?? draft.length);
      if (!result) return;
      setDraft(result.formula);
      requestAnimationFrame(() => {
        active?.focus();
        active?.setSelectionRange(result.caret, result.caret);
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const committedCells = { ...cells, [sel]: draft };
      commit(draft, 0, moveOnEnter && !enterChecks ? e.shiftKey ? -1 : 1 : 0);
      if (enterChecks || e.metaKey || e.ctrlKey) setTimeout(() => onEnterCheck?.(committedCells), 0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      setRefDrag(null);
      gridRef.current?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions[0] && fnMatch) setDraft(draft.slice(0, -(fnMatch[1] ?? "").length) + suggestions[0] + "(");
      else commit(draft, e.shiftKey ? -1 : 1, 0);
    }
  };

  const fnMatch = editing ? /([A-Z]{2,})$/i.exec(draft.startsWith("=") ? draft : "") : null;
  const suggestions = fnMatch ? SUPPORTED_FUNCTIONS.filter((f) => f.startsWith((fnMatch[1] ?? "").toUpperCase())).slice(0, 5) : [];

  const raw = editing ? liveDraft : cells[sel] ?? "";

  return (
<div
      onKeyDownCapture={(event) => {
        onShortcutKey?.(event);
        if (variant === "practice" && !["Control", "Shift", "Meta", "Alt"].includes(event.key)) setLastKey([event.ctrlKey ? "Ctrl" : "", event.metaKey ? "⌘" : "", event.altKey ? "Alt" : "", event.shiftKey ? "Shift" : "", event.key].filter(Boolean).join(" + "));
      }}
      className={cn("flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-soft", variant === "practice" && "gw-sheet-practice")}
      style={scale !== undefined ? ({ "--sheet-scale": scale } as CSSProperties) : undefined}
    >
      <div className="flex items-center gap-2 border-b bg-cell-header px-3 py-1.5">
        {variant === "practice" ? <input ref={nameRef} aria-label="Name box" className="w-24 rounded-md border bg-card px-1.5 py-0.5 text-center font-mono text-[11px]" value={goTo ?? range} onFocus={(e) => { if (goTo === null) setGoTo(range); e.currentTarget.select(); }} onChange={(e) => setGoTo(e.target.value)} onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); const next = readSelection(goTo ?? range, cols, rows); if (next) { setSelection(next); setSel(addr(next.anchor.c, next.anchor.r)); } setGoTo(null); gridRef.current?.focus(); }
          else if (e.key === "Escape") { setGoTo(null); gridRef.current?.focus(); }
        }} onBlur={() => setGoTo(null)} /> : <span className="w-10 rounded-md border bg-card px-1.5 py-0.5 text-center font-mono text-[11px] text-muted-foreground">{sel}</span>}
        <span className="font-serif text-base italic text-muted-foreground">fx</span>
        <div className="relative flex-1">
          <input
            ref={barInputRef}
            aria-label={`Formula bar for cell ${sel}`}
            className="w-full rounded-md border bg-card px-2 py-0.5 font-mono text-[13px] outline-none focus:border-primary"
            value={raw}
            disabled={!canEdit()}
            onFocus={(e) => { activeInputRef.current = e.currentTarget; if (!editing) { setDraft(cells[sel] ?? ""); setEditing(true); } }}
            onChange={(e) => { setDraft(e.target.value); setEditing(true); setRefPick(null); }}
            onKeyDown={(e) => onEditorKey(e, false)}
            spellCheck={false}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border bg-popover shadow-lift">
              {suggestions.map((f, i) => (
                <Button variant="ghost" key={f} type="button" onMouseDown={(e) => { e.preventDefault(); setDraft(draft.slice(0, -(fnMatch?.[1] ?? "").length) + f + "("); activeInputRef.current?.focus(); }}
                  className={cn("flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-xs hover:bg-accent", i === 0 && "bg-accent/60")}>
                  {f}<span className="text-[10px] text-muted-foreground">{i === 0 ? "Tab" : ""}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} role="grid" aria-label="Spreadsheet" className={cn("flex-1 outline-none", compact ? "overflow-hidden" : "overflow-auto")}>
        <table className={cn("border-collapse font-sans text-[calc(var(--font-size-grid,13px)*var(--sheet-scale,1))]", compact ? "w-full table-fixed" : "")}>
          <thead>
            <tr>
              <th className={cn("sticky left-0 top-0 z-20 border-b border-r bg-cell-header select-none", compact ? "w-9" : "w-9")} />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  onMouseDown={(e) => { if (variant !== "practice") return; e.preventDefault(); select({ c, r: selRow }, false, "cols"); gridRef.current?.focus(); }}
                  className={cn(
                    "sticky top-0 border-b border-r border-grid-line bg-cell-header px-1 py-1 text-center text-[calc(var(--font-size-header,11px)*var(--sheet-scale,1))] font-medium text-muted-foreground select-none transition-colors",
                    compact ? "min-w-0" : "min-w-[calc(6rem*var(--sheet-scale,1))]",
                    c === selCol && "bg-primary/15 text-primary font-semibold border-b-2 border-b-primary"
                  )}
                >
                  {indexToCol(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <th onMouseDown={(e) => { if (variant !== "practice") return; e.preventDefault(); select({ c: selCol, r }, false, "rows"); gridRef.current?.focus(); }} className={cn("sticky left-0 border-b border-r border-grid-line bg-cell-header px-2 text-[11px] font-medium text-muted-foreground", r === selRow && "bg-primary/15 text-primary font-semibold border-r-2 border-r-primary")}>{r + 1}</th>
                {Array.from({ length: cols }, (_, c) => {
                  const a = addr(c, r);
                  const v = wb.get(a);
                  const isSel = a === sel;
                  const inSelection = variant === "practice" && c >= bounds.left && c <= bounds.right && r >= bounds.top && r <= bounds.bottom;
                  const format = formats[a];
                  const isEditable = canEdit(a);
                  const isHL = highlight.includes(a);
                  const fl = flash && flash.cell === a ? flash : null;
                  const ghostRef = ghost?.refs?.findIndex((g) => {
                    if (!g) return false;
                    if (!g.includes(":")) return g === a;
                    const [p, q] = g.split(":").map(parseCell);
                    if (!p || !q) return false;
                    return c >= Math.min(p.c, q.c) && c <= Math.max(p.c, q.c) && r >= Math.min(p.r, q.r) && r <= Math.max(p.r, q.r);
                  }) ?? -1;
                  const refIdx = refColorOf.get(a) ?? (ghostRef >= 0 ? ghostRef : undefined);
                  const ghostHere = !editing && ghost?.cell === a;
                  const inDrag = dragCells.has(a);
                  return (
                    <td key={fl ? `${a}-${fl.key}` : a} role="gridcell" aria-selected={isSel || inSelection} aria-readonly={!isEditable} aria-label={isEditable ? a : `${a}, read only`} title={isEditable ? undefined : "Read-only cell"}
                      onMouseDown={(e) => {
                        if (e.target instanceof HTMLInputElement) return;
                        if (formulaMode) {
                          e.preventDefault();
                          setRefDrag({ start: { c, r }, cur: { c, r } });
                          return;
                        }
                        if (editing) commit(draft, 0, 0);
                        if (variant === "practice") { e.preventDefault(); select({ c, r }, e.shiftKey); setSelectionDrag(true); gridRef.current?.focus(); }
                        else setSel(a);
                      }}
                      onMouseEnter={() => { if (refDrag) setRefDrag({ ...refDrag, cur: { c, r } }); else if (selectionDrag) select({ c, r }, true); }}
                      onDoubleClick={() => startEdit()}
                      style={refIdx !== undefined ? { boxShadow: variant === "practice" && formulaMode ? [
                        refColorOf.get(addr(c - 1, r)) !== refIdx ? `inset 2px 0 var(--ref-${refIdx + 1})` : "",
                        refColorOf.get(addr(c + 1, r)) !== refIdx ? `inset -2px 0 var(--ref-${refIdx + 1})` : "",
                        refColorOf.get(addr(c, r - 1)) !== refIdx ? `inset 0 2px var(--ref-${refIdx + 1})` : "",
                        refColorOf.get(addr(c, r + 1)) !== refIdx ? `inset 0 -2px var(--ref-${refIdx + 1})` : "",
                      ].filter(Boolean).join(", ") || "none" : `inset 0 0 0 2px var(--ref-${refIdx + 1})` } : undefined}
                      className={cn(
                        "relative cursor-cell truncate border-b border-r border-grid-line transition-colors duration-150 select-none",
!isEditable && "bg-muted/20 text-muted-foreground",
                        compact ? "h-10 px-2 text-[14px]" : "h-[calc(var(--row-height,32px)*var(--sheet-scale,1))] px-2 text-[calc(var(--font-size-grid,13px)*var(--sheet-scale,1))] max-w-40",
                        r === 0 && "font-sans font-medium text-foreground",
                        typeof v === "number" && "text-right tabular-nums",
                        isError(v) && "text-destructive",
                        isHL && !isSel && "bg-accent/50",
                        inDrag && "bg-accent/70",
                        inSelection && !isSel && "bg-primary/10",
                        inSelection && c === bounds.left && "border-l-2 border-l-primary",
                        inSelection && c === bounds.right && "border-r-2 border-r-primary",
                        inSelection && r === bounds.top && "border-t-2 border-t-primary",
                        inSelection && r === bounds.bottom && "border-b-2 border-b-primary",
                        format?.bold && "font-bold", format?.italic && "italic", format?.underline && "underline", format?.strike && "line-through",
                        isSel && "relative outline outline-2 -outline-offset-2 outline-primary",
                        fl?.kind === "correct" && "animate-correct",
                        fl?.kind === "wrong" && "animate-shake bg-error-soft",
                      )}
                    >
                      {isSel && editing ? (
                        <input
                          ref={cellInputRef}
                          aria-label={`Edit cell ${sel}`}
                          className="absolute inset-0 z-10 h-full bg-card px-2 font-mono text-[13px] outline-none"
                          disabled={!canEdit()}
                          style={{ minWidth: "100%", width: `max(100%, ${draft.length + 2}ch)` }}
                          value={liveDraft}
                          onFocus={(e) => { activeInputRef.current = e.currentTarget; }}
                          onChange={(e) => { setDraft(e.target.value); setRefPick(null); }}
                          onKeyDown={(e) => onEditorKey(e, true)}
                          spellCheck={false}
                          autoComplete="off"
                        />
                      ) : ghostHere ? (
                        <span className={cn(ghost?.text.startsWith("=") ? "font-mono text-[13px]" : "tabular-nums font-medium text-primary")}>{ghost?.text}{ghost?.text.startsWith("=") && <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground" />}</span>
                      ) : (
                        format?.number === "currency" && typeof v === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v) : format?.number === "percent" && typeof v === "number" ? `${(v * 100).toFixed(0)}%` : format?.number === "number" && typeof v === "number" ? v.toFixed(2) : format?.number === "date" && typeof v === "number" ? new Date(Date.UTC(1899, 11, 30) + v * 86400000).toLocaleDateString() : formatValue(v)
                      )}
                      {isSel && !editing && (
                        <span aria-hidden className="pointer-events-none absolute -bottom-[3px] -right-[3px] z-10 size-1.5 bg-primary ring-1 ring-card" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {variant === "practice" && <div className="flex min-h-7 items-center justify-between border-t bg-cell-header px-3 py-1 font-mono text-xs text-muted-foreground"><span>{editing ? "Edit" : "Ready"} · {range}</span><span aria-live="polite" aria-label="Last keypress">{lastKey}</span></div>}
    </div>
  );
}
