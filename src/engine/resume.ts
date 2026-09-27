import { explicitYears, findRanges, totalMonths } from "./dates";
import { englishMentions, isMostlyEnglish, makeEnglish, type EnglishInfo } from "./language";
import { findMentions, type Mention } from "./match";
import { segment, type HeadingRule, type SegmentedLine } from "./sections";
import { levelFromYears, levelsIn, makeLevel, type LevelInfo } from "./seniority";
import { impliedBy } from "./skills";
import { isBulletLine, stripBullet } from "./text";

export type ResumeSectionKind =
  | "header"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "courses"
  | "skills"
  | "languages"
  | "other";

export const RESUME_RULES: readonly HeadingRule<ResumeSectionKind>[] = [
  { kind: "experience", pattern: /^(experiencias?( profissionais?| profissional)?|experience|work experience|professional experience|historico profissional|trajetoria( profissional)?|carreira|employment( history)?)$/ },
  { kind: "projects", pattern: /^(projetos( pessoais| relevantes)?|projects|personal projects|portfolio)$/ },
  { kind: "education", pattern: /^(formacao( academica)?|educacao|education|escolaridade|academic background)$/ },
  { kind: "courses", pattern: /^(cursos( e certificacoes| complementares)?|certificacoes|certificados|certifications|courses|licencas e certificados)$/ },
  { kind: "skills", pattern: /^(habilidades( tecnicas)?|competencias( tecnicas)?|skills|hard skills|technical skills|tecnologias|conhecimentos( tecnicos)?|stack|ferramentas|principais tecnologias|tech stack)$/ },
  { kind: "languages", pattern: /^(idiomas|languages|linguas)$/ },
  { kind: "summary", pattern: /^(resumo( profissional)?|sobre( mim)?|perfil( profissional)?|summary|professional summary|about( me)?|objetivo|profile|apresentacao)$/ },
  { kind: "other", pattern: /^(voluntariado|volunteer|premios|awards|interesses|interests|contato|contact|referencias|references|publicacoes|publications)$/ },
];

export interface Bullet {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly skills: readonly string[];
  readonly hasNumber: boolean;
}

export interface ResumeSkill {
  readonly id: string;
  readonly terms: readonly string[];
  readonly inBullets: boolean;
}

export interface ParsedResume {
  readonly text: string;
  readonly lines: readonly SegmentedLine<ResumeSectionKind>[];
  readonly mentions: readonly Mention[];
  readonly skills: ReadonlyMap<string, ResumeSkill>;
  readonly implied: ReadonlyMap<string, string>;
  readonly bullets: readonly Bullet[];
  readonly level: LevelInfo | null;
  readonly years: number | null;
  readonly english: EnglishInfo | null;
}

const BULLET_KINDS: ReadonlySet<ResumeSectionKind> = new Set(["experience", "projects"]);
const NON_BULLET_KINDS: ReadonlySet<ResumeSectionKind> = new Set(["skills", "education", "courses", "languages", "header", "other"]);
const DATE_LINE = /(19|20)\d{2}/;
const MIN_BULLET = 28;

