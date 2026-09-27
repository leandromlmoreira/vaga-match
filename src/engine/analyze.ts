import { parseJob, type Importance, type JobSkill, type ParsedJob, type WorkModel } from "./job";
import type { EnglishInfo } from "./language";
import { parseResume, type ParsedResume } from "./resume";
import { fitPoints } from "./seniority";
import { SKILL_BY_ID } from "./skills";
import { buildSuggestions } from "./suggestions";
import { joinList } from "./text";
import type { Analysis, Band, BreakdownItem, HighlightSpan, MatchStatus, SkillResult } from "./types";

export interface AnalyzeOptions {
  readonly today?: Date;
}

const CREDIT: Record<MatchStatus, number> = { tem: 1, inferido: 0.7, falta: 0 };
const IMPORTANCE_ORDER: Record<Importance, number> = { required: 0, context: 1, nice: 2 };
const STATUS_ORDER: Record<MatchStatus, number> = { tem: 0, inferido: 1, falta: 2 };
const SENIORITY_MAX = 15;
const LANGUAGE_MAX = 10;

export const WORK_MODEL_LABEL: Record<WorkModel, string> = {
  remoto: "Remoto",
  hibrido: "Híbrido",
  presencial: "Presencial",
};

const BAND_HEADLINE: Record<Band, string> = {
  forte: "Aderência forte",
  boa: "Boa aderência",
  parcial: "Aderência parcial",
  baixa: "Aderência baixa",
};

function bandOf(score: number): Band {
  if (score >= 80) return "forte";
  if (score >= 60) return "boa";
  if (score >= 40) return "parcial";
  return "baixa";
}

function evaluate(skill: JobSkill, resume: ParsedResume): SkillResult {
  const def = SKILL_BY_ID.get(skill.id);
  const own = resume.skills.get(skill.id);
  const impliedFrom = resume.implied.get(skill.id);
  const status: MatchStatus = own ? "tem" : impliedFrom ? "inferido" : "falta";
  return {
    id: skill.id,
    label: def?.label ?? skill.id,
    category: def?.category ?? "ferramenta",
    importance: skill.importance,
    status,
    jobTerms: skill.terms,
    resumeTerms: own?.terms ?? [],
    via: impliedFrom ? SKILL_BY_ID.get(impliedFrom)?.label ?? impliedFrom : null,
    inBullets: own?.inBullets ?? false,
    alternatives: [],
    memberIds: [skill.id],
  };
}

function groupsOf(ids: readonly string[], pairs: ParsedJob["alternatives"]): string[][] {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    return root;
  };
  for (const [a, b] of pairs) {
    if (!parent.has(a) || !parent.has(b)) continue;
    parent.set(find(a), find(b));
  }
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }
  return [...groups.values()];
}

function applyAlternatives(results: SkillResult[], pairs: ParsedJob["alternatives"]): { results: SkillResult[]; covered: Map<string, MatchStatus> } {
  const byId = new Map(results.map((r) => [r.id, r]));
  const covered = new Map<string, MatchStatus>();
  const output: SkillResult[] = [];
  for (const group of groupsOf(results.map((r) => r.id), pairs)) {
    const members = group.map((id) => byId.get(id)).filter((r): r is SkillResult => r !== undefined);
    const first = members[0];
    if (!first) continue;
    if (members.length === 1) {
      output.push(first);
      continue;
    }
    const present = members.filter((r) => r.status !== "falta");
    const absent = members.filter((r) => r.status === "falta");
    const importance = members.reduce<Importance>((best, r) => (IMPORTANCE_ORDER[r.importance] < IMPORTANCE_ORDER[best] ? r.importance : best), "nice");
    if (present.length > 0) {
      const alternatives = absent.map((r) => r.jobTerms[0] ?? r.label);
      for (const r of present) output.push({ ...r, importance, alternatives, memberIds: members.map((m) => m.id) });
      const best = present.some((r) => r.status === "tem") ? "tem" : "inferido";
      for (const r of absent) covered.set(r.id, best);
      continue;
    }
    output.push({
      ...first,
      id: members.map((r) => r.id).join("|"),
      label: joinList(members.map((r) => r.jobTerms[0] ?? r.label), "ou"),
      importance,
      jobTerms: members.flatMap((r) => r.jobTerms),
      memberIds: members.map((m) => m.id),
    });
  }
  return { results: output, covered };
}

