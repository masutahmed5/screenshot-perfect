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

export function Sheet({ cells, onChange, cols, rows, initialSelected = "A1", highlight = [], flash, onEnterCheck, compact }: Props) {
  const [sel, setSel] = useState(initialSelected);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wb = useMemo(() => new Workbook(cells), [cells]);

  useEffect(() => setSel(initialSelected), [initialSelected]);

  const m = /^([A-Z]+)(\d+)$/.exec(sel)!;
  const selCol = m[1].charCodeAt(0) - 65;
  const selRow = parseInt(m[2]) - 1;

  const commit = (val: string, move = 1) => {
    onChange({ ...cells, [sel]: val });
    setEditing(false);
    if (move) setSel(addr(selCol, Math.min(rows - 1, selRow + move)));
    gridRef.current?.focus();
  };

  const startEdit = (initial?: string) => {
    setDraft(initial ?? cells[sel] ?? "");
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

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

  const fnMatch = editing ? /([A-Z]{2,})$/i.exec(draft.startsWith("=") ? draft : "") : null;
  const suggestions = fnMatch ? SUPPORTED_FUNCTIONS.filter((f) => f.startsWith(fnMatch[1].toUpperCase())).slice(0, 5) : [];

  const raw = editing ? draft : cells[sel] ?? "";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b bg-cell-header px-3 py-2">
        <span className="w-12 rounded-md border bg-card px-2 py-1 text-center font-mono text-xs text-muted-foreground">{sel}</span>
        <span className="font-serif text-lg italic text-muted-foreground">fx</span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            aria-label={`Formula bar for cell ${sel}`}
            className="w-full rounded-md border bg-card px-2 py-1 font-mono text-sm outline-none focus:border-primary"
            value={raw}
            onFocus={() => { if (!editing) { setDraft(cells[sel] ?? ""); setEditing(true); } }}
            onChange={(e) => { setDraft(e.target.value); setEditing(true); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(draft, 0); if (e.metaKey || e.ctrlKey) setTimeout(() => onEnterCheck?.(), 0); }
              else if (e.key === "Escape") { setEditing(false); gridRef.current?.focus(); }
              else if (e.key === "Tab" && suggestions[0]) { e.preventDefault(); setDraft(draft.slice(0, -fnMatch![1].length) + suggestions[0] + "("); }
            }}
            spellCheck={false}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border bg-popover shadow-lift">
              {suggestions.map((f, i) => (
                <button key={f} type="button" onMouseDown={(e) => { e.preventDefault(); setDraft(draft.slice(0, -fnMatch![1].length) + f + "("); inputRef.current?.focus(); }}
                  className={cn("flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-xs hover:bg-accent", i === 0 && "bg-accent/60")}>
                  {f}<span className="text-[10px] text-muted-foreground">{i === 0 ? "Tab" : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} role="grid" aria-label="Spreadsheet" className="flex-1 overflow-auto outline-none">
        <table className="border-collapse font-mono text-[13px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-10 w-10 border-b border-r bg-cell-header" />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className={cn("sticky top-0 border-b border-r border-grid-line bg-cell-header px-2 py-1 text-[11px] font-medium text-muted-foreground", compact ? "min-w-20" : "min-w-28", c === selCol && "bg-accent text-accent-foreground")}>{indexToCol(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <th className={cn("sticky left-0 border-b border-r border-grid-line bg-cell-header px-2 text-[11px] font-medium text-muted-foreground", r === selRow && "bg-accent text-accent-foreground")}>{r + 1}</th>
                {Array.from({ length: cols }, (_, c) => {
                  const a = addr(c, r);
                  const v = wb.get(a);
                  const isSel = a === sel;
                  const isHL = highlight.includes(a);
                  const fl = flash && flash.cell === a ? flash : null;
                  return (
                    <td key={fl ? `${a}-${fl.key}` : a} role="gridcell" aria-selected={isSel}
                      onMouseDown={() => { if (editing) commit(draft, 0); setSel(a); }}
                      onDoubleClick={() => startEdit()}
                      className={cn(
                        "h-8 cursor-cell truncate border-b border-r border-grid-line px-2 transition-colors duration-150",
                        compact ? "max-w-24" : "max-w-40",
                        r === 0 && "font-sans font-medium text-foreground",
                        typeof v === "number" && "text-right tabular-nums",
                        isError(v) && "text-destructive",
                        isHL && !isSel && "bg-accent/50",
                        isSel && "relative outline outline-2 -outline-offset-2 outline-primary",
                        fl?.kind === "correct" && "animate-correct",
                        fl?.kind === "wrong" && "animate-shake bg-error-soft",
                      )}
                    >
                      {formatValue(v)}
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
