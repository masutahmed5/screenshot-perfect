import { useMemo, useRef, useState, useEffect } from "react";
import { addr, formatValue, indexToCol, isError, SUPPORTED_FUNCTIONS, Workbook, type CellMap } from "@/lib/formula";
import { cn } from "@/lib/utils";

type Props = {
  cells: CellMap;
  onChange: (cells: CellMap) => void;
  cols: number;
  rows: number;
  initialSelected?: string;
  highlight?: string[];
  flash?: { cell: string; kind: "correct" | "wrong"; key: number } | null;
  onEnterCheck?: () => void;
  compact?: boolean;
  ghost?: { cell: string; text: string; refs?: string[] } | null;
};

type Pos = { c: number; r: number };

const REF_COLORS = 5;

function parseCell(a: string): Pos {
  const m = /^([A-Z]+)(\d+)$/.exec(a) ?? ["", "A", "1"];
  let c = 0;
  for (const ch of m[1]!) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c: c - 1, r: parseInt(m[2]!) - 1 };
}

function rangeRef(a: Pos, b: Pos): string {
  const c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
  const r1 = Math.min(a.r, b.r), r2 = Math.max(a.r, b.r);
  return c1 === c2 && r1 === r2 ? addr(c1, r1) : `${addr(c1, r1)}:${addr(c2, r2)}`;
}

