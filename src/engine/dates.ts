import { fold } from "./text";

export interface MonthRange {
  readonly start: number;
  readonly end: number;
}

const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1, january: 1,
  fev: 2, fevereiro: 2, feb: 2, february: 2,
  mar: 3, marco: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  mai: 5, maio: 5, may: 5,
  jun: 6, junho: 6, june: 6,
  jul: 7, julho: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, setembro: 9, sep: 9, sept: 9, september: 9,
  out: 10, outubro: 10, oct: 10, october: 10,
  nov: 11, novembro: 11, november: 11,
  dez: 12, dezembro: 12, dec: 12, december: 12,
};

const MONTH_ALT = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

const DATE = `(?:(${MONTH_ALT})\\.?\\s*(?:de\\s+|/\\s*)?|(\\d{1,2})\\s*[/.-]\\s*)?((?:19|20)\\d{2})`;
const OPEN_END = "(atualmente|atual|presente|present|current|hoje|now|o momento|momento|the moment|ongoing|em andamento)";
const RANGE = new RegExp(`\\b${DATE}\\s*(?:-|a|ate|to|~|->|\\u2192)\\s*(?:${DATE}|${OPEN_END})`, "g");

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function parseMonth(name: string | undefined, numeric: string | undefined, fallback: number): number {
  if (name) return MONTHS[name] ?? fallback;
  if (numeric) {
    const value = Number(numeric);
    if (value >= 1 && value <= 12) return value;
  }
  return fallback;
}

export function findRanges(text: string, today: Date): MonthRange[] {
  const folded = fold(text);
  const ranges: MonthRange[] = [];
  const now = monthIndex(today.getFullYear(), today.getMonth() + 1);
  RANGE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RANGE.exec(folded)) !== null) {
    const startYear = Number(match[3]);
    const start = monthIndex(startYear, parseMonth(match[1], match[2], 1));
    let end: number;
    if (match[7]) {
      end = now;
    } else {
      const endYear = Number(match[6]);
      const hasMonth = Boolean(match[4] ?? match[5]);
      end = monthIndex(endYear, parseMonth(match[4], match[5], hasMonth ? 12 : endYear === startYear ? 12 : 6));
    }
    end = Math.min(end, now);
    if (end >= start && end - start < 12 * 45) ranges.push({ start, end: end + 1 });
  }
  return ranges;
}

export function totalMonths(ranges: readonly MonthRange[]): number {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let total = 0;
  let current: MonthRange | null = null;
  for (const range of sorted) {
    if (current && range.start <= current.end) {
      current = { start: current.start, end: Math.max(current.end, range.end) };
    } else {
      if (current) total += current.end - current.start;
      current = range;
    }
  }
  if (current) total += current.end - current.start;
  return total;
}

export function explicitYears(text: string): number | null {
  const folded = fold(text);
  const match = /(\d{1,2})\s*\+?\s*(?:anos|years)\s+(?:de\s+)?(?:experiencia|experience|atuando|atuacao|trabalhando|working|in|como|as)/.exec(folded);
  if (!match) return null;
  const years = Number(match[1]);
  return years > 0 && years < 45 ? years : null;
}
