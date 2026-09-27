import { fold } from "./text";

export type EnglishLevel = 1 | 2 | 3 | 4;

export const ENGLISH_LABEL: Record<EnglishLevel, string> = {
  1: "básico",
  2: "intermediário",
  3: "avançado",
  4: "fluente",
};

export interface EnglishInfo {
  readonly level: EnglishLevel;
  readonly label: string;
  readonly inferred: boolean;
  readonly evidence: string;
}

const LEVEL_WORDS: readonly (readonly [EnglishLevel, RegExp])[] = [
  [4, /\b(fluente|fluencia|fluent|fluency|nativo|native|proficient|proficiente|bilingue|bilingual|c2)\b/],
  [3, /\b(avancado|advanced|c1)\b/],
  [2, /\b(intermediario|intermediate|upper[- ]intermediate|b1|b2|conversacao|conversacional|conversational)\b/],
  [1, /\b(basico|basic|elementary|a1|a2|tecnico|instrumental|leitura|reading)\b/],
];

const MENTION = /\b(ingles|english)\b/g;

function levelNear(window: string, closestToEnd = false): EnglishLevel | null {
  let best: { level: EnglishLevel; index: number } | null = null;
  for (const [level, pattern] of LEVEL_WORDS) {
    const global = new RegExp(pattern.source, "g");
    let match: RegExpExecArray | null;
    while ((match = global.exec(window)) !== null) {
      const better = best === null || (closestToEnd ? match.index > best.index : match.index < best.index);
      if (better) best = { level, index: match.index };
    }
  }
  return best?.level ?? null;
}

export function englishMentions(text: string): { level: EnglishLevel | null; index: number; evidence: string }[] {
  const folded = fold(text);
  const found: { level: EnglishLevel | null; index: number; evidence: string }[] = [];
  MENTION.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION.exec(folded)) !== null) {
    const lineStart = folded.lastIndexOf("\n", match.index) + 1;
    const lineEndRaw = folded.indexOf("\n", match.index);
    const lineEnd = lineEndRaw === -1 ? folded.length : lineEndRaw;
    const after = folded.slice(match.index, Math.min(lineEnd, match.index + 70));
    const before = folded.slice(Math.max(lineStart, match.index - 45), match.index);
    const level = levelNear(after) ?? levelNear(before, true);
    found.push({ level, index: match.index, evidence: text.slice(lineStart, lineEnd).trim().slice(0, 120) });
  }
  return found;
}

const EN_WORDS = /\b(the|and|with|you|we|our|for|will|are|your|of|to|in|is|experience|team)\b/g;
const PT_WORDS = /\b(de|que|com|para|voce|em|uma|os|na|no|do|da|e|experiencia|time|nossa|nosso)\b/g;

export function isMostlyEnglish(text: string): boolean {
  const folded = fold(text);
  const en = folded.match(EN_WORDS)?.length ?? 0;
  const pt = folded.match(PT_WORDS)?.length ?? 0;
  return en >= 12 && en > pt * 2;
}

export function makeEnglish(level: EnglishLevel, inferred: boolean, evidence: string): EnglishInfo {
  return { level, label: ENGLISH_LABEL[level], inferred, evidence };
}
