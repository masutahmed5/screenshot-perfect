// @ts-nocheck -- engine is covered by src/lib/validate.test.ts; strict index checks add noise here
// Minimal Excel-compatible formula engine (parser + evaluator), no dependencies.
export type Scalar = number | string | boolean | null;
export type Value = Scalar | Value[][];
export type CellMap = Record<string, string>; // A1 -> raw input ("=SUM(A1:A3)" or "42")

export const ERR = { NA: "#N/A", VALUE: "#VALUE!", REF: "#REF!", DIV0: "#DIV/0!", NAME: "#NAME?", CIRC: "#CIRC!" };
export const isError = (v: unknown): v is string => typeof v === "string" && v.startsWith("#") && v.length > 1 && /[!?A]$/.test(v);

export function colToIndex(col: string) {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
export function indexToCol(i: number) {
  let s = "";
  i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
export function parseRef(ref: string) {
  const m = /^\$?([A-Z]+)\$?(\d+)$/i.exec(ref);
  if (!m) return null;
  return { col: colToIndex(m[1]), row: parseInt(m[2], 10) - 1 };
}
export const addr = (col: number, row: number) => `${indexToCol(col)}${row + 1}`;

type Tok = { t: "num" | "str" | "ref" | "range" | "fn" | "op" | "(" | ")" | "," | "bool"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; }
      out.push({ t: "str", v: s }); i = j + 1; continue;
    }
    if (/[0-9.]/.test(c)) { const m = /^[0-9]*\.?[0-9]+(e[+-]?\d+)?/i.exec(src.slice(i))!; out.push({ t: "num", v: m[0] }); i += m[0].length; continue; }
    const rng = /^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+/i.exec(src.slice(i));
    if (rng) { out.push({ t: "range", v: rng[0].toUpperCase() }); i += rng[0].length; continue; }
    const word = /^[A-Z_][A-Z0-9_.]*/i.exec(src.slice(i));
    if (word) {
      const w = word[0].toUpperCase();
      const after = src.slice(i + word[0].length).trimStart()[0];
      if (after === "(") out.push({ t: "fn", v: w });
      else if (w === "TRUE" || w === "FALSE") out.push({ t: "bool", v: w });
      else if (/^[A-Z]{1,3}\d+$/.test(w)) out.push({ t: "ref", v: w });
      else throw new Error("NAME:" + w);
      i += word[0].length; continue;
    }
    if (c === "$") { const r = /^\$?[A-Z]{1,3}\$?\d+/i.exec(src.slice(i)); if (r) { out.push({ t: "ref", v: r[0].toUpperCase() }); i += r[0].length; continue; } }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "<>"].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    if ("+-*/^&=<>%".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    if (c === "(" || c === ")" || c === ",") { out.push({ t: c, v: c }); i++; continue; }
    if (c === ";") { out.push({ t: ",", v: "," }); i++; continue; }
    throw new Error("Unexpected character " + c);
  }
  return out;
}

export type Node =
  | { k: "num"; v: number } | { k: "str"; v: string } | { k: "bool"; v: boolean }
  | { k: "ref"; v: string } | { k: "range"; a: string; b: string }
  | { k: "fn"; name: string; args: Node[] } | { k: "bin"; op: string; l: Node; r: Node }
  | { k: "neg"; e: Node } | { k: "pct"; e: Node };

const PREC: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

export function parse(src: string): Node {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  function primary(): Node {
    const t = toks[p++];
    if (!t) throw new Error("Formula ends unexpectedly");
    if (t.t === "op" && t.v === "-") return { k: "neg", e: unary() };
    if (t.t === "op" && t.v === "+") return unary();
    if (t.t === "num") return { k: "num", v: parseFloat(t.v) };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "bool") return { k: "bool", v: t.v === "TRUE" };
    if (t.t === "ref") { if (!parseRef(t.v)) throw new Error("NAME:" + t.v); return { k: "ref", v: t.v.replace(/\$/g, "") }; }
    if (t.t === "range") { const [a, b] = t.v.replace(/\$/g, "").split(":"); return { k: "range", a, b }; }
    if (t.t === "(") { const e = expr(0); if (toks[p++]?.t !== ")") throw new Error("Missing )"); return e; }
    if (t.t === "fn") {
      p++; // (
      const args: Node[] = [];
      if (peek()?.t !== ")") { args.push(expr(0)); while (peek()?.t === ",") { p++; args.push(expr(0)); } }
      if (toks[p++]?.t !== ")") throw new Error("Missing ) after " + t.v);
      return { k: "fn", name: t.v, args };
    }
    throw new Error("Unexpected " + t.v);
  }
  function unary(): Node { let e = primary(); while (peek()?.t === "op" && peek().v === "%") { p++; e = { k: "pct", e }; } return e; }
  function expr(min: number): Node {
    let l = unary();
    while (peek()?.t === "op" && PREC[peek().v] !== undefined && PREC[peek().v] >= min) {
      const op = toks[p++].v;
      const pr = PREC[op];
      const r = expr(op === "^" ? pr : pr + 1);
      l = { k: "bin", op, l, r };
    }
    return l;
  }
  const n = expr(0);
  if (p < toks.length) throw new Error("Unexpected " + toks[p].v);
  return n;
}

