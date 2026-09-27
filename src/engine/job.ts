import { englishMentions, isMostlyEnglish, makeEnglish, type EnglishInfo } from "./language";
import { findMentions, type Mention } from "./match";
import { lineAt, segment, type HeadingRule, type SegmentedLine } from "./sections";
import { levelsIn, makeLevel, requiredYears, levelFromYears, type LevelInfo } from "./seniority";
import { fold, stripBullet } from "./text";

export type JobSectionKind =
  | "title"
  | "intro"
  | "required"
  | "nice"
  | "responsibilities"
  | "stack"
  | "benefits"
  | "about"
  | "process"
  | "info";

export type Importance = "required" | "context" | "nice";

export type WorkModel = "remoto" | "hibrido" | "presencial";

export interface JobSkill {
  readonly id: string;
  readonly importance: Importance;
  readonly terms: readonly string[];
  readonly mentions: readonly Mention[];
}

export interface JobMention extends Mention {
  readonly importance: Importance;
}

export interface ParsedJob {
  readonly text: string;
  readonly title: string | null;
  readonly lines: readonly SegmentedLine<JobSectionKind>[];
  readonly skills: readonly JobSkill[];
  readonly mentions: readonly JobMention[];
  readonly alternatives: readonly (readonly [string, string])[];
  readonly hasRequiredSection: boolean;
  readonly hasSections: boolean;
  readonly level: LevelInfo | null;
  readonly workModel: { readonly value: WorkModel; readonly evidence: string } | null;
  readonly contracts: readonly string[];
  readonly salary: string | null;
  readonly english: (EnglishInfo & { readonly importance: Importance }) | null;
}

const NICE_WORDS = String.raw`desejave(l|is)|diferencia(l|is)|nice[- ]to[- ]haves?|plus|bonus|preferred|preferencia(l|is)|extras?|good to have|ganha pontos|pontos extras|se destaca`;

