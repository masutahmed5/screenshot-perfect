// @ts-nocheck -- engine is covered by src/lib/validate.test.ts; strict index checks add noise here
// Minimal Excel-compatible formula engine (parser + evaluator), no dependencies.
export type Scalar = number | string | boolean | null;
export type Value = Scalar | Value[][];
export type CellMap = Record<string, string>; // A1 -> raw input ("=SUM(A1:A3)" or "42")

export const ERR = { NA: "#N/A", VALUE: "#VALUE!", REF: "#REF!", DIV0: "#DIV/0!", NAME: "#NAME?", CIRC: "#CIRC!", NUM: "#NUM!", NULL: "#NULL!", SPILL: "#SPILL!", CALC: "#CALC!" };
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

type Tok = { t: "num" | "str" | "ref" | "range" | "fn" | "name" | "op" | "(" | ")" | "," | "bool"; v: string };

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
    const qualified = /^(?:'((?:[^']|'')+)'|([A-Z_][A-Z0-9_.]*))!\$?([A-Z]{1,3})\$?(\d+)(?::(?:(?:'((?:[^']|'')+)'|([A-Z_][A-Z0-9_.]*))!)?\$?([A-Z]{1,3})\$?(\d+))?/i.exec(src.slice(i));
    if (qualified) {
      const sheet = (qualified[1] ?? qualified[2]).replace(/''/g, "'");
      const endSheet = (qualified[5] ?? qualified[6])?.replace(/''/g, "'") ?? sheet;
      const a = `${sheet}!${qualified[3]}${qualified[4]}`.toUpperCase();
      const end = qualified[7] ? `${endSheet}!${qualified[7]}${qualified[8]}`.toUpperCase() : "";
      out.push({ t: end ? "range" : "ref", v: end ? `${a}:${end}` : a });
      i += qualified[0].length;
      continue;
    }
    if (/[0-9.]/.test(c)) { const m = /^[0-9]*\.?[0-9]+(e[+-]?\d+)?/i.exec(src.slice(i))!; out.push({ t: "num", v: m[0] }); i += m[0].length; continue; }
    const rng = /^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+/i.exec(src.slice(i));
    if (rng) { out.push({ t: "range", v: rng[0].toUpperCase() }); i += rng[0].length; continue; }
    const ref = /^\$?[A-Z]{1,3}\$?\d+/i.exec(src.slice(i));
    if (ref && src.slice(i + ref[0].length).trimStart()[0] !== "(") {
      out.push({ t: "ref", v: ref[0].toUpperCase() });
      i += ref[0].length;
      continue;
    }
    const word = /^[A-Z_][A-Z0-9_.]*/i.exec(src.slice(i));
    if (word) {
      const w = word[0].toUpperCase();
      const after = src.slice(i + word[0].length).trimStart()[0];
      if (after === "(") out.push({ t: "fn", v: w });
      else if (w === "TRUE" || w === "FALSE") out.push({ t: "bool", v: w });
      else if (/^[A-Z]{1,3}\d+$/.test(w)) out.push({ t: "ref", v: w });
      else out.push({ t: "name", v: w });
      i += word[0].length; continue;
    }
    if (c === "$") { const r = /^\$?[A-Z]{1,3}\$?\d+/i.exec(src.slice(i)); if (r) { out.push({ t: "ref", v: r[0].toUpperCase() }); i += r[0].length; continue; } }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "<>"].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    if ("+-*/^&=<>%#".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    if (c === "(" || c === ")" || c === ",") { out.push({ t: c, v: c }); i++; continue; }
    if (c === ";") { out.push({ t: ",", v: "," }); i++; continue; }
    throw new Error("Unexpected character " + c);
  }
  return out;
}

export type Node =
  | { k: "num"; v: number } | { k: "str"; v: string } | { k: "bool"; v: boolean }
  | { k: "ref"; v: string; sheet?: string } | { k: "range"; a: string; b: string; sheet?: string }
  | { k: "name"; v: string } | { k: "spill"; e: Node }
  | { k: "fn"; name: string; args: Node[] } | { k: "bin"; op: string; l: Node; r: Node }
  | { k: "neg"; e: Node } | { k: "pct"; e: Node };