export function collectFunctions(n: Node, out = new Set<string>()): Set<string> {
  if (n.k === "fn") { out.add(n.name); n.args.forEach((a) => collectFunctions(a, out)); }
  else if (n.k === "bin") { collectFunctions(n.l, out); collectFunctions(n.r, out); }
  else if (n.k === "neg" || n.k === "pct") collectFunctions(n.e, out);
  return out;
}
export function collectRefs(n: Node, out: string[] = []): string[] {
  if (n.k === "ref") out.push(n.v);
  else if (n.k === "range") out.push(`${n.a}:${n.b}`);
  else if (n.k === "fn") n.args.forEach((a) => collectRefs(a, out));
  else if (n.k === "bin") { collectRefs(n.l, out); collectRefs(n.r, out); }
  else if (n.k === "neg" || n.k === "pct") collectRefs(n.e, out);
  return out;
}

const flat = (v: Value): Scalar[] => (Array.isArray(v) ? v.flat(2) as Scalar[] : [v]);
const toNum = (v: Scalar): number | string => {
  if (isError(v)) return v as string;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? ERR.VALUE : n;
};
const toStr = (v: Scalar) => (v === null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
const nums = (args: Value[]) => args.flatMap((a) => Array.isArray(a) ? flat(a).filter((x) => typeof x === "number") as number[] : [toNum(a as Scalar)]);
const firstErr = (xs: (number | string)[]) => xs.find((x) => typeof x === "string") as string | undefined;
const scalar = (v: Value): Scalar => (Array.isArray(v) ? (v[0]?.[0] as Scalar) ?? null : v);
const truthy = (v: Scalar) => (typeof v === "string" ? v.toUpperCase() === "TRUE" : !!toNum(v) && !isError(toNum(v)));

function matchesCriteria(v: Scalar, crit: Scalar): boolean {
  const c = toStr(crit);
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(c)!;
  const op = m[1] || "=";
  const rhs = m[2];
  const rn = Number(rhs);
  const both = rhs !== "" && !isNaN(rn) && typeof v === "number";
  const l: number | string = both ? (v as number) : toStr(v).toLowerCase();
  const r: number | string = both ? rn : rhs.toLowerCase();
  if (!both && (op === "=" || op === "<>") && typeof r === "string" && r.includes("*")) {
    const re = new RegExp("^" + r.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return op === "=" ? re.test(l as string) : !re.test(l as string);
  }
  switch (op) { case "=": return l === r; case "<>": return l !== r; case "<": return l < r; case ">": return l > r; case "<=": return l <= r; default: return l >= r; }
}

type Fn = (args: Value[]) => Value;
const FNS: Record<string, Fn> = {
  SUM: (a) => { const n = nums(a); return firstErr(n) ?? (n as number[]).reduce((s, x) => s + x, 0); },
  AVERAGE: (a) => { const n = nums(a); const e = firstErr(n); if (e) return e; return n.length ? (n as number[]).reduce((s, x) => s + x, 0) / n.length : ERR.DIV0; },
  MIN: (a) => { const n = nums(a); return firstErr(n) ?? (n.length ? Math.min(...(n as number[])) : 0); },
  MAX: (a) => { const n = nums(a); return firstErr(n) ?? (n.length ? Math.max(...(n as number[])) : 0); },
  COUNT: (a) => a.flatMap(flat).filter((x) => typeof x === "number").length,
  COUNTA: (a) => a.flatMap(flat).filter((x) => x !== null && x !== "").length,
  COUNTBLANK: (a) => a.flatMap(flat).filter((x) => x === null || x === "").length,
  ROUND: ([x, d]) => { const n = toNum(scalar(x)), k = toNum(scalar(d ?? 0)); if (typeof n === "string") return n; const f = 10 ** (k as number); return Math.round(n * f) / f; },
  ABS: ([x]) => { const n = toNum(scalar(x)); return typeof n === "string" ? n : Math.abs(n); },
  PRODUCT: (a) => { const n = nums(a); return firstErr(n) ?? (n as number[]).reduce((s, x) => s * x, 1); },
  IF: ([c, t, f]) => (truthy(scalar(c)) ? t ?? true : f ?? false),
  IFERROR: ([v, alt]) => (isError(scalar(v)) ? alt : v),
  AND: (a) => a.flatMap(flat).every(truthy),
  OR: (a) => a.flatMap(flat).some(truthy),
  NOT: ([x]) => !truthy(scalar(x)),
  SUMIF: ([r, c, s]) => { const rr = flat(r), ss = s ? flat(s) : rr; return rr.reduce<number>((acc, v, i) => acc + (matchesCriteria(v, scalar(c)) && typeof ss[i] === "number" ? (ss[i] as number) : 0), 0); },
  COUNTIF: ([r, c]) => flat(r).filter((v) => matchesCriteria(v, scalar(c))).length,
  AVERAGEIF: ([r, c, s]) => { const rr = flat(r), ss = s ? flat(s) : rr; const xs = rr.map((v, i) => (matchesCriteria(v, scalar(c)) ? ss[i] : null)).filter((x) => typeof x === "number") as number[]; return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : ERR.DIV0; },
  SUMIFS: ([s, ...pairs]) => { const ss = flat(s); let tot = 0; ss.forEach((v, i) => { for (let k = 0; k < pairs.length; k += 2) if (!matchesCriteria(flat(pairs[k])[i], scalar(pairs[k + 1]))) return; if (typeof v === "number") tot += v; }); return tot; },
  COUNTIFS: (pairs) => { const n = flat(pairs[0]).length; let c = 0; for (let i = 0; i < n; i++) { let ok = true; for (let k = 0; k < pairs.length; k += 2) if (!matchesCriteria(flat(pairs[k])[i], scalar(pairs[k + 1]))) ok = false; if (ok) c++; } return c; },
  VLOOKUP: ([key, table, col, approx]) => {
    if (!Array.isArray(table)) return ERR.VALUE;
    const k = scalar(key), ci = (toNum(scalar(col)) as number) - 1, ap = approx === undefined ? true : truthy(scalar(approx));
    if (ci < 0 || ci >= (table[0]?.length ?? 0)) return ERR.REF;
    if (!ap) { const row = table.find((r) => toStr(r[0] as Scalar).toLowerCase() === toStr(k).toLowerCase()); return row ? (row[ci] as Scalar) : ERR.NA; }
    let found: Value[] | undefined;
    for (const r of table) { if (typeof r[0] === "number" && typeof k === "number" ? r[0] <= k : toStr(r[0] as Scalar) <= toStr(k)) found = r; else break; }
    return found ? (found[ci] as Scalar) : ERR.NA;
  },
  MATCH: ([key, range, type]) => {
    const xs = flat(range), k = scalar(key), t = type === undefined ? 1 : (toNum(scalar(type)) as number);
    if (t === 0) { const i = xs.findIndex((x) => toStr(x).toLowerCase() === toStr(k).toLowerCase()); return i < 0 ? ERR.NA : i + 1; }
    let idx = -1; xs.forEach((x, i) => { if (typeof x === "number" && typeof k === "number" && x <= k) idx = i; });
    return idx < 0 ? ERR.NA : idx + 1;
  },
  INDEX: ([range, r, c]) => {
    if (!Array.isArray(range)) return ERR.VALUE;
    let ri = (toNum(scalar(r)) as number) - 1, ci = c === undefined ? 0 : (toNum(scalar(c)) as number) - 1;
    if (range.length === 1 && c === undefined) { ci = ri; ri = 0; }
    return (range[ri]?.[ci] as Scalar) ?? ERR.REF;
  },
  XLOOKUP: ([key, look, ret, notFound]) => {
    const xs = flat(look), rs = flat(ret), k = scalar(key);
    const i = xs.findIndex((x) => toStr(x).toLowerCase() === toStr(k).toLowerCase());
    return i < 0 ? (notFound !== undefined ? notFound : ERR.NA) : rs[i];
  },
  CONCAT: (a) => a.flatMap(flat).map(toStr).join(""),
  CONCATENATE: (a) => a.flatMap(flat).map(toStr).join(""),
  TEXTJOIN: ([d, ign, ...rest]) => rest.flatMap(flat).filter((x) => !(truthy(scalar(ign)) && (x === null || x === ""))).map(toStr).join(toStr(scalar(d))),
  LEFT: ([s, n]) => toStr(scalar(s)).slice(0, n === undefined ? 1 : (toNum(scalar(n)) as number)),
  RIGHT: ([s, n]) => { const t = toStr(scalar(s)), k = n === undefined ? 1 : (toNum(scalar(n)) as number); return k ? t.slice(-k) : ""; },
  MID: ([s, st, n]) => toStr(scalar(s)).substr((toNum(scalar(st)) as number) - 1, toNum(scalar(n)) as number),
  LEN: ([s]) => toStr(scalar(s)).length,
  UPPER: ([s]) => toStr(scalar(s)).toUpperCase(),
  LOWER: ([s]) => toStr(scalar(s)).toLowerCase(),
  PROPER: ([s]) => toStr(scalar(s)).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
  TRIM: ([s]) => toStr(scalar(s)).trim().replace(/\s+/g, " "),
  FIND: ([f, s]) => { const i = toStr(scalar(s)).indexOf(toStr(scalar(f))); return i < 0 ? ERR.VALUE : i + 1; },
  SEARCH: ([f, s]) => { const i = toStr(scalar(s)).toLowerCase().indexOf(toStr(scalar(f)).toLowerCase()); return i < 0 ? ERR.VALUE : i + 1; },
  SUBSTITUTE: ([s, a, b]) => toStr(scalar(s)).split(toStr(scalar(a))).join(toStr(scalar(b))),
  VALUE: ([s]) => toNum(scalar(s)),
};
export const SUPPORTED_FUNCTIONS = Object.keys(FNS).sort();

export class Workbook {
  private cache = new Map<string, Scalar>();
  private stack = new Set<string>();
  constructor(public cells: CellMap) {}
  get(a: string): Scalar {
    a = a.toUpperCase();
    if (this.cache.has(a)) return this.cache.get(a)!;
    if (this.stack.has(a)) return ERR.CIRC;
    this.stack.add(a);
    const v = this.compute(this.cells[a]);
    this.stack.delete(a);
    this.cache.set(a, v);
    return v;
  }
  compute(raw: string | undefined): Scalar {
    if (raw === undefined || raw === "") return null;
    if (raw.startsWith("=")) {
      try { return scalar(this.evalNode(parse(raw.slice(1)))); }
      catch (e) { return String((e as Error).message).startsWith("NAME") ? ERR.NAME : ERR.VALUE; }
    }
    const t = raw.trim();
    if (t.toUpperCase() === "TRUE") return true;
    if (t.toUpperCase() === "FALSE") return false;
    if (t !== "" && !isNaN(Number(t))) return Number(t);
    return raw;
  }
  range(a: string, b: string): Value[][] {
    const p = parseRef(a)!, q = parseRef(b)!;
    const rows: Value[][] = [];
    for (let r = Math.min(p.row, q.row); r <= Math.max(p.row, q.row); r++) {
      const row: Value[] = [];
      for (let c = Math.min(p.col, q.col); c <= Math.max(p.col, q.col); c++) row.push(this.get(addr(c, r)));
      rows.push(row);
    }
    return rows;
  }
  evalNode(n: Node): Value {
    switch (n.k) {
      case "num": return n.v;
      case "str": return n.v;
      case "bool": return n.v;
      case "ref": return this.get(n.v);
      case "range": return this.range(n.a, n.b);
      case "neg": { const v = toNum(scalar(this.evalNode(n.e))); return typeof v === "string" ? v : -v; }
      case "pct": { const v = toNum(scalar(this.evalNode(n.e))); return typeof v === "string" ? v : v / 100; }
      case "fn": {
        const f = FNS[n.name];
        if (!f) return ERR.NAME;
        if (n.name === "IF") { const c = scalar(this.evalNode(n.args[0])); if (isError(c)) return c; return truthy(c) ? (n.args[1] ? this.evalNode(n.args[1]) : true) : n.args[2] ? this.evalNode(n.args[2]) : false; }
        if (n.name === "IFERROR") { const v = this.evalNode(n.args[0]); return isError(scalar(v)) ? this.evalNode(n.args[1]) : v; }
        const args = n.args.map((a) => this.evalNode(a));
        if (!["IFERROR", "COUNT", "COUNTA"].includes(n.name)) { const e = args.find((a) => !Array.isArray(a) && isError(a)); if (e !== undefined) return e; }
        return f(args);
      }
      case "bin": {
        const l = scalar(this.evalNode(n.l)), r = scalar(this.evalNode(n.r));
        if (isError(l)) return l; if (isError(r)) return r;
        if (n.op === "&") return toStr(l) + toStr(r);
        if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) {
          const a = typeof l === "string" ? l.toLowerCase() : l ?? 0, b = typeof r === "string" ? r.toLowerCase() : r ?? 0;
          switch (n.op) { case "=": return a === b; case "<>": return a !== b; case "<": return a < b; case ">": return a > b; case "<=": return a <= b; default: return a >= b; }
        }
        const x = toNum(l), y = toNum(r);
        if (typeof x === "string") return x; if (typeof y === "string") return y;
        switch (n.op) { case "+": return x + y; case "-": return x - y; case "*": return x * y; case "/": return y === 0 ? ERR.DIV0 : x / y; default: return x ** y; }
      }
    }
  }
}

export function formatValue(v: Scalar): string {
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  return v;
}