// Matches A1-style refs and ranges, but not function names like LOG10( or SUM(
const REF_RE = /\$?[A-Za-z]{1,2}\$?\d{1,4}(?::\$?[A-Za-z]{1,2}\$?\d{1,4})?(?!\s*\()/g;

export function Sheet({ cells, onChange, cols, rows, initialSelected = "A1", highlight = [], flash, onEnterCheck, compact, ghost }: Props) {
  const [sel, setSel] = useState(initialSelected);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [refDrag, setRefDrag] = useState<{ start: Pos; cur: Pos } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const barInputRef = useRef<HTMLInputElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const wb = useMemo(() => new Workbook(cells), [cells]);

  useEffect(() => setSel(initialSelected), [initialSelected]);

  const selPos = parseCell(sel);
  const selCol = selPos.c;
  const selRow = selPos.r;

  const formulaMode = editing && draft.startsWith("=");

  const commit = (val: string, dc = 0, dr = 1) => {
    onChange({ ...cells, [sel]: val });
    setEditing(false);
    if (dc || dr) setSel(addr(Math.max(0, Math.min(cols - 1, selCol + dc)), Math.max(0, Math.min(rows - 1, selRow + dr))));
    gridRef.current?.focus();
  };

  const startEdit = (initial?: string) => {
    const v = initial ?? cells[sel] ?? "";
    setDraft(v);
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
    const next = draft.slice(0, pos) + ref + draft.slice(pos);
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
    for (const m of draft.matchAll(REF_RE)) {
      const key = m[0].replace(/\$/g, "").toUpperCase();
      if (!seen.has(key)) seen.set(key, seen.size % REF_COLORS);
      const idx = seen.get(key)!;
      const [a, b] = key.split(":").map(parseCell);
      const p1 = a!, p2 = b ?? a!;
      const c1 = Math.max(0, Math.min(p1.c, p2.c)), c2 = Math.min(cols - 1, Math.max(p1.c, p2.c));
      const r1 = Math.max(0, Math.min(p1.r, p2.r)), r2 = Math.min(rows - 1, Math.max(p1.r, p2.r));
      if (c1 > c2 || r1 > r2) continue;
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) map.set(addr(c, r), idx);
    }
    return map;
  }, [formulaMode, draft, cols, rows]);

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
    const mv = (dc: number, dr: number) => {
      e.preventDefault();
      setSel(addr(Math.max(0, Math.min(cols - 1, selCol + dc)), Math.max(0, Math.min(rows - 1, selRow + dr))));
    };
    if (e.key === "ArrowUp") mv(0, -1);
    else if (e.key === "ArrowDown") mv(0, 1);
    else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) mv(-1, 0);
    else if (e.key === "ArrowRight" || e.key === "Tab") mv(1, 0);
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onEnterCheck?.(); }
    else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(); }
    else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); onChange({ ...cells, [sel]: "" }); }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) { e.preventDefault(); startEdit(e.key); }
  };

  const onEditorKey = (e: React.KeyboardEvent<HTMLInputElement>, moveOnEnter: boolean) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft, 0, moveOnEnter ? 1 : 0);
      if (e.metaKey || e.ctrlKey) setTimeout(() => onEnterCheck?.(), 0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      setRefDrag(null);
      gridRef.current?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions[0] && fnMatch) setDraft(draft.slice(0, -fnMatch[1]!.length) + suggestions[0] + "(");
      else commit(draft, 1, 0);
    }
  };

  const fnMatch = editing ? /([A-Z]{2,})$/i.exec(draft.startsWith("=") ? draft : "") : null;
  const suggestions = fnMatch ? SUPPORTED_FUNCTIONS.filter((f) => f.startsWith(fnMatch[1].toUpperCase())).slice(0, 5) : [];

  const raw = editing ? draft : cells[sel] ?? "";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b bg-cell-header px-3 py-1.5">
        <span className="w-10 rounded-md border bg-card px-1.5 py-0.5 text-center font-mono text-[11px] text-muted-foreground">{sel}</span>
        <span className="font-serif text-base italic text-muted-foreground">fx</span>
        <div className="relative flex-1">
          <input
            ref={barInputRef}
            aria-label={`Formula bar for cell ${sel}`}
            className="w-full rounded-md border bg-card px-2 py-0.5 font-mono text-[13px] outline-none focus:border-primary"
            value={raw}
            onFocus={(e) => { activeInputRef.current = e.currentTarget; if (!editing) { setDraft(cells[sel] ?? ""); setEditing(true); } }}
            onChange={(e) => { setDraft(e.target.value); setEditing(true); }}
            onKeyDown={(e) => onEditorKey(e, false)}
            spellCheck={false}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border bg-popover shadow-lift">
              {suggestions.map((f, i) => (
                <button key={f} type="button" onMouseDown={(e) => { e.preventDefault(); setDraft(draft.slice(0, -fnMatch![1]!.length) + f + "("); activeInputRef.current?.focus(); }}
                  className={cn("flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-xs hover:bg-accent", i === 0 && "bg-accent/60")}>
                  {f}<span className="text-[10px] text-muted-foreground">{i === 0 ? "Tab" : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} role="grid" aria-label="Spreadsheet" className={cn("flex-1 outline-none", compact ? "overflow-hidden" : "overflow-auto")}>
        <table className={cn("border-collapse font-sans text-[var(--font-size-grid,13px)]", compact ? "w-full table-fixed" : "")}>
          <thead>
            <tr>
              <th className={cn("sticky left-0 top-0 z-20 border-b border-r bg-cell-header select-none", compact ? "w-9" : "w-9")} />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className={cn(
                    "sticky top-0 border-b border-r border-grid-line bg-cell-header px-1 py-1 text-center text-[var(--font-size-header,11px)] font-medium text-muted-foreground select-none transition-colors",
                    compact ? "min-w-0" : "min-w-24",
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
                <th className={cn("sticky left-0 border-b border-r border-grid-line bg-cell-header px-2 text-[11px] font-medium text-muted-foreground", r === selRow && "bg-primary/15 text-primary font-semibold border-r-2 border-r-primary")}>{r + 1}</th>
                {Array.from({ length: cols }, (_, c) => {
                  const a = addr(c, r);
                  const v = wb.get(a);
                  const isSel = a === sel;
                  const isHL = highlight.includes(a);
                  const fl = flash && flash.cell === a ? flash : null;
                  const ghostRef = ghost?.refs?.findIndex((g) => {
                    if (!g) return false;
                    if (!g.includes(":")) return g === a;
                    const [p, q] = g.split(":").map(parseCell);
                    return c >= Math.min(p!.c, q!.c) && c <= Math.max(p!.c, q!.c) && r >= Math.min(p!.r, q!.r) && r <= Math.max(p!.r, q!.r);
                  }) ?? -1;
                  const refIdx = refColorOf.get(a) ?? (ghostRef >= 0 ? ghostRef : undefined);
                  const ghostHere = !editing && ghost?.cell === a;
                  const inDrag = dragCells.has(a);
                  return (
                    <td key={fl ? `${a}-${fl.key}` : a} role="gridcell" aria-selected={isSel} aria-label={a}
                      onMouseDown={(e) => {
                        if (formulaMode) {
                          e.preventDefault();
                          setRefDrag({ start: { c, r }, cur: { c, r } });
                          return;
                        }
                        if (editing) commit(draft, 0, 0);
                        setSel(a);
                      }}
                      onMouseEnter={() => { if (refDrag) setRefDrag({ ...refDrag, cur: { c, r } }); }}
                      onDoubleClick={() => startEdit()}
                      style={refIdx !== undefined ? { boxShadow: `inset 0 0 0 2px var(--ref-${refIdx + 1})` } : undefined}
                      className={cn(
                        "relative cursor-cell truncate border-b border-r border-grid-line transition-colors duration-150 select-none",
                        compact ? "h-10 px-2 text-[14px]" : "h-[var(--row-height,32px)] px-2 text-[var(--font-size-grid,13px)] max-w-40",
                        r === 0 && "font-sans font-medium text-foreground",
                        typeof v === "number" && "text-right tabular-nums",
                        isError(v) && "text-destructive",
                        isHL && !isSel && "bg-accent/50",
                        inDrag && "bg-accent/70",
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
                          style={{ minWidth: "100%", width: `max(100%, ${draft.length + 2}ch)` }}
                          value={draft}
                          onFocus={(e) => { activeInputRef.current = e.currentTarget; }}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => onEditorKey(e, true)}
                          spellCheck={false}
                          autoComplete="off"
                        />
                      ) : ghostHere ? (
                        <span className={cn(ghost!.text.startsWith("=") ? "font-mono text-[13px]" : "tabular-nums font-medium text-primary")}>{ghost!.text}{ghost!.text.startsWith("=") && <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground" />}</span>
                      ) : (
                        formatValue(v)
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
    </div>
  );
}
