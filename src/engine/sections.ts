import { fold, isBulletLine, splitLines, stripBullet, type Line } from "./text";

export interface HeadingRule<K extends string> {
  readonly kind: K;
  readonly pattern: RegExp;
}

export interface SegmentedLine<K extends string> extends Line {
  readonly kind: K;
  readonly heading: boolean;
  readonly body: string;
  readonly bodyStart: number;
}

const MAX_HEADING_CHARS = 70;
const MAX_HEADING_WORDS = 9;
const MAX_INLINE_HEADING_CHARS = 45;

function cleanHeading(raw: string): string {
  return fold(stripBullet(raw))
    .replace(/[*_#`]+/g, "")
    .replace(/[^\p{L}\p{N}\s/+'-]+$/u, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}

function matchRule<K extends string>(candidate: string, rules: readonly HeadingRule<K>[]): K | null {
  for (const rule of rules) {
    if (rule.pattern.test(candidate)) return rule.kind;
  }
  return null;
}

export function detectHeading<K extends string>(
  line: string,
  rules: readonly HeadingRule<K>[],
): { kind: K; bodyOffset: number } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  const colon = trimmed.indexOf(":");
  if (colon > 0 && colon <= MAX_INLINE_HEADING_CHARS && trimmed.slice(colon + 1).trim().length > 0) {
    const kind = matchRule(cleanHeading(trimmed.slice(0, colon)), rules);
    if (kind !== null) return { kind, bodyOffset: line.indexOf(":") + 1 };
  }
  if (trimmed.length > MAX_HEADING_CHARS) return null;
  const endsWithColon = /:\s*$/.test(trimmed);
  if (/[.;,]$/.test(trimmed) && !endsWithColon) return null;
  if (isBulletLine(line) && !endsWithColon) return null;
  const candidate = cleanHeading(trimmed);
  if (candidate.length === 0 || candidate.split(/\s+/).length > MAX_HEADING_WORDS) return null;
  const kind = matchRule(candidate, rules);
  return kind === null ? null : { kind, bodyOffset: line.length };
}

export function segment<K extends string>(
  input: string,
  rules: readonly HeadingRule<K>[],
  initial: K,
  titleKind?: K,
): SegmentedLine<K>[] {
  let current = initial;
  let titleAssigned = titleKind === undefined;
  return splitLines(input).map((line) => {
    const heading = detectHeading(line.text, rules);
    if (heading) {
      titleAssigned = true;
      const inline = heading.bodyOffset < line.text.length;
      if (!inline) current = heading.kind;
      const bodyStart = line.start + heading.bodyOffset;
      return { ...line, kind: heading.kind, heading: true, body: input.slice(bodyStart, line.end), bodyStart };
    }
    if (!titleAssigned && titleKind !== undefined && line.text.trim().length > 0) {
      titleAssigned = true;
      if (line.text.trim().length <= 110) {
        return { ...line, kind: titleKind, heading: false, body: line.text, bodyStart: line.start };
      }
    }
    return { ...line, kind: current, heading: false, body: line.text, bodyStart: line.start };
  });
}

export function lineAt<L extends Line>(lines: readonly L[], offset: number): L | undefined {
  let low = 0;
  let high = lines.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const line = lines[mid];
    if (!line) break;
    if (offset < line.start) high = mid - 1;
    else if (offset > line.end) low = mid + 1;
    else return line;
  }
  return undefined;
}
