import { SKILLS } from "./skills";
import { escapeRegExp, normalize, toOriginalSpan } from "./text";

export interface Mention {
  readonly skillId: string;
  readonly start: number;
  readonly end: number;
  readonly term: string;
}

interface CompiledPattern {
  readonly skillId: string;
  readonly regex: RegExp;
  readonly cased: boolean;
}

const LEFT_BOUNDARY = "(?<![a-z0-9#+_@.])";
const RIGHT_BOUNDARY = "(?![a-z0-9#+_]|\\.[a-z0-9])";

function aliasToPattern(alias: string): string {
  return alias
    .split(/\s+/)
    .map((part) => escapeRegExp(part))
    .join("[\\s-]+");
}

function compile(): CompiledPattern[] {
  const patterns: CompiledPattern[] = [];
  for (const skill of SKILLS) {
    for (const alias of skill.aliases) {
      patterns.push({
        skillId: skill.id,
        regex: new RegExp(`${LEFT_BOUNDARY}${aliasToPattern(alias)}${RIGHT_BOUNDARY}`, "g"),
        cased: false,
      });
    }
    for (const regex of skill.cased ?? []) {
      patterns.push({ skillId: skill.id, regex: new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`), cased: true });
    }
  }
  return patterns;
}

let compiled: CompiledPattern[] | null = null;

function patterns(): CompiledPattern[] {
  compiled ??= compile();
  return compiled;
}

export function findMentions(input: string): Mention[] {
  const lower = normalize(input);
  const cased = normalize(input, { lower: false });
  const candidates: Mention[] = [];
  for (const pattern of patterns()) {
    const source = pattern.cased ? cased : lower;
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(source.text)) !== null) {
      if (match[0].length === 0) {
        pattern.regex.lastIndex++;
        continue;
      }
      const [start, end] = toOriginalSpan(source, match.index, match.index + match[0].length);
      candidates.push({ skillId: pattern.skillId, start, end, term: input.slice(start, end) });
    }
  }
  candidates.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const accepted: Mention[] = [];
  for (const candidate of candidates) {
    const overlaps = accepted.some((kept) => candidate.start < kept.end && kept.start < candidate.end);
    if (!overlaps) accepted.push(candidate);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

export function skillIdsIn(input: string): Set<string> {
  return new Set(findMentions(input).map((mention) => mention.skillId));
}