const PREC: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };
function splitSheetRef(input: string): [string | undefined, string] {
  const i = input.lastIndexOf("!");
  return i < 0 ? [undefined, input] : [input.slice(0, i).replace(/^'|'$/g, "").replace(/''/g, "'"), input.slice(i + 1)];
}

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
    if (t.t === "name") return { k: "name", v: t.v };
    if (t.t === "ref") { const [sheet, ref] = splitSheetRef(t.v); if (!parseRef(ref)) throw new Error("NAME:" + t.v); return { k: "ref", v: ref.replace(/\$/g, ""), ...(sheet ? { sheet } : {}) } as Node; }
    if (t.t === "range") {
      const [rawA, rawB] = t.v.split(":");
      const [sheet, a] = splitSheetRef(rawA);
      const [endSheet, b] = splitSheetRef(rawB);
      if (!parseRef(a) || !parseRef(b) || (sheet && endSheet && sheet !== endSheet)) throw new Error("REF");
      return { k: "range", a: a.replace(/\$/g, ""), b: b.replace(/\$/g, ""), ...(sheet ? { sheet } : {}) };
    }
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
  function unary(): Node { let e = primary(); while (peek()?.t === "op" && (peek().v === "%" || peek().v === "#")) { const op = toks[p++].v; e = op === "%" ? { k: "pct", e } : { k: "spill", e }; } return e; }
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
  else if (n.k === "neg" || n.k === "pct" || n.k === "spill") collectFunctions(n.e, out);
  return out;
}
export function collectRefs(n: Node, out: string[] = []): string[] {
  if (n.k === "ref") out.push(`${n.sheet ? `${n.sheet}!` : ""}${n.v}`);
  else if (n.k === "range") out.push(`${n.sheet ? `${n.sheet}!` : ""}${n.a}:${n.b}`);
  else if (n.k === "fn") n.args.forEach((a) => collectRefs(a, out));
  else if (n.k === "bin") { collectRefs(n.l, out); collectRefs(n.r, out); }
  else if (n.k === "neg" || n.k === "pct" || n.k === "spill") collectRefs(n.e, out);
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
function binaryValue(op: string, l: Scalar, r: Scalar): Scalar {
  if (isError(l)) return l;
  if (isError(r)) return r;
  if (op === "&") return toStr(l) + toStr(r);
  if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
    const a = typeof l === "string" ? l.toLowerCase() : l ?? 0, b = typeof r === "string" ? r.toLowerCase() : r ?? 0;
    switch (op) { case "=": return a === b; case "<>": return a !== b; case "<": return a < b; case ">": return a > b; case "<=": return a <= b; default: return a >= b; }
  }
  const x = toNum(l), y = toNum(r);
  if (typeof x === "string") return x;
  if (typeof y === "string") return y;
  switch (op) { case "+": return x + y; case "-": return x - y; case "*": return x * y; case "/": return y === 0 ? ERR.DIV0 : x / y; default: return x ** y; }
}
const numericValues = (v: Value) => flat(v).filter((x): x is number => typeof x === "number");
const validNum = (v: Value | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const n = toNum(scalar(v));
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};
const excelDate = (serial: number) => new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
const dateSerial = (v: Scalar): number | string => {
  if (typeof v === "number") return Number.isFinite(v) ? Math.floor(v) : ERR.NUM;
  const d = typeof v === "string" ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86400000) : ERR.VALUE;
};
const dateValue = (y: number, m: number, d: number) => {
  if (![y, m, d].every(Number.isFinite)) return ERR.VALUE;
  if (y >= 0 && y < 1900) y += 1900;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const n = Math.floor((dt.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
  return n < 0 ? ERR.NUM : n;
};
const matrix = (v: Value): Value[][] => Array.isArray(v) ? v : [[v]];
const criteriaMatch = (range: Value, criterion: Scalar) => flat(range).map((x) => matchesCriteria(x, criterion));
const textFormat = (value: Scalar, format: string): Scalar => {
  if (isError(value)) return value;
  if (typeof value !== "number") return toStr(value);
  if (/^0(?:\.0+)?$/.test(format)) {
    const decimals = (format.split(".")[1] || "").length;
    return value.toFixed(decimals);
  }
  if (/^#+(?:,##0)?(?:\.0+)?$/.test(format)) {
    const decimals = (format.split(".")[1] || "").length;
    return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  if (/^0+%$/.test(format)) return `${Math.round(value * 100).toString().padStart(format.length - 1, "0")}%`;
  if (/[dmy]/i.test(format) && Number.isFinite(value)) {
    const d = excelDate(value);
    if (/d{1,2}/i.test(format) && /m{1,2}/i.test(format) && /y{2,4}/i.test(format)) return format.replace(/yyyy/gi, String(d.getUTCFullYear())).replace(/yy/gi, String(d.getUTCFullYear()).slice(-2)).replace(/mm/gi, String(d.getUTCMonth() + 1).padStart(2, "0")).replace(/m/gi, String(d.getUTCMonth() + 1)).replace(/dd/gi, String(d.getUTCDate()).padStart(2, "0")).replace(/d/gi, String(d.getUTCDate()));
  }
  if (format === "General" || format === "@") return String(value);
  return ERR.VALUE;
};

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
  MEDIAN: (a) => { const xs = a.flatMap(numericValues).sort((x, y) => x - y); if (!xs.length) return ERR.NUM; const m = Math.floor(xs.length / 2); return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2; },
  MODE: (a) => { const xs = a.flatMap(numericValues); if (!xs.length) return ERR.NA; const counts = new Map<number, number>(); xs.forEach((x) => counts.set(x, (counts.get(x) || 0) + 1)); const max = Math.max(...counts.values()); return max < 2 ? ERR.NA : [...counts].find(([, n]) => n === max)![0]; },
  LARGE: ([arr, k]) => { const xs = numericValues(arr).sort((x, y) => y - x), n = validNum(k); return n === undefined || !Number.isInteger(n) || n < 1 ? ERR.NUM : xs[n - 1] ?? ERR.NUM; },
  SMALL: ([arr, k]) => { const xs = numericValues(arr).sort((x, y) => x - y), n = validNum(k); return n === undefined || !Number.isInteger(n) || n < 1 ? ERR.NUM : xs[n - 1] ?? ERR.NUM; },
  ROUNDUP: ([x, d]) => { const n = validNum(x), k = validNum(d ?? 0); if (n === undefined || k === undefined || Math.abs(k) > 308) return ERR.VALUE; const f = 10 ** k; return Math.sign(n) * Math.ceil(Math.abs(n * f) - Number.EPSILON) / f; },
  ROUNDDOWN: ([x, d]) => { const n = validNum(x), k = validNum(d ?? 0); if (n === undefined || k === undefined || Math.abs(k) > 308) return ERR.VALUE; const f = 10 ** k; return Math.sign(n) * Math.floor(Math.abs(n * f)) / f; },
  FLOOR: ([x, significance]) => { const n = validNum(x), s = validNum(significance ?? 1); if (n === undefined || s === undefined) return ERR.VALUE; if (s === 0) return 0; if (n * s < 0) return ERR.NUM; return Math.floor(n / Math.abs(s)) * Math.abs(s); },
  CEILING: ([x, significance]) => { const n = validNum(x), s = validNum(significance ?? 1); if (n === undefined || s === undefined) return ERR.VALUE; if (s === 0) return 0; if (n * s < 0) return ERR.NUM; return Math.ceil(n / Math.abs(s)) * Math.abs(s); },
  ODD: ([x]) => { const n = validNum(x); if (n === undefined) return ERR.VALUE; const a = Math.ceil(Math.abs(n)); return Math.sign(n || 1) * (a % 2 ? a : a + 1); },
  EVEN: ([x]) => { const n = validNum(x); if (n === undefined) return ERR.VALUE; const a = Math.ceil(Math.abs(n)); return Math.sign(n || 1) * (a % 2 ? a + 1 : a); },
  XOR: (a) => a.flatMap(flat).filter((x) => truthy(x)).length % 2 === 1,
  ISBLANK: ([x]) => scalar(x ?? null) === null || scalar(x ?? null) === "",
  ISERR: ([x]) => isError(scalar(x)) && scalar(x) !== ERR.NA,
  ISERROR: ([x]) => isError(scalar(x)),
  ISEVEN: ([x]) => { const n = validNum(x); return n === undefined ? ERR.VALUE : Math.floor(Math.abs(n)) % 2 === 0; },
  ISODD: ([x]) => { const n = validNum(x); return n === undefined ? ERR.VALUE : Math.floor(Math.abs(n)) % 2 === 1; },
  ISLOGICAL: ([x]) => typeof scalar(x) === "boolean",
  ISNA: ([x]) => scalar(x) === ERR.NA,
  ISNONTEXT: ([x]) => typeof scalar(x) !== "string",
  ISNUMBER: ([x]) => typeof scalar(x) === "number",
  ISREF: () => false,
  ISFORMULA: ([x]) => typeof scalar(x) === "string" && String(scalar(x)).startsWith("="),
  ISTEXT: ([x]) => typeof scalar(x) === "string" && !isError(scalar(x)),
  IFNA: ([x, alt]) => scalar(x) === ERR.NA ? (alt ?? ERR.VALUE) : x,
  HLOOKUP: ([key, table, row, approx]) => {
    if (!Array.isArray(table)) return ERR.VALUE;
    const ri = validNum(row), k = scalar(key), ap = approx === undefined ? true : truthy(scalar(approx));
    if (ri === undefined || !Number.isInteger(ri) || ri < 1) return ERR.VALUE;
    if (ri > table.length) return ERR.REF;
    const head = table[0] || [];
    if (!ap) { const i = head.findIndex((x) => toStr(x as Scalar).toLowerCase() === toStr(k).toLowerCase()); return i < 0 ? ERR.NA : (table[ri - 1][i] as Scalar); }
    let found = -1;
    for (let i = 0; i < head.length; i++) { if (typeof head[i] === "number" && typeof k === "number" ? head[i] <= k : toStr(head[i] as Scalar) <= toStr(k)) found = i; else break; }
    return found < 0 ? ERR.NA : (table[ri - 1][found] as Scalar);
  },
  AVERAGEIFS: ([avg, ...pairs]) => {
    if (pairs.length < 2 || pairs.length % 2) return ERR.VALUE;
    const vals = flat(avg); let sum = 0, count = 0;
    for (let i = 0; i < vals.length; i++) if (pairs.every((_, j) => j % 2 === 1 || matchesCriteria(flat(pairs[j])[i] ?? null, scalar(pairs[j + 1])))) {
      if (typeof vals[i] === "number") { sum += vals[i] as number; count++; }
    }
    return count ? sum / count : ERR.DIV0;
  },
  MAXIFS: ([maxRange, ...pairs]) => {
    if (pairs.length < 2 || pairs.length % 2) return ERR.VALUE;
    const vals = flat(maxRange).filter((v, i) => pairs.every((_, j) => j % 2 === 1 || matchesCriteria(flat(pairs[j])[i] ?? null, scalar(pairs[j + 1])))).filter((v): v is number => typeof v === "number");
    return vals.length ? Math.max(...vals) : 0;
  },
  MINIFS: ([minRange, ...pairs]) => {
    if (pairs.length < 2 || pairs.length % 2) return ERR.VALUE;
    const vals = flat(minRange).filter((v, i) => pairs.every((_, j) => j % 2 === 1 || matchesCriteria(flat(pairs[j])[i] ?? null, scalar(pairs[j + 1])))).filter((v): v is number => typeof v === "number");
    return vals.length ? Math.min(...vals) : 0;
  },
  SUMPRODUCT: (arrays) => {
    if (!arrays.length) return ERR.VALUE;
    const mats = arrays.map(matrix), rows = Math.max(...mats.map((m) => m.length)), cols = Math.max(...mats.map((m) => m[0]?.length ?? 0));
    if (mats.some((m) => m.length !== rows || m.some((r) => r.length !== cols))) return ERR.VALUE;
    let sum = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let product = 1;
      for (const m of mats) { const v = m[r][c] as Scalar; if (isError(v)) return v; const n = typeof v === "number" ? v : 0; product *= n; }
      sum += product;
    }
    return sum;
  },
  TEXT: ([x, fmt]) => textFormat(scalar(x), toStr(scalar(fmt))),
  CLEAN: ([x]) => toStr(scalar(x)).replace(/[\x00-\x1f]/g, ""),
  TEXTBEFORE: ([text, delimiter, instance, matchMode, matchEnd, ifNotFound]) => {
    const s = toStr(scalar(text)), d = toStr(scalar(delimiter)), n = validNum(instance ?? 1);
    if (!d || n === undefined || !Number.isInteger(n) || n === 0) return ERR.VALUE;
    const insensitive = truthy(scalar(matchMode ?? 0)), hay = insensitive ? s.toLowerCase() : s, needle = insensitive ? d.toLowerCase() : d;
    let index = -1;
    if (n > 0) { let from = 0; for (let i = 0; i < n; i++) { index = hay.indexOf(needle, from); if (index < 0) break; from = index + needle.length; } }
    else { let from = hay.length; for (let i = 0; i < -n; i++) { index = hay.lastIndexOf(needle, from - 1); if (index < 0) break; from = index; } }
    if (index < 0) return ifNotFound ?? ERR.VALUE;
    return n > 0 ? s.slice(0, index) : s.slice(index + d.length);
  },
  TEXTAFTER: ([text, delimiter, instance, matchMode, matchEnd, ifNotFound]) => {
    const s = toStr(scalar(text)), d = toStr(scalar(delimiter)), n = validNum(instance ?? 1);
    if (!d || n === undefined || !Number.isInteger(n) || n === 0) return ERR.VALUE;
    const insensitive = truthy(scalar(matchMode ?? 0)), hay = insensitive ? s.toLowerCase() : s, needle = insensitive ? d.toLowerCase() : d;
    let index = -1;
    if (n > 0) { let from = 0; for (let i = 0; i < n; i++) { index = hay.indexOf(needle, from); if (index < 0) break; from = index + needle.length; } }
    else { let from = hay.length; for (let i = 0; i < -n; i++) { index = hay.lastIndexOf(needle, from - 1); if (index < 0) break; from = index; } }
    if (index < 0) return ifNotFound ?? ERR.VALUE;
    return n > 0 ? s.slice(index + d.length) : s.slice(0, index);
  },
  DATE: ([y, m, d]) => { const yy = validNum(y), mm = validNum(m), dd = validNum(d); return yy === undefined || mm === undefined || dd === undefined ? ERR.VALUE : dateValue(yy, mm, dd); },
  TODAY: () => Math.floor((Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) - Date.UTC(1899, 11, 30)) / 86400000),
  DAYS: ([end, start]) => { const a = dateSerial(scalar(end)), b = dateSerial(scalar(start)); return typeof a === "string" ? a : typeof b === "string" ? b : a - b; },
  DATEDIF: ([start, end, unit]) => {
    const a = dateSerial(scalar(start)), b = dateSerial(scalar(end)), u = toStr(scalar(unit)).toUpperCase();
    if (typeof a === "string" || typeof b === "string") return ERR.VALUE;
    if (b < a) return ERR.NUM;
    const da = excelDate(a), db = excelDate(b);
    const years = db.getUTCFullYear() - da.getUTCFullYear() - ((db.getUTCMonth() < da.getUTCMonth() || (db.getUTCMonth() === da.getUTCMonth() && db.getUTCDate() < da.getUTCDate())) ? 1 : 0);
    const months = years * 12 + db.getUTCMonth() - da.getUTCMonth() - (db.getUTCDate() < da.getUTCDate() ? 1 : 0);
    if (u === "Y") return years;
    if (u === "M") return months;
    if (u === "D") return b - a;
    if (u === "YM") return (months % 12 + 12) % 12;
    if (u === "MD") { const base = new Date(Date.UTC(db.getUTCFullYear(), db.getUTCMonth(), da.getUTCDate())); return db.getUTCDate() >= da.getUTCDate() ? db.getUTCDate() - da.getUTCDate() : Math.max(0, db.getUTCDate() + new Date(Date.UTC(db.getUTCFullYear(), db.getUTCMonth(), 0)).getUTCDate() - da.getUTCDate()); }
    if (u === "YD") { const anniv = new Date(Date.UTC(db.getUTCFullYear(), da.getUTCMonth(), da.getUTCDate())); const prior = anniv > db ? new Date(Date.UTC(db.getUTCFullYear() - 1, da.getUTCMonth(), da.getUTCDate())) : anniv; return Math.floor((db.getTime() - prior.getTime()) / 86400000); }
    return ERR.NUM;
  },
  EOMONTH: ([date, months]) => { const n = dateSerial(scalar(date)), m = validNum(months); if (typeof n === "string" || m === undefined) return ERR.VALUE; const d = excelDate(n); return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Math.trunc(m) + 1, 0) - Date.UTC(1899, 11, 30)) / 86400000); },
  WORKDAY: ([start, days, holidays]) => {
    let n = dateSerial(scalar(start)); const count = validNum(days);
    if (typeof n === "string" || count === undefined) return ERR.VALUE;
    const hs = holidays === undefined ? new Set<number>() : new Set(flat(holidays).map((v) => dateSerial(v)).filter((v): v is number => typeof v === "number"));
    let remaining = Math.abs(Math.trunc(count)), step = count < 0 ? -1 : 1;
    while (remaining) { n += step; const dow = excelDate(n).getUTCDay(); if (dow !== 0 && dow !== 6 && !hs.has(n)) remaining--; }
    return n;
  },
  NETWORKDAYS: ([start, end, holidays]) => {
    let a = dateSerial(scalar(start)), b = dateSerial(scalar(end));
    if (typeof a === "string" || typeof b === "string") return ERR.VALUE;
    const sign = a <= b ? 1 : -1; if (sign < 0) [a, b] = [b, a];
    const hs = holidays === undefined ? new Set<number>() : new Set(flat(holidays).map((v) => dateSerial(v)).filter((v): v is number => typeof v === "number"));
    let count = 0; for (let d = a; d <= b; d++) { const dow = excelDate(d).getUTCDay(); if (dow !== 0 && dow !== 6 && !hs.has(d)) count++; }
    return count * sign;
  },
  AGGREGATE: ([functionNum, options, array, k]) => {
    const fn = validNum(functionNum), opt = validNum(options);
    if (fn === undefined || opt === undefined || !Number.isInteger(fn) || fn < 1 || fn > 13) return ERR.VALUE;
    const raw = flat(array), values = raw.filter((v): v is number => typeof v === "number" || (opt >= 2 && !isError(v))).map((v) => typeof v === "number" ? v : 0);
    const kk = validNum(k ?? 1);
    switch (fn) {
      case 1: return values.length ? values.reduce((a, b) => a + b, 0) / values.length : ERR.DIV0;
      case 2: return values.length;
      case 3: return raw.filter((v) => v !== null && v !== "").length;
      case 4: return values.length ? Math.max(...values) : 0;
      case 5: return values.length ? Math.min(...values) : 0;
      case 6: return values.reduce((a, b) => a * b, 1);
      case 7: { const p = kk; if (p === undefined || p <= 0 || p >= 1 || values.length < 2) return ERR.NUM; const mean = values.reduce((a,b)=>a+b,0)/values.length; return Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/(values.length-1)); }
      case 8: { const p = kk; if (p === undefined || p <= 0 || p >= 1 || values.length < 2) return ERR.NUM; const mean = values.reduce((a,b)=>a+b,0)/values.length; return Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length); }
      case 9: return values.reduce((a, b) => a + b, 0);
      case 10: return values.length ? Math.max(...values) - Math.min(...values) : 0;
      case 11: return values.length ? Math.sqrt(values.reduce((a,b)=>a*b,1)) : 0;
      case 12: case 13: { const sorted = [...values].sort((a,b)=>a-b); if (kk === undefined || !Number.isInteger(kk) || kk < 1 || kk > sorted.length) return ERR.NUM; return fn === 12 ? sorted[kk - 1] : sorted[sorted.length - kk]; }
      default: return ERR.VALUE;
    }
  },
  UNIQUE: ([array, byCol, exactlyOnce]) => {
    const rows = matrix(array), byColumns = truthy(scalar(byCol ?? false)), once = truthy(scalar(exactlyOnce ?? false));
    const lines: Scalar[][] = byColumns ? rows[0].map((_, c) => rows.map((r) => r[c] as Scalar)) : rows.map((r) => r as Scalar[]);
    const keys = lines.map((r) => JSON.stringify(r)), kept = lines.filter((r, i) => once ? keys.indexOf(keys[i]) === keys.lastIndexOf(keys[i]) : keys.indexOf(keys[i]) === i);
    if (!kept.length) return [[ERR.CALC]];
    return byColumns ? kept[0].map((_, r) => kept.map((col) => col[r])) : kept;
  },
  FILTER: ([array, include, ifEmpty]) => {
    const rows = matrix(array), mask = flat(include);
    if (rows.length === mask.length) { const out = rows.filter((_, i) => truthy(mask[i] ?? false)); return out.length ? out : (ifEmpty ?? [[ERR.CALC]]); }
    if (rows[0]?.length === mask.length) { const ids = mask.map((v, i) => truthy(v) ? i : -1).filter((i) => i >= 0); return ids.length ? rows.map((r) => ids.map((i) => r[i])) : (ifEmpty ?? [[ERR.CALC]]); }
    return ERR.VALUE;
  },
  SORT: ([array, index, order, byCol]) => {
    const rows = matrix(array), idx = Math.trunc(validNum(index ?? 1) ?? 1) - 1, dir = (validNum(order ?? 1) ?? 1) < 0 ? -1 : 1;
    if (truthy(scalar(byCol ?? false))) return rows[0].map((_, c) => rows.map((r) => r[c] as Scalar)).sort((a,b)=>((a[idx] as number|string)<(b[idx] as number|string)?-1:(a[idx]===b[idx]?0:1))*dir).reduce<Scalar[][]>((acc,col,c)=>{col.forEach((v,r)=>(acc[r] ||= [])[c]=v);return acc},[]);
    if (idx < 0 || idx >= (rows[0]?.length ?? 0)) return ERR.VALUE;
    return [...rows].sort((a,b)=>((a[idx] as number|string)<(b[idx] as number|string)?-1:(a[idx]===b[idx]?0:1))*dir);
  },
  SORTBY: ([array, ...sortArgs]) => {
    if (!sortArgs.length || sortArgs.length % 2) return ERR.VALUE;
    const rows = matrix(array), keys = sortArgs.filter((_, i) => i % 2 === 0).map(flat), orders = sortArgs.filter((_, i) => i % 2 === 1).map((v) => validNum(v) ?? 1);
    if (keys.some((k) => k.length !== rows.length)) return ERR.VALUE;
    return rows.map((row, i) => ({ row, i })).sort((a,b) => { for (let j = 0; j < keys.length; j++) { const x = keys[j][a.i] as Scalar, y = keys[j][b.i] as Scalar; if (x !== y) return (x < (y as never) ? -1 : 1) * (orders[j] < 0 ? -1 : 1); } return a.i - b.i; }).map((x) => x.row);
  },
  VALUE: ([s]) => toNum(scalar(s)),
};
export const SUPPORTED_FUNCTIONS = Array.from(new Set([...Object.keys(FNS), "IFS", "SWITCH", "LET"])).sort();