function sortResults(list: SkillResult[]): SkillResult[] {
  return list.sort(
    (a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance] || STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );
}

function coverage(list: readonly SkillResult[], weight: (r: SkillResult) => number): number {
  const total = list.reduce((sum, r) => sum + weight(r), 0);
  if (total === 0) return 0;
  return list.reduce((sum, r) => sum + weight(r) * CREDIT[r.status], 0) / total;
}

function tally(list: readonly SkillResult[]): string {
  const have = list.filter((r) => r.status === "tem").length;
  const inferred = list.filter((r) => r.status === "inferido").length;
  return inferred > 0 ? `${have} de ${list.length} (+${inferred} por dedução)` : `${have} de ${list.length}`;
}

function coreDetail(core: readonly SkillResult[]): string {
  const required = core.filter((r) => r.importance === "required");
  const context = core.filter((r) => r.importance === "context");
  const parts: string[] = [];
  if (required.length > 0) parts.push(`${tally(required)} obrigatórias`);
  if (context.length > 0) parts.push(`${tally(context)} citadas na descrição`);
  return `Você tem ${parts.join("; ")}. Obrigatórias valem o dobro.`;
}

function englishPoints(job: ParsedJob["english"], resume: EnglishInfo | null): { points: number; detail: string } {
  if (!job) return { points: LANGUAGE_MAX, detail: "A vaga não pede outro idioma." };
  const have = resume?.level ?? 0;
  const resumeText = resume ? `seu currículo indica ${resume.label}` : "seu currículo não fala de inglês";
  if (job.importance === "nice") {
    return { points: have >= job.level ? LANGUAGE_MAX : 7, detail: `Inglês ${job.label} é diferencial; ${resumeText}.` };
  }
  const gap = job.level - have;
  const points = gap <= 0 ? LANGUAGE_MAX : gap === 1 ? 6 : gap === 2 ? 3 : 0;
  const asked = job.inferred ? `A vaga está em inglês (conta como ${job.label})` : `A vaga pede inglês ${job.label}`;
  return { points, detail: `${asked}; ${resumeText}.` };
}

function buildBreakdown(core: SkillResult[], nice: SkillResult[], job: ParsedJob, resume: ParsedResume): BreakdownItem[] {
  const coreMax = nice.length > 0 ? 65 : 75;
  const contextWeight = job.hasRequiredSection ? 1.5 : 2;
  const coreScore = coverage(core, (r) => (r.importance === "required" ? 3 : contextWeight));
  const items: BreakdownItem[] = [
    {
      id: "obrigatorias",
      label: "Habilidades pedidas",
      points: Math.round(coreMax * coreScore),
      max: coreMax,
      detail: coreDetail(core),
    },
  ];
  if (nice.length > 0) {
    items.push({
      id: "desejaveis",
      label: "Diferenciais",
      points: Math.round(10 * coverage(nice, () => 1)),
      max: 10,
      detail: `Você tem ${tally(nice)} ${nice.length === 1 ? "diferencial" : "diferenciais"}.`,
    });
  }
  const seniority = fitPoints(job.level, resume.level, SENIORITY_MAX);
  items.push({ id: "senioridade", label: "Senioridade", points: seniority.points, max: SENIORITY_MAX, detail: seniority.detail });
  const language = englishPoints(job.english, resume.english);
  items.push({ id: "idioma", label: "Idioma", points: language.points, max: LANGUAGE_MAX, detail: language.detail });
  return items;
}