function buildBullets(text: string, lines: readonly SegmentedLine<ResumeSectionKind>[], mentions: readonly Mention[]): Bullet[] {
  const hasExperience = lines.some((line) => BULLET_KINDS.has(line.kind));
  const eligibleLine = (line: SegmentedLine<ResumeSectionKind>) =>
    hasExperience ? BULLET_KINDS.has(line.kind) : !NON_BULLET_KINDS.has(line.kind) && isBulletLine(line.text);
  const markersInUse = lines.some((line) => !line.heading && eligibleLine(line) && isBulletLine(line.text));
  const raw: { start: number; end: number }[] = [];
  let previousWasBullet = false;
  for (const line of lines) {
    const content = line.text.trim();
    if (line.heading || content.length === 0) {
      previousWasBullet = false;
      continue;
    }
    if (!eligibleLine(line)) {
      previousWasBullet = false;
      continue;
    }
    const marked = isBulletLine(line.text);
    const last = raw[raw.length - 1];
    const stripped = stripBullet(line.text);
    const previousOpen = last !== undefined && !/[.!?;]\s*$/.test(text.slice(last.start, last.end));
    const dateRow = DATE_LINE.test(stripped) && stripped.length < 90;
    const continuation = !marked && previousWasBullet && previousOpen && !dateRow && (markersInUse || /^[\p{Ll}(]/u.test(content));
    if (continuation && last) {
      last.end = line.end;
      continue;
    }
    const looksLikeHeaderRow = !marked && (markersInUse || dateRow || stripped.length < MIN_BULLET);
    if (looksLikeHeaderRow) {
      previousWasBullet = false;
      continue;
    }
    const offset = line.text.indexOf(stripped);
    raw.push({ start: line.start + Math.max(0, offset), end: line.end });
    previousWasBullet = true;
  }
  return raw
    .filter((range) => range.end - range.start >= MIN_BULLET)
    .map((range) => {
      const bulletText = text.slice(range.start, range.end);
      const skills = [...new Set(mentions.filter((m) => m.start >= range.start && m.end <= range.end).map((m) => m.skillId))];
      return { text: bulletText, start: range.start, end: range.end, skills, hasNumber: /\d/.test(bulletText) };
    });
}

function collectSkills(mentions: readonly Mention[], bullets: readonly Bullet[]): Map<string, ResumeSkill> {
  const skills = new Map<string, ResumeSkill>();
  for (const mention of mentions) {
    const current = skills.get(mention.skillId);
    const inBullet = bullets.some((b) => mention.start >= b.start && mention.end <= b.end);
    const terms = new Set(current?.terms ?? []);
    terms.add(mention.term.trim());
    skills.set(mention.skillId, { id: mention.skillId, terms: [...terms], inBullets: (current?.inBullets ?? false) || inBullet });
  }
  return skills;
}

function detectLevel(text: string, lines: readonly SegmentedLine<ResumeSectionKind>[], today: Date): { level: LevelInfo | null; years: number | null } {
  const experienceText = lines.filter((l) => l.kind === "experience").map((l) => l.text).join("\n");
  const datedText = experienceText.length > 0
    ? experienceText
    : lines.filter((l) => l.kind !== "education" && l.kind !== "courses").map((l) => l.text).join("\n");
  const months = totalMonths(findRanges(datedText, today));
  const introText = lines.filter((l) => l.kind === "header" || l.kind === "summary").map((l) => l.text).join("\n");
  const stated = explicitYears(introText.length > 0 ? introText : text);
  const years = stated ?? (months > 0 ? Math.round((months / 12) * 10) / 10 : null);

  const headerLines = lines.filter((l) => l.kind === "header" || l.kind === "summary").slice(0, 6);
  for (const line of headerLines) {
    const levels = levelsIn(line.text, true).filter((level) => level > 0 || /estagi|intern/i.test(line.text));
    const fromTitle = makeLevel(levels.slice(-1), "titulo", line.text, years);
    if (fromTitle) return { level: fromTitle, years };
  }
  if (years !== null) {
    const evidence = stated !== null ? `${stated} anos de experiência declarados` : `≈${years.toLocaleString("pt-BR")} anos somando as datas das experiências`;
    return { level: makeLevel([levelFromYears(years)], "anos", evidence, years), years };
  }
  return { level: null, years };
}

function detectEnglish(text: string): EnglishInfo | null {
  const mentions = englishMentions(text);
  const leveled = mentions.find((m) => m.level !== null);
  if (leveled?.level) return makeEnglish(leveled.level, false, leveled.evidence);
  if (isMostlyEnglish(text)) return makeEnglish(3, true, "Currículo escrito em inglês.");
  const first = mentions[0];
  if (first) return makeEnglish(2, true, first.evidence);
  return null;
}

export function parseResume(text: string, today: Date = new Date()): ParsedResume {
  const lines = segment<ResumeSectionKind>(text, RESUME_RULES, "header");
  const mentions = findMentions(text);
  const bullets = buildBullets(text, lines, mentions);
  const skills = collectSkills(mentions, bullets);
  const { level, years } = detectLevel(text, lines, today);
  return {
    text,
    lines,
    mentions,
    skills,
    implied: impliedBy(skills.keys()),
    bullets,
    level,
    years,
    english: detectEnglish(text),
  };
}
