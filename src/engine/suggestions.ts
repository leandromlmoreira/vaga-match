import type { ParsedJob } from "./job";
import type { Bullet, ParsedResume } from "./resume";
import { SKILL_BY_ID } from "./skills";
import { compactKey, fold, joinList, stripBullet } from "./text";
import type { SkillResult, Suggestion } from "./types";

const SYNONYMS: Record<string, readonly string[]> = {
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  python: ["python", "python3", "python 3"],
  csharp: ["c#", "csharp", "c sharp"],
  go: ["go", "golang", "go lang"],
  postgresql: ["postgresql", "postgres", "pgsql"],
  sqlserver: ["sql server", "sqlserver", "mssql", "ms sql"],
  mongodb: ["mongodb", "mongo"],
  kubernetes: ["kubernetes", "k8s"],
  nodejs: ["node.js", "nodejs", "node", "node js"],
  react: ["react", "reactjs", "react.js", "react js"],
  "react-native": ["react native", "react-native"],
  vue: ["vue", "vue.js", "vuejs", "vue js"],
  nextjs: ["next.js", "nextjs", "next js"],
  nuxt: ["nuxt", "nuxt.js", "nuxtjs"],
  nestjs: ["nestjs", "nest.js", "nest js"],
  dotnet: [".net", "dotnet"],
  spring: ["spring boot", "springboot"],
  cicd: ["ci/cd", "ci cd", "ci-cd", "cicd", "integracao continua", "continuous integration"],
  rest: ["rest", "restful", "api rest", "apis rest", "rest api", "rest apis", "apis restful", "api restful"],
  microservices: ["microsservicos", "microservicos", "microservices", "micro servicos"],
  aws: ["aws", "amazon web services"],
  gcp: ["gcp", "google cloud", "google cloud platform"],
  azure: ["azure", "microsoft azure"],
  tests: ["testes automatizados", "automated tests", "automated testing", "testes automatizado"],
  tdd: ["tdd", "test driven development", "test-driven development"],
  ml: ["machine learning", "aprendizado de maquina", "ml"],
  llm: ["ia generativa", "generative ai", "genai", "llm", "llms"],
  agile: ["metodologias ageis", "metodos ageis", "agile"],
  "code-review": ["code review", "code reviews", "revisao de codigo", "revisoes de codigo"],
  ddd: ["ddd", "domain driven design", "domain-driven design"],
  observability: ["observabilidade", "observability"],
  iac: ["infraestrutura como codigo", "infrastructure as code", "iac"],
  elasticsearch: ["elasticsearch", "elastic search"],
  a11y: ["acessibilidade", "accessibility", "a11y"],
  tailwind: ["tailwind", "tailwindcss", "tailwind css"],
  graphql: ["graphql"],
  "github-actions": ["github actions"],
  bi: ["power bi", "powerbi"],
  "deep-learning": ["deep learning"],
  etl: ["etl", "elt"],
  mentoring: ["mentoria", "mentoring"],
  "system-design": ["system design", "arquitetura de sistemas", "arquitetura de software", "software architecture"],
};

const MAX_SUGGESTIONS = 6;

function spelling(term: string): string {
  return fold(term).replace(/[\s-]+/g, " ").trim();
}

function singularKey(term: string): string {
  return spelling(term)
    .split(" ")
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
    .join("")
    .replace(/[./_]/g, "");
}

function isSynonym(skillId: string, term: string): boolean {
  return SYNONYMS[skillId]?.includes(spelling(term)) ?? false;
}

function preferredJobTerm(result: SkillResult): string | null {
  const label = SKILL_BY_ID.get(result.id)?.label ?? result.label;
  const candidates = result.jobTerms.filter((term) => isSynonym(result.id, term));
  const canonical = candidates.find((term) => compactKey(term) === compactKey(label));
  return canonical ?? candidates.sort((a, b) => b.length - a.length)[0] ?? null;
}

function lineContaining(text: string, start: number, end: number): { text: string; start: number } {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEndRaw = text.indexOf("\n", end);
  const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
  return { text: text.slice(lineStart, lineEnd), start: lineStart };
}