export const JOB_RULES: readonly HeadingRule<JobSectionKind>[] = [
  { kind: "benefits", pattern: /^(beneficios|nossos beneficios|benefits|o que oferecemos|oferecemos|what we offer|perks|vantagens|remuneracao e beneficios|compensation)\b/ },
  { kind: "nice", pattern: new RegExp(`(^|\\s)(${NICE_WORDS})\\b|^(sera|seria|e) (um |uma )?(diferencial|plus|otimo|legal|incrivel)|^nice to|^it'?s a plus`) },
  { kind: "required", pattern: /^(requisitos|requirements|pre-?requisitos|qualificacoes|qualifications|o que (buscamos|esperamos|procuramos|precisamos)|o que voce (precisa|deve|vai precisar|traz)|o que e (necessario|preciso)|what (we'?re|we are) looking for|what you('ll)? (need|bring)|what we (expect|need)|must[- ]haves?|voce precisa (ter|saber)|about you$|sobre voce$|seu perfil$|perfil (desejado|do candidato|profissional|tecnico|da pessoa)|minimum qualifications|basic qualifications|who you are$|quem (voce e|buscamos|procuramos)|para (essa|esta) (vaga|posicao)|experiencias? necessarias?$)/ },
  { kind: "required", pattern: /^(voce tem|you have|you bring|competencias|habilidades|conhecimentos|skills|hard skills)( (tecnicas|tecnicos|necessarias|necessarios|obrigatorias|obrigatorios|requeridas|essenciais|e experiencias|e qualificacoes))?$/ },
  { kind: "responsibilities", pattern: /^(responsabilidades|atividades|atribuicoes|o que voce (vai|ira) fazer|como sera (o )?seu dia|no dia a dia|seu dia a dia|dia a dia$|desafios( da (vaga|funcao))?$|seus desafios$|principais (atividades|responsabilidades|desafios)|responsibilities|what you('ll| will) do|your (role|mission|responsibilities|day)|the role$|sobre a (vaga|oportunidade|posicao|funcao)|descricao( da vaga)?$|job description|about the (role|job|position)|missao do cargo|the opportunity$|in this role)/ },
  { kind: "stack", pattern: /^(stack|nossa stack|tech stack|our stack|tecnologias|technologies|ferramentas|tools|ambiente tecnico)( que usamos| utilizadas| we use)?$/ },
  { kind: "process", pattern: /^(etapas|processo seletivo|nosso processo|hiring process|interview process|como (sera|e) o processo)/ },
  { kind: "about", pattern: /^(sobre (a empresa|nos|o time|a companhia|o [\p{L}]+|a [\p{L}]+)|quem somos|a empresa|about (us|the company|[\p{L}]+)$|who we are|nossa (historia|missao|cultura)|our (mission|story|culture)|company description)/u },
  { kind: "info", pattern: /^(informacoes adicionais|additional information|local|localizacao|location|modelo de trabalho|modalidade|regime|tipo de contratacao|jornada|horario|salario|faixa salarial)\b/ },
];

const NICE_CUE = new RegExp(`\\b(desejave(l|is)|diferencia(l|is)|nice[- ]to[- ]have|(e|is|a|sera um) plus|bonus|preferencialmente|preferably|preferred|seria (otimo|legal|incrivel)|would be (great|nice)|good to have|ideally|idealmente|nao obrigatori[oa])\\b`);
const REQUIRED_CUE = /\b(obrigatori[oa]s?|imprescindive(l|is)|indispensave(l|is)|essencia(l|is)|required|must|mandatory|necessari[oa]s?|fundamenta(l|is))\b/;

const SECTION_IMPORTANCE: Record<JobSectionKind, Importance | null> = {
  title: "required",
  required: "required",
  nice: "nice",
  intro: "context",
  responsibilities: "context",
  stack: "context",
  info: "context",
  benefits: null,
  about: null,
  process: null,
};

function cueOf(text: string): Importance | null {
  const folded = fold(text);
  if (NICE_CUE.test(folded)) return "nice";
  if (REQUIRED_CUE.test(folded)) return "required";
  return null;
}

function clauseAround(text: string, start: number, end: number, lineStart: number, lineEnd: number): string {
  const before = text.slice(lineStart, start);
  const after = text.slice(end, lineEnd);
  const left = Math.max(before.lastIndexOf(","), before.lastIndexOf(";"));
  const rightComma = after.search(/[,;]/);
  return `${before.slice(left + 1)}${text.slice(start, end)}${rightComma === -1 ? after : after.slice(0, rightComma)}`;
}

function importanceOf(text: string, line: SegmentedLine<JobSectionKind>, mention: Mention): Importance | null {
  const base = SECTION_IMPORTANCE[line.kind];
  if (base === null) return null;
  if (line.kind === "title") return "required";
  const clauseCue = cueOf(clauseAround(text, mention.start, mention.end, line.bodyStart, line.end));
  if (clauseCue) return clauseCue;
  if (line.kind !== "nice") {
    const lineCue = cueOf(line.body);
    if (lineCue) return lineCue;
  }
  return base;
}

const RANK: Record<Importance, number> = { required: 3, nice: 2, context: 1 };

function aggregate(mentions: readonly JobMention[]): JobSkill[] {
  const byId = new Map<string, JobMention[]>();
  for (const mention of mentions) {
    const list = byId.get(mention.skillId) ?? [];
    list.push(mention);
    byId.set(mention.skillId, list);
  }
  return [...byId.entries()].map(([id, list]) => {
    const importance = list.reduce<Importance>((best, m) => (RANK[m.importance] > RANK[best] ? m.importance : best), "context");
    const terms = [...new Set(list.map((m) => m.term.trim()))];
    return { id, importance, terms, mentions: list };
  });
}

const HYBRID = /\b(hibrido|hibrida|hybrid)\b|\d\s*(?:x|vezes|dias?)\s*(?:por|na|\/|ao)\s*semana[^.\n]{0,40}(?:escritorio|presencial)|(?:escritorio|presencial)[^.\n]{0,40}\d\s*(?:x|vezes|dias?)\s*(?:por|na|\/|ao)\s*semana/;
const ONSITE = /\b(presencial|presencialmente|on[- ]?site|in[- ]office|100% no escritorio|trabalho no escritorio)\b/;
const REMOTE = /\b(remoto|remota|remote|home[- ]office|trabalho a distancia|anywhere|teletrabalho|full[- ]remote|remote[- ]first)\b/;
const REMOTE_NOISE = /(auxilio|ajuda de custo|vale|subsidio|allowance|kit|bolsa)[^.\n]{0,25}(home[- ]office|remoto)/g;
const MODEL_LINE = /^(modelo de trabalho|modelo|modalidade|regime de trabalho|formato de trabalho|work model|workplace type|workplace|local de trabalho|local|localizacao|location)\b/;

function classifyModel(folded: string): WorkModel | null {
  const clean = folded.replace(REMOTE_NOISE, " ");
  if (HYBRID.test(clean)) return "hibrido";
  const remoteAt = clean.search(REMOTE);
  const onsiteAt = clean.search(ONSITE);
  if (remoteAt === -1 && onsiteAt === -1) return null;
  if (remoteAt === -1) return "presencial";
  if (onsiteAt === -1) return "remoto";
  return remoteAt < onsiteAt ? "remoto" : "presencial";
}

function detectWorkModel(lines: readonly SegmentedLine<JobSectionKind>[]): ParsedJob["workModel"] {
  const relevant = lines.filter((line) => line.kind !== "benefits" && line.kind !== "about" && line.kind !== "process");
  for (const line of relevant) {
    const folded = fold(line.text.trim());
    if (!MODEL_LINE.test(folded)) continue;
    const value = classifyModel(folded);
    if (value) return { value, evidence: line.text.trim() };
  }
  for (const line of relevant) {
    const value = classifyModel(fold(line.text));
    if (value) return { value, evidence: line.text.trim().slice(0, 120) };
  }
  return null;
}

function detectContracts(text: string): string[] {
  const folded = fold(text);
  const found: string[] = [];
  if (/\bclt\b/.test(folded)) found.push("CLT");
  if (/\bpj\b|pessoa juridica/.test(folded)) found.push("PJ");
  if (/\bcooperad[oa]\b/.test(folded)) found.push("Cooperado");
  if (/\b(estagio|estagiari[oa]|internship)\b/.test(folded)) found.push("Estágio");
  if (/\btemporari[oa]\b|\bcontrato por prazo determinado\b/.test(folded)) found.push("Temporário");
  if (/\b(freelancer?|freela)\b/.test(folded)) found.push("Freelancer");
  return found;
}

const MONEY = String.raw`(?:R\$|US\$|USD|U\$|\$|€)\s?\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?(?:\s?(?:mil|k))?`;
const SALARY = new RegExp(`${MONEY}(?:\\s*(?:a|-|até|to|e)\\s*(?:(?:R\\$|US\\$|USD|U\\$|\\$|€)\\s?)?\\d{1,3}(?:[.,]\\d{3})*(?:,\\d{2})?(?:\\s?(?:mil|k))?)?`, "i");

function detectSalary(lines: readonly SegmentedLine<JobSectionKind>[]): string | null {
  for (const line of lines) {
    if (line.kind === "about" || line.kind === "process") continue;
    const folded = fold(line.text);
    if (line.kind === "benefits" && !/salario|remuneracao|faixa|salary|compensation/.test(folded)) continue;
    const match = SALARY.exec(line.text);
    if (match) return match[0].trim();
  }
  return null;
}

function detectLevel(lines: readonly SegmentedLine<JobSectionKind>[], title: string | null): LevelInfo | null {
  const years = requiredYears(
    lines
      .filter((line) => line.kind === "required" || line.kind === "intro" || line.kind === "title" || line.kind === "info")
      .map((line) => line.text)
      .join("\n"),
  );
  const yearsValue = years?.years ?? null;
  if (title) {
    const fromTitle = makeLevel(levelsIn(title, true), "titulo", title, yearsValue);
    if (fromTitle) return fromTitle;
  }
  if (years) return makeLevel([levelFromYears(years.years)], "anos", years.evidence, years.years);
  for (const line of lines) {
    if (line.kind === "benefits" || line.kind === "about" || line.kind === "process") continue;
    const found = makeLevel(levelsIn(line.text), "texto", line.text, null);
    if (found) return found;
  }
  return null;
}

function detectEnglish(text: string, lines: readonly SegmentedLine<JobSectionKind>[]): ParsedJob["english"] {
  for (const mention of englishMentions(text)) {
    const line = lineAt(lines, mention.index);
    if (!line || SECTION_IMPORTANCE[line.kind] === null) continue;
    const cue = cueOf(line.body);
    const importance: Importance = cue ?? (line.kind === "nice" ? "nice" : "required");
    return { ...makeEnglish(mention.level ?? 2, false, mention.evidence), importance };
  }
  if (isMostlyEnglish(text)) return { ...makeEnglish(3, true, "A vaga está escrita em inglês."), importance: "required" };
  return null;
}

const EDUCATION_LINE = /^(formacao|graduacao|ensino superior|curso superior|superior completo|bacharelado|diploma|degree|bachelor'?s?|bs\/ms|b\.?sc)/;
const ALTERNATIVE_GAP = /^\s*(?:,\s*)?(?:ou|or|ou entao)\s*$/;

function findAlternatives(text: string, mentions: readonly JobMention[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 1; i < mentions.length; i++) {
    const previous = mentions[i - 1];
    const current = mentions[i];
    if (!previous || !current || previous.skillId === current.skillId) continue;
    const gap = fold(text.slice(previous.end, current.start));
    if (ALTERNATIVE_GAP.test(gap)) pairs.push([previous.skillId, current.skillId]);
  }
  return pairs;
}

export function parseJob(text: string): ParsedJob {
  const lines = segment<JobSectionKind>(text, JOB_RULES, "intro", "title");
  const titleLine = lines.find((line) => line.kind === "title");
  const title = titleLine ? titleLine.text.trim() : null;
  const mentions: JobMention[] = [];
  for (const mention of findMentions(text)) {
    const line = lineAt(lines, mention.start);
    if (!line) continue;
    if (line.heading && mention.start < line.bodyStart) continue;
    if (EDUCATION_LINE.test(fold(stripBullet(line.body)))) continue;
    const importance = importanceOf(text, line, mention);
    if (importance) mentions.push({ ...mention, importance });
  }
  const hasRequiredSection = lines.some((line) => line.kind === "required") || mentions.some((m) => m.importance === "required" && lineAt(lines, m.start)?.kind !== "title");
  return {
    text,
    title,
    lines,
    skills: aggregate(mentions),
    alternatives: findAlternatives(text, mentions),
    mentions,
    hasRequiredSection,
    hasSections: lines.some((line) => line.heading),
    level: detectLevel(lines, title),
    workModel: detectWorkModel(lines),
    contracts: detectContracts(text),
    salary: detectSalary(lines),
    english: detectEnglish(text, lines),
  };
}