function names(list: readonly SkillResult[], limit = 5): string {
  const labels = list.map((r) => r.jobTerms[0] ?? r.label);
  const shown = labels.slice(0, limit);
  const rest = labels.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} e mais ${rest}` : joinList(shown);
}

function buildSummary(core: SkillResult[], nice: SkillResult[], job: ParsedJob, breakdown: BreakdownItem[]): string[] {
  const summary: string[] = [];
  const required = core.filter((r) => r.importance === "required");
  const pool = required.length > 0 ? required : core;
  const noun = required.length > 0 ? (pool.length === 1 ? "requisito obrigatório" : "requisitos obrigatórios") : pool.length === 1 ? "habilidade citada" : "habilidades citadas";
  const covered = pool.filter((r) => r.status !== "falta");
  const missing = pool.filter((r) => r.status === "falta");
  summary.push(`Você cobre ${covered.length} de ${pool.length} ${noun}.${missing.length > 0 ? ` ${missing.length === 1 ? "Falta" : "Faltam"} ${names(missing)}.` : ""}`);
  if (nice.length > 0) {
    const haveNice = nice.filter((r) => r.status !== "falta");
    summary.push(haveNice.length > 0 ? `Dos diferenciais, você tem ${names(haveNice, 4)}.` : "Nenhum dos diferenciais aparece no seu currículo.");
  }
  const seniority = breakdown.find((b) => b.id === "senioridade");
  if (seniority && seniority.points < seniority.max) summary.push(seniority.detail);
  const language = breakdown.find((b) => b.id === "idioma");
  if (language && language.points < language.max) summary.push(language.detail);
  if (!job.hasSections) summary.push("Não achei seções como “Requisitos” ou “Diferenciais”, então tratei tudo que a vaga cita com o mesmo peso.");
  return summary;
}

function buildHighlights(job: ParsedJob, results: readonly SkillResult[], covered: ReadonlyMap<string, MatchStatus>): HighlightSpan[] {
  const statusById = new Map<string, MatchStatus>(covered);
  for (const result of results) for (const id of result.memberIds) if (!statusById.has(id)) statusById.set(id, result.status);
  return job.mentions.flatMap((mention) => {
    const status = statusById.get(mention.skillId);
    if (!status) return [];
    return [{ start: mention.start, end: mention.end, skillId: mention.skillId, status, importance: mention.importance }];
  });
}

export function analyzeParsed(job: ParsedJob, resume: ParsedResume): Analysis {
  const { results: all, covered } = applyAlternatives(job.skills.map((skill) => evaluate(skill, resume)), job.alternatives);
  let core = sortResults(all.filter((r) => r.importance !== "nice"));
  let nice = sortResults(all.filter((r) => r.importance === "nice"));
  if (core.length === 0 && nice.length > 0) {
    core = nice;
    nice = [];
  }
  const base = {
    title: job.title,
    seniority: { job: job.level, resume: resume.level },
    workModel: job.workModel ? { ...job.workModel, label: WORK_MODEL_LABEL[job.workModel.value] } : null,
    contracts: job.contracts,
    salary: job.salary,
    english: { job: job.english, resume: resume.english },
    highlights: buildHighlights(job, all, covered),
  };
  const notes: string[] = [];
  if (resume.skills.size === 0) notes.push("Não reconheci nenhuma habilidade técnica no currículo. Confira se o texto foi lido por completo.");
  if (core.length === 0) {
    return {
      ...base,
      score: null,
      band: null,
      headline: "Não deu para medir",
      summary: ["Não encontrei habilidades técnicas nesta vaga. Selecione só a descrição da vaga e tente de novo."],
      breakdown: [],
      skills: { required: [], context: [], nice: [] },
      suggestions: [],
      notes,
    };
  }
  const breakdown = buildBreakdown(core, nice, job, resume);
  const score = Math.max(0, Math.min(100, breakdown.reduce((sum, item) => sum + item.points, 0)));
  const band = bandOf(score);
  return {
    ...base,
    score,
    band,
    headline: BAND_HEADLINE[band],
    summary: buildSummary(core, nice, job, breakdown),
    breakdown,
    skills: {
      required: core.filter((r) => r.importance === "required"),
      context: core.filter((r) => r.importance === "context"),
      nice,
    },
    suggestions: buildSuggestions(job, resume, core, nice),
    notes,
  };
}

export function analyze(jobText: string, resumeText: string, options: AnalyzeOptions = {}): Analysis {
  return analyzeParsed(parseJob(jobText), parseResume(resumeText, options.today ?? new Date()));
}