function termSuggestion(result: SkillResult, resume: ParsedResume): Suggestion | null {
  if (result.status !== "tem") return null;
  const jobTerm = preferredJobTerm(result);
  if (!jobTerm) return null;
  const jobKey = singularKey(jobTerm);
  const resumeMentions = resume.mentions.filter((m) => m.skillId === result.id);
  if (resumeMentions.some((m) => singularKey(m.term) === jobKey)) return null;
  const replaceable = resumeMentions.filter((m) => isSynonym(result.id, m.term));
  const target = replaceable.find((m) => resume.bullets.some((b) => m.start >= b.start && m.end <= b.end)) ?? replaceable[0];
  if (!target) return null;
  if (jobTerm.length < target.term.trim().length && compactKey(jobTerm) !== compactKey(result.label)) return null;
  const line = lineContaining(resume.text, target.start, target.end);
  const relStart = target.start - line.start;
  const relEnd = target.end - line.start;
  const before = stripBullet(line.text);
  const after = stripBullet(`${line.text.slice(0, relStart)}${jobTerm}${line.text.slice(relEnd)}`);
  return {
    kind: "termo",
    title: `Escreva “${jobTerm}”, como na vaga`,
    body: `Você escreveu “${target.term.trim()}”. É a mesma coisa, mas filtros de triagem costumam buscar a palavra exata da vaga.`,
    before,
    after,
    skills: [result.id],
  };
}

function bulletAffinity(bullet: Bullet, result: SkillResult, jobSkillIds: ReadonlySet<string>): number {
  const category = result.category;
  let score = 0;
  for (const id of bullet.skills) {
    if (SKILL_BY_ID.get(id)?.category === category) score += 2;
    if (jobSkillIds.has(id)) score += 1;
  }
  return score;
}

function withTools(bulletText: string, tools: readonly string[]): string {
  const trimmed = bulletText.replace(/\s+/g, " ").trim();
  const match = /^(.*?)([.;!]?)$/.exec(trimmed);
  const body = match?.[1] ?? trimmed;
  const ending = match?.[2] || ".";
  return `${body}, usando ${joinList(tools)}${ending}`;
}

function resumeTermFor(result: SkillResult, resume: ParsedResume): string {
  const jobTerm = preferredJobTerm(result);
  const own = resume.skills.get(result.id)?.terms ?? [];
  if (jobTerm && own.some((term) => isSynonym(result.id, term))) return jobTerm;
  return own[0] ?? result.label;
}

function evidenceSuggestions(results: readonly SkillResult[], resume: ParsedResume, job: ParsedJob): Suggestion[] {
  const hidden = results.filter((r) => r.status === "tem" && !r.inBullets && r.importance !== "nice" && r.category !== "ferramenta" && r.category !== "idioma");
  if (hidden.length === 0) return [];
  const jobSkillIds = new Set(job.skills.map((s) => s.id));
  if (resume.bullets.length === 0) {
    const names = hidden.slice(0, 4).map((r) => resumeTermFor(r, resume));
    return [{
      kind: "destaque",
      title: `Mostre onde você usou ${joinList(names)}`,
      body: "Não encontrei tópicos de experiência no seu currículo. Descreva o que você fez em cada trabalho ou projeto, citando as ferramentas que usou de verdade.",
      before: null,
      after: null,
      skills: hidden.map((r) => r.id),
    }];
  }
  const groups = new Map<Bullet, SkillResult[]>();
  for (const result of hidden.slice(0, 4)) {
    const ranked = resume.bullets
      .map((bullet) => ({ bullet, score: bulletAffinity(bullet, result, jobSkillIds) }))
      .sort((a, b) => b.score - a.score);
    const slot = ranked.find((entry) => (groups.get(entry.bullet)?.length ?? 0) < 2);
    if (!slot) continue;
    groups.set(slot.bullet, [...(groups.get(slot.bullet) ?? []), result]);
  }
  return [...groups.entries()].slice(0, 2).map(([bullet, list]) => {
    const names = list.map((r) => resumeTermFor(r, resume));
    return {
      kind: "destaque" as const,
      title: `Mostre onde você usou ${joinList(names)}`,
      body: `${joinList(names)} ${names.length > 1 ? "aparecem" : "aparece"} só na lista de habilidades. Se você usou nesta experiência, diga no próprio tópico. Se não usou, escolha o tópico certo.`,
      before: bullet.text.replace(/\s+/g, " ").trim(),
      after: withTools(bullet.text, names),
      skills: list.map((r) => r.id),
    };
  });
}