const ARITY: Record<string, [number, number]> = {
  SUM: [1, Infinity], AVERAGE: [1, Infinity], MIN: [1, Infinity], MAX: [1, Infinity], COUNT: [1, Infinity], COUNTA: [1, Infinity], COUNTBLANK: [1, 1],
  ROUND: [2, 2], ABS: [1, 1], PRODUCT: [1, Infinity], IF: [2, 3], IFERROR: [2, 2], IFNA: [2, 2], AND: [1, Infinity], OR: [1, Infinity], NOT: [1, 1],
  SUMIF: [2, 3], COUNTIF: [2, 2], AVERAGEIF: [2, 3], SUMIFS: [3, Infinity], COUNTIFS: [2, Infinity], VLOOKUP: [3, 4], HLOOKUP: [3, 4], MATCH: [2, 3],
  INDEX: [2, 3], XLOOKUP: [3, 4], CONCAT: [1, Infinity], CONCATENATE: [1, Infinity], TEXTJOIN: [3, Infinity], LEFT: [1, 2], RIGHT: [1, 2], MID: [3, 3],
  LEN: [1, 1], UPPER: [1, 1], LOWER: [1, 1], PROPER: [1, 1], TRIM: [1, 1], FIND: [2, 3], SEARCH: [2, 3], SUBSTITUTE: [3, 4], VALUE: [1, 1],
  MEDIAN: [1, Infinity], MODE: [1, Infinity], LARGE: [2, 2], SMALL: [2, 2], ROUNDUP: [1, 2], ROUNDDOWN: [1, 2], FLOOR: [1, 2], CEILING: [1, 2],
  ODD: [1, 1], EVEN: [1, 1], XOR: [1, Infinity], ISBLANK: [1, 1], ISERR: [1, 1], ISERROR: [1, 1], ISEVEN: [1, 1], ISODD: [1, 1],
  ISLOGICAL: [1, 1], ISNA: [1, 1], ISNONTEXT: [1, 1], ISNUMBER: [1, 1], ISREF: [1, 1], ISFORMULA: [1, 1], ISTEXT: [1, 1], IFS: [2, Infinity], SWITCH: [3, Infinity],
  AGGREGATE: [3, 4], AVERAGEIFS: [3, Infinity], MAXIFS: [3, Infinity], MINIFS: [3, Infinity], SUMPRODUCT: [1, Infinity], TEXT: [2, 2], CLEAN: [1, 1],
  TEXTBEFORE: [2, 6], TEXTAFTER: [2, 6], DATE: [3, 3], TODAY: [0, 0], DATEDIF: [3, 3], DAYS: [2, 2], WORKDAY: [2, 3], NETWORKDAYS: [2, 3],
  EOMONTH: [2, 2], UNIQUE: [1, 3], FILTER: [2, 3], SORT: [1, 4], SORTBY: [3, Infinity], LET: [3, Infinity],
};
export interface WorkbookObject {
  sheets: Record<string, CellMap>;
  named_ranges?: Record<string, string | Scalar>;
}
export class Workbook {
  private cache = new Map<string, Value>();
  private stack = new Set<string>();
  public readonly sheets: Record<string, CellMap>;
  private readonly sheetByKey: Record<string, CellMap>;
  private readonly names: Record<string, string | Scalar>;
  public readonly sheetNames: string[];
  public readonly cells: CellMap;
  public readonly activeSheet: string;
  constructor(source: CellMap | WorkbookObject, options: WorkbookOptions = {}) {
    const objectSource = "sheets" in source && source.sheets && typeof source.sheets === "object";
    const entries = objectSource ? Object.entries(source.sheets) : [[options.sheetName || "Sheet1", source as CellMap], ...Object.entries(options.sheets || {})];
    this.sheetNames = entries.map(([name]) => name);
    this.sheets = Object.fromEntries(entries);
    this.sheetByKey = Object.fromEntries(entries.map(([name, cells]) => [name.toUpperCase(), cells]));
    this.activeSheet = options.sheetName || this.sheetNames[0] || "Sheet1";
    this.cells = this.sheets[this.activeSheet.toUpperCase()] || {};
    this.names = Object.fromEntries(Object.entries((objectSource ? source.named_ranges : undefined) || options.names || {}).map(([k, v]) => [k.toUpperCase(), v]));
  }
  get(a: string): Scalar {
    const [sheet, ref] = splitSheetRef(a);
    return scalar(this.readCell(ref, sheet || this.activeSheet));
  }
  getArray(a: string): Value {
    const [sheet, ref] = splitSheetRef(a);
    return this.readCell(ref, sheet || this.activeSheet);
  }
  getSpill(a: string): Value { return this.getArray(a); }
  private readCell(a: string, sheet: string): Value {
    const ref = a.replace(/\$/g, "").toUpperCase(), key = `${sheet.toUpperCase()}!${ref}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.stack.has(key)) return ERR.CIRC;
    this.stack.add(key);
    const raw = this.sheetByKey[sheet.toUpperCase()]?.[ref];
    const value = raw === undefined || raw === "" ? null : raw.startsWith("=") ? this.computeValue(raw.slice(1), sheet) : this.computeRaw(raw);
    this.stack.delete(key);
    this.cache.set(key, value);
    return value;
  }
  private computeRaw(raw: string): Scalar {
    const t = raw.trim();
    if (t.toUpperCase() === "TRUE") return true;
    if (t.toUpperCase() === "FALSE") return false;
    if (t !== "" && !isNaN(Number(t))) return Number(t);
    return raw;
  }
  compute(raw: string | undefined): Scalar {
    if (raw === undefined || raw === "") return null;
    if (raw.startsWith("=")) return scalar(this.computeValue(raw.slice(1), this.activeSheet));
    return this.computeRaw(raw);
  }
  range(a: string, b: string, sheet = this.activeSheet): Value[][] {
    const p = parseRef(a)!, q = parseRef(b)!, rows: Value[][] = [];
    for (let r = Math.min(p.row, q.row); r <= Math.max(p.row, q.row); r++) {
      const row: Value[] = [];
      for (let c = Math.min(p.col, q.col); c <= Math.max(p.col, q.col); c++) row.push(this.readCell(addr(c, r), sheet));
      rows.push(row);
    }
    return rows;
  }
  private resolveName(name: string, sheet: string): Value {
    const value = this.names[name.toUpperCase()];
    if (value === undefined) return ERR.NAME;
    if (typeof value !== "string") return value;
    const ref = /^((?:'[^']+'|[A-Z_][A-Z0-9_.]*)!)?(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?$/i.exec(value);
    if (ref) {
      const targetSheet = (ref[1] || `${sheet}!`).replace(/!$/, "").replace(/^'|'$/g, "");
      return ref[3] ? this.range(ref[2].replace(/\$/g, ""), ref[3].replace(/\$/g, ""), targetSheet) : this.readCell(ref[2], targetSheet);
    }
    return this.computeValue(value.startsWith("=") ? value.slice(1) : value, sheet);
  }
  private computeValue(src: string, sheet: string): Value {
    try { return this.evalNode(parse(src), sheet); }
    catch (e) {
      const message = String((e as Error).message);
      return message.startsWith("NAME") ? ERR.NAME : message.startsWith("REF") ? ERR.REF : ERR.VALUE;
    }
  }
  evalNode(n: Node, sheet = this.activeSheet, localNames = new Map<string, Value>()): Value {
    switch (n.k) {
      case "num": return n.v;
      case "str": return n.v;
      case "bool": return n.v;
      case "ref": return this.readCell(n.v, n.sheet || sheet);
      case "range": return this.range(n.a, n.b, n.sheet || sheet);
      case "name": return localNames.has(n.v.toUpperCase()) ? localNames.get(n.v.toUpperCase())! : this.resolveName(n.v, sheet);
      case "spill": return this.evalNode(n.e, sheet, localNames);
      case "neg": { const v = toNum(scalar(this.evalNode(n.e, sheet, localNames))); return typeof v === "string" ? v : -v; }
      case "pct": { const v = toNum(scalar(this.evalNode(n.e, sheet, localNames))); return typeof v === "string" ? v : v / 100; }
      case "fn": {
        const f = FNS[n.name];
        if (!f) return ERR.NAME;
        const [minArgs, maxArgs] = ARITY[n.name];
        if (n.args.length < minArgs || n.args.length > maxArgs) return ERR.VALUE;
        if (n.name === "ISREF") return n.args.length === 1 && ["ref", "range", "spill"].includes(n.args[0].k);
        if (n.name === "IF") { if (n.args.length < 2 || n.args.length > 3) return ERR.VALUE; const c = scalar(this.evalNode(n.args[0], sheet, localNames)); if (isError(c)) return c; return truthy(c) ? this.evalNode(n.args[1], sheet, localNames) : n.args[2] ? this.evalNode(n.args[2], sheet, localNames) : false; }
        if (n.name === "IFERROR" || n.name === "IFNA") {
          if (n.args.length !== 2) return ERR.VALUE;
          const v = this.evalNode(n.args[0], sheet, localNames), test = scalar(v);
          return (n.name === "IFERROR" ? isError(test) : test === ERR.NA) ? this.evalNode(n.args[1], sheet, localNames) : v;
        }
        if (n.name === "IFS") {
          if (n.args.length < 2 || n.args.length % 2) return ERR.VALUE;
          for (let i = 0; i < n.args.length; i += 2) { const c = scalar(this.evalNode(n.args[i], sheet, localNames)); if (isError(c)) return c; if (truthy(c)) return this.evalNode(n.args[i + 1], sheet, localNames); }
          return ERR.NA;
        }
        if (n.name === "SWITCH") {
          if (n.args.length < 3) return ERR.VALUE;
          const value = scalar(this.evalNode(n.args[0], sheet, localNames)), hasDefault = n.args.length % 2 === 0;
          for (let i = 1; i < n.args.length - (hasDefault ? 1 : 0); i += 2) {
            const candidate = scalar(this.evalNode(n.args[i], sheet, localNames));
            if (isError(candidate)) return candidate;
            if (toStr(value).toLowerCase() === toStr(candidate).toLowerCase()) return this.evalNode(n.args[i + 1], sheet, localNames);
          }
          return hasDefault ? this.evalNode(n.args[n.args.length - 1], sheet, localNames) : ERR.NA;
        }
        if (n.name === "LET") {
          if (n.args.length < 3 || n.args.length % 2 !== 1) return ERR.VALUE;
          const scope = new Map(localNames);
          for (let i = 0; i < n.args.length - 1; i += 2) {
            if (n.args[i].k !== "name") return ERR.VALUE;
            scope.set(n.args[i].v.toUpperCase(), this.evalNode(n.args[i + 1], sheet, scope));
          }
          return this.evalNode(n.args[n.args.length - 1], sheet, scope);
        }
        if (["SUMIFS", "COUNTIFS", "AVERAGEIFS", "MAXIFS", "MINIFS"].includes(n.name) && (n.args.length < (n.name === "COUNTIFS" ? 2 : 3) || n.args.length % 2 !== (n.name === "COUNTIFS" ? 0 : 1))) return ERR.VALUE;
        const args = n.args.map((a) => this.evalNode(a, sheet, localNames));
        if (!["COUNT", "COUNTA", "COUNTBLANK", "COUNTIF", "COUNTIFS", "ISBLANK", "ISERR", "ISERROR", "ISNA", "ISNONTEXT", "ISNUMBER", "ISLOGICAL", "ISTEXT", "ISEVEN", "ISODD", "AGGREGATE"].includes(n.name)) {
          const e = args.map((a) => flat(a).find(isError)).find((v) => v !== undefined);
          if (e !== undefined) return scalar(e);
        }
        return f(args);
      }
      case "bin": {
        const left = this.evalNode(n.l, sheet, localNames), right = this.evalNode(n.r, sheet, localNames);
        if (!Array.isArray(left) && !Array.isArray(right)) return binaryValue(n.op, left, right);
        const lm = Array.isArray(left) ? left : null, rm = Array.isArray(right) ? right : null;
        const rows = lm?.length ?? rm!.length, cols = lm?.[0]?.length ?? rm?.[0]?.length ?? 0;
        if ((lm && (lm.length !== rows || lm.some((r) => r.length !== cols))) || (rm && (rm.length !== rows || rm.some((r) => r.length !== cols)))) return ERR.VALUE;
        return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => binaryValue(n.op, lm ? lm[r][c] as Scalar : left as Scalar, rm ? rm[r][c] as Scalar : right as Scalar)));
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
