export interface NormalizedText {
  readonly text: string;
  readonly map: readonly number[];
}

export interface Line {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

const REPLACEMENTS: Record<string, string> = {
  "–": "-",
  "—": "-",
  "‒": "-",
  "−": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  " ": " ",
  "•": "*",
  "●": "*",
  "▪": "*",
  "‣": "*",
  "·": "*",
  "＋": "+",
};

function foldChar(ch: string, lower: boolean): string {
  const replaced = REPLACEMENTS[ch];
  if (replaced !== undefined) return replaced;
  const base = ch.normalize("NFD").replace(COMBINING_MARKS, "");
  return lower ? base.toLowerCase() : base;
}

export function normalize(input: string, options: { lower?: boolean } = {}): NormalizedText {
  const lower = options.lower ?? true;
  const parts: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const folded = foldChar(input.charAt(i), lower);
    for (let k = 0; k < folded.length; k++) map.push(i);
    parts.push(folded);
  }
  map.push(input.length);
  return { text: parts.join(""), map };
}

export function fold(input: string): string {
  return normalize(input).text;
}

export function toOriginalSpan(norm: NormalizedText, start: number, end: number): [number, number] {
  const originalStart = norm.map[start] ?? 0;
  const lastIndex = Math.max(start, end - 1);
  const originalEnd = (norm.map[lastIndex] ?? originalStart) + 1;
  return [originalStart, originalEnd];
}

export function splitLines(input: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (let i = 0; i <= input.length; i++) {
    if (i < input.length && input.charAt(i) !== "\n") continue;
    let end = i;
    if (end > start && input.charAt(end - 1) === "\r") end--;
    lines.push({ text: input.slice(start, end), start, end });
    start = i + 1;
  }
  return lines;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

export function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*+>#]+|\d{1,2}[.)]|[•●▪‣·✓✔➤▸►])\s*/u, "").trim();
}

export function isBulletLine(line: string): boolean {
  return /^\s*(?:[-*+>]|[•●▪‣·✓✔➤▸►])\s+\S/u.test(line);
}

export function compactKey(value: string): string {
  return fold(value).replace(/[\s.\-_/]+/g, "");
}

export function joinList(items: readonly string[], conjunction = "e"): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1] ?? ""}`;
}