function gapSuggestion(results: readonly SkillResult[]): Suggestion | null {
  const missing = results.filter((r) => r.status === "falta" && r.importance === "required");
  if (missing.length === 0) return null;
  const names = missing.map((r) => (r.label.includes(" ou ") ? r.label : r.jobTerms[0] ?? r.label));
  const plural = names.length > 1;
  return {
    kind: "lacuna",
    title: plural ? `${names.length} obrigatórios que não estão no currículo` : `${names[0] ?? ""} é obrigatório e não está no currículo`,
    body: `${plural ? `Faltam ${joinList(names)}. ` : ""}Se você já usou em curso, projeto pessoal ou freela, inclua com o nome que a vaga usa. Se não usou, não invente: deixe de fora e conte na entrevista o que já está estudando.`,
    before: null,
    after: null,
    skills: missing.map((r) => r.id),
  };
}

function impactSuggestion(resume: ParsedResume, job: ParsedJob): Suggestion | null {
  const jobSkillIds = new Set(job.skills.map((s) => s.id));
  const candidates = resume.bullets
    .filter((b) => !b.hasNumber)
    .map((bullet) => ({ bullet, score: bullet.skills.filter((id) => jobSkillIds.has(id)).length }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score === 0) return null;
  const text = best.bullet.text.replace(/\s+/g, " ").trim().replace(/[.;!]$/, "");
  return {
    kind: "impacto",
    title: "Coloque um número neste tópico",
    body: "É o tópico mais ligado à vaga e não tem nenhum resultado medido. Se você tiver o dado, diga quanto mudou: tempo, volume, erros ou dinheiro.",
    before: best.bullet.text.replace(/\s+/g, " ").trim(),
    after: `${text}, [resultado com número: ex. tempo de resposta caiu de X para Y].`,
    skills: best.bullet.skills.filter((id) => jobSkillIds.has(id)),
  };
}

function englishSuggestion(job: ParsedJob, resume: ParsedResume): Suggestion | null {
  const wanted = job.english;
  if (!wanted || wanted.importance === "nice" || resume.english) return null;
  return {
    kind: "idioma",
    title: "Deixe o inglês visível",
    body: `A vaga pede inglês ${wanted.label} e o seu currículo não fala de idiomas. Se você tem esse nível, diga numa linha própria.`,
    before: null,
    after: `Inglês: ${wanted.label}`,
    skills: [],
  };
}

function levelSuggestion(job: ParsedJob, resume: ParsedResume): Suggestion | null {
  if (!job.level || resume.level) return null;
  return {
    kind: "nivel",
    title: "Deixe claro o seu tempo de experiência",
    body: "Não achei datas nem nível no seu currículo, então não deu para comparar com o que a vaga pede. Coloque mês e ano de início e fim em cada experiência.",
    before: null,
    after: "Desenvolvedor(a) Back-end · mar/2022 - atual",
    skills: [],
  };
}

export function buildSuggestions(job: ParsedJob, resume: ParsedResume, core: readonly SkillResult[], nice: readonly SkillResult[]): Suggestion[] {
  const ordered = [...core.filter((r) => r.importance === "required"), ...core.filter((r) => r.importance !== "required"), ...nice];
  const terms = ordered.map((r) => termSuggestion(r, resume)).filter((s): s is Suggestion => s !== null).slice(0, 2);
  const list: Suggestion[] = [
    ...terms,
    ...evidenceSuggestions(ordered, resume, job),
    ...[gapSuggestion(core), englishSuggestion(job, resume), levelSuggestion(job, resume), impactSuggestion(resume, job)].filter(
      (s): s is Suggestion => s !== null,
    ),
  ];
  return list.slice(0, MAX_SUGGESTIONS);
}
