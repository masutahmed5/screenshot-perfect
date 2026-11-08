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

export function Sheet({ cells, onChange, cols, rows, initialSelected = "A1", highlight = [], flash, onEnterCheck, compact }: Props) {
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
    requestAnimationFrame(() => {
      gridRef.current?.focus();
    });
  };

  const startEdit = (initial?: string) => {
    const v = initial ?? cells[sel] ?? "";
    setDraft(v);
    setEditing(true);
    requestAnimationFrame(() => {
      const el = cellInputRef.current;
      if (el) {
        activeInputRef.current = el;
        el.focus();
        el.setSelectionRange(v.length, v.length);
      }
    });
  };

  const insertRef = (ref: string) => {
    const input = activeInputRef.current ?? cellInputRef.current ?? barInputRef.current;
    let pos = input?.selectionStart ?? draft.length;
    // When blurred or starting out, selectionStart might be 0. Avoid inserting before '='
    if (pos === 0 && draft.length > 0) {
      pos = draft.length;
    }
    const before = draft.slice(0, pos);
    const after = draft.slice(pos);

    // In Excel:
    // If preceding text ends with an operator/paren, append the ref.
    // If preceding text ends with an existing cell ref/range (user clicked another cell without typing an operator), replace it!
    const isAfterOperator = /[=+\-*/^&,(:]\s*$/.test(before);
    const trailingRefMatch = /([$]?[A-Za-z]+[$]?\d+(?::[$]?[A-Za-z]+[$]?\d+)?)\s*$/i.exec(before);

    let next: string;
    let newPos: number;
    if (!isAfterOperator && trailingRefMatch) {
      const prefix = before.slice(0, before.length - trailingRefMatch[0].length);
      next = prefix + ref + after;
      newPos = prefix.length + ref.length;
    } else {
      next = before + ref + after;
      newPos = pos + ref.length;
    }

    setDraft(next);
    requestAnimationFrame(() => {
      const target = activeInputRef.current ?? cellInputRef.current ?? barInputRef.current;
      if (target) {
        target.focus();
        target.setSelectionRange(newPos, newPos);
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
      <div className="flex items-center gap-2 border-b bg-cell-header px-3 py-2">
        <span className="min-w-14 rounded-md border bg-card px-2.5 py-1 text-center font-mono text-[var(--font-size-formula-bar,16px)] font-semibold text-foreground">
          {sel}
        </span>
        <span className="font-serif text-lg italic text-muted-foreground select-none">fx</span>
        <div className="relative flex-1">
          <input
            ref={barInputRef}
            aria-label={`Formula bar for cell ${sel}`}
            className="w-full rounded-md border bg-card px-3 py-1.5 font-mono text-[var(--font-size-formula-bar,16px)] outline-none focus:border-primary"
            value={raw}
            onFocus={(e) => { activeInputRef.current = e.currentTarget; if (!editing) { setDraft(cells[sel] ?? ""); setEditing(true); } }}
            onChange={(e) => { setDraft(e.target.value); setEditing(true); }}
            onKeyDown={(e) => onEditorKey(e, false)}
            spellCheck={false}
            autoComplete="off"
          />
          {suggestions.length > 0 && activeInputRef.current === barInputRef.current && (
            <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border bg-popover shadow-lift">
              {suggestions.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDraft(draft.slice(0, -fnMatch![1]!.length) + f + "(");
                    barInputRef.current?.focus();
                  }}
                  className={cn("flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-xs hover:bg-accent", i === 0 && "bg-accent/60")}
                >
                  {f}<span className="text-[10px] text-muted-foreground">{i === 0 ? "Tab" : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} role="grid" aria-label="Spreadsheet" className={cn("flex-1 outline-none", compact ? "overflow-hidden" : "overflow-auto")}>
        <table className={cn("border-collapse font-mono text-[var(--font-size-grid,16px)]", compact ? "w-full table-fixed" : "")}>
          <thead>
            <tr>
              <th className={cn("sticky left-0 top-0 z-20 border-b border-r bg-cell-header select-none", compact ? "w-9" : "w-10")} />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className={cn(
                    "sticky top-0 border-b border-r border-grid-line bg-cell-header px-1.5 py-1.5 text-[var(--font-size-header,14px)] font-medium text-muted-foreground select-none transition-colors",
                    compact ? "min-w-0" : "min-w-28",
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
              <tr key={r} className={cn(compact ? "h-10" : "h-[var(--row-height,48px)]")}>
                <th
                  className={cn(
                    "sticky left-0 border-b border-r border-grid-line bg-cell-header text-[var(--font-size-header,14px)] font-medium text-muted-foreground select-none transition-colors",
                    compact ? "px-1 text-xs" : "px-2",
                    r === selRow && "bg-primary/15 text-primary font-semibold border-r-2 border-r-primary"
                  )}
                >
                  {r + 1}
                </th>
                {Array.from({ length: cols }, (_, c) => {
                  const a = addr(c, r);
                  const v = wb.get(a);
                  const isSel = a === sel;
                  const isHL = highlight.includes(a);
                  const fl = flash && flash.cell === a ? flash : null;
                  const refIdx = refColorOf.get(a);
                  const inDrag = dragCells.has(a);
                  return (
                    <td
                      key={fl ? `${a}-${fl.key}` : a}
                      role="gridcell"
                      aria-selected={isSel}
                      onMouseDown={(e) => {
                        if (formulaMode) {
                          e.preventDefault();
                          setRefDrag({ start: { c, r }, cur: { c, r } });
                          return;
                        }
                        if (editing) {
                          commit(draft, 0, 0);
                        }
                        if (a === sel && !editing) {
                          e.preventDefault();
                          startEdit();
                          return;
                        }
                        setSel(a);
                        requestAnimationFrame(() => {
                          gridRef.current?.focus();
                        });
                      }}
                      onMouseEnter={() => { if (refDrag) setRefDrag({ ...refDrag, cur: { c, r } }); }}
                      onDoubleClick={() => startEdit()}
                      style={
                        refIdx !== undefined
                          ? {
                              boxShadow: `inset 0 0 0 2px var(--ref-${refIdx + 1})`,
                              backgroundColor: `color-mix(in srgb, var(--ref-${refIdx + 1}) 10%, transparent)`,
                            }
                          : undefined
                      }
                      className={cn(
                        "relative cursor-cell truncate border-b border-r border-grid-line transition-colors duration-150 select-none",
                        compact ? "h-10 px-2 text-[14px]" : "h-[var(--row-height,48px)] px-3 text-[var(--font-size-grid,16px)] max-w-44",
                        r === 0 && "font-sans font-medium text-foreground",
                        typeof v === "number" && "text-right tabular-nums",
                        isError(v) && "text-destructive font-medium",
                        isHL && !isSel && "bg-accent/40",
                        inDrag && "outline outline-2 outline-dashed outline-primary bg-primary/10 z-10",
                        isSel && !editing && "outline outline-2 -outline-offset-1 outline-primary bg-primary/[0.04] z-10",
                        isSel && editing && "outline outline-2 -outline-offset-1 outline-primary z-20",
                        fl?.kind === "correct" && "animate-correct",
                        fl?.kind === "wrong" && "animate-shake bg-error-soft",
                      )}
                    >
                      {/* Excel-style fill handle square */}
                      {isSel && !editing && (
                        <span
                          className="absolute -bottom-1 -right-1 z-30 size-1.5 bg-primary border-[0.5px] border-background pointer-events-none"
                          aria-hidden
                        />
                      )}

                      {isSel && editing ? (
                        <div className="absolute inset-0 z-20">
                          <input
                            ref={cellInputRef}
                            aria-label={`Edit cell ${sel}`}
                            className="h-full w-full bg-card px-3 font-mono text-[var(--font-size-grid,16px)] text-foreground outline-none shadow-sm"
                            style={{ minWidth: "100%", width: `max(100%, ${draft.length + 3}ch)` }}
                            value={draft}
                            onFocus={(e) => { activeInputRef.current = e.currentTarget; }}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => onEditorKey(e, true)}
                            spellCheck={false}
                            autoComplete="off"
                          />
                          {suggestions.length > 0 && activeInputRef.current === cellInputRef.current && (
                            <div className="absolute left-0 top-full z-40 mt-0.5 w-48 overflow-hidden rounded-md border bg-popover shadow-lg">
                              {suggestions.map((f, i) => (
                                <button
                                  key={f}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setDraft(draft.slice(0, -fnMatch![1]!.length) + f + "(");
                                    cellInputRef.current?.focus();
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between px-2.5 py-1 text-left font-mono text-xs hover:bg-accent",
                                    i === 0 && "bg-accent/60 font-medium"
                                  )}
                                >
                                  <span>{f}</span>
                                  <span className="text-[10px] text-muted-foreground">{i === 0 ? "Tab" : ""}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        formatValue(v)
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
