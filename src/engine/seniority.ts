import { fold } from "./text";

export type Level = 0 | 1 | 2 | 3 | 4;

export const LEVEL_LABEL: Record<Level, string> = {
  0: "Estágio",
  1: "Júnior",
  2: "Pleno",
  3: "Sênior",
  4: "Especialista",
};

export type LevelSource = "titulo" | "anos" | "texto";

export interface LevelInfo {
  readonly level: Level;
  readonly maxLevel: Level;
  readonly label: string;
  readonly source: LevelSource;
  readonly evidence: string;
  readonly years: number | null;
}

const KEYWORDS: readonly (readonly [Level, RegExp])[] = [
  [0, /\b(estagio|estagiari[oa]s?|internship|intern|trainee|aprendiz)\b/],
  [1, /\b(junior|jr)\b/],
  [2, /\b(pleno|mid[- ]?level|midlevel)\b/],
  [3, /\b(senior|seniors|sr)\b/],
  [4, /\b(staff engineer|principal engineer|tech lead|lead engineer|engineering lead|lider tecnic[oa])\b/],
];

const TITLE_ONLY: readonly (readonly [Level, RegExp])[] = [
  [2, /\b(pl|mid)\b/],
  [4, /\b(especialista|specialist|staff|principal|lead)\b/],
];

export function levelsIn(text: string, titleMode = false): Level[] {
  const folded = fold(text);
  const found = new Set<Level>();
  for (const [level, pattern] of KEYWORDS) if (pattern.test(folded)) found.add(level);
  if (titleMode) for (const [level, pattern] of TITLE_ONLY) if (pattern.test(folded)) found.add(level);
  return [...found].sort((a, b) => a - b);
}

export function levelFromYears(years: number): Level {
  if (years < 2) return 1;
  if (years < 5) return 2;
  if (years < 8) return 3;
  return 4;
}

export function makeLevel(levels: readonly Level[], source: LevelSource, evidence: string, years: number | null): LevelInfo | null {
  const first = levels[0];
  const last = levels[levels.length - 1];
  if (first === undefined || last === undefined) return null;
  const label = first === last ? LEVEL_LABEL[first] : `${LEVEL_LABEL[first]} a ${LEVEL_LABEL[last]}`;
  return { level: first, maxLevel: last, label, source, evidence: evidence.trim().slice(0, 120), years };
}

const YEARS_PATTERN =
  /(?:(?:minimo de|no minimo|pelo menos|at least|mais de|over|acima de)\s+)?(\d{1,2})\s*(?:\+|ou mais)?\s*(?:(?:a|-|to)\s*\d{1,2}\s*)?\+?\s*(?:anos|years|yrs)/g;

export function requiredYears(text: string): { years: number; evidence: string } | null {
  const folded = fold(text);
  YEARS_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = YEARS_PATTERN.exec(folded)) !== null) {
    const around = folded.slice(Math.max(0, match.index - 60), match.index + match[0].length + 60);
    if (!/experien|atuacao|atuando|trabalhando|working/.test(around)) continue;
    const years = Number(match[1]);
    if (!Number.isFinite(years) || years > 30) continue;
    return { years, evidence: text.slice(match.index, match.index + match[0].length) };
  }
  return null;
}

export function fitPoints(job: LevelInfo | null, resume: LevelInfo | null, max: number): { points: number; detail: string } {
  if (!job) return { points: max, detail: "A vaga não diz o nível; não tirei pontos." };
  if (!resume) return { points: Math.round(max * 0.6), detail: `A vaga pede ${job.label}, mas não consegui estimar o seu nível pelo currículo.` };
  if (resume.level >= job.level && resume.level <= job.maxLevel) {
    return { points: max, detail: `A vaga pede ${job.label} e o seu currículo indica ${resume.label}.` };
  }
  const diff = resume.level > job.maxLevel ? resume.level - job.maxLevel : resume.level - job.level;
  if (diff > 0) {
    const points = diff === 1 ? Math.round(max * 0.85) : Math.round(max * 0.65);
    return { points, detail: `A vaga pede ${job.label}; você parece ${resume.label}, acima do pedido.` };
  }
  const table: Record<number, number> = { [-1]: 0.5, [-2]: 0.2 };
  const points = Math.round(max * (table[diff] ?? 0));
  return { points, detail: `A vaga pede ${job.label}; pelo currículo você parece ${resume.label}.` };
}
