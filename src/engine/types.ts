import type { Importance, WorkModel } from "./job";
import type { EnglishInfo } from "./language";
import type { LevelInfo } from "./seniority";
import type { SkillCategory } from "./skills";

export type MatchStatus = "tem" | "inferido" | "falta";

export interface SkillResult {
  readonly id: string;
  readonly label: string;
  readonly category: SkillCategory;
  readonly importance: Importance;
  readonly status: MatchStatus;
  readonly jobTerms: readonly string[];
  readonly resumeTerms: readonly string[];
  readonly via: string | null;
  readonly inBullets: boolean;
  readonly alternatives: readonly string[];
  readonly memberIds: readonly string[];
}

export type BreakdownId = "obrigatorias" | "desejaveis" | "senioridade" | "idioma";

export interface BreakdownItem {
  readonly id: BreakdownId;
  readonly label: string;
  readonly points: number;
  readonly max: number;
  readonly detail: string;
}

export type Band = "forte" | "boa" | "parcial" | "baixa";

export type SuggestionKind = "termo" | "destaque" | "lacuna" | "impacto" | "idioma" | "nivel";

export interface Suggestion {
  readonly kind: SuggestionKind;
  readonly title: string;
  readonly body: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly skills: readonly string[];
}

export interface HighlightSpan {
  readonly start: number;
  readonly end: number;
  readonly skillId: string;
  readonly status: MatchStatus;
  readonly importance: Importance;
}

export interface Analysis {
  readonly score: number | null;
  readonly band: Band | null;
  readonly headline: string;
  readonly summary: readonly string[];
  readonly breakdown: readonly BreakdownItem[];
  readonly skills: {
    readonly required: readonly SkillResult[];
    readonly context: readonly SkillResult[];
    readonly nice: readonly SkillResult[];
  };
  readonly title: string | null;
  readonly seniority: { readonly job: LevelInfo | null; readonly resume: LevelInfo | null };
  readonly workModel: { readonly value: WorkModel; readonly label: string; readonly evidence: string } | null;
  readonly contracts: readonly string[];
  readonly salary: string | null;
  readonly english: { readonly job: (EnglishInfo & { readonly importance: Importance }) | null; readonly resume: EnglishInfo | null };
  readonly suggestions: readonly Suggestion[];
  readonly highlights: readonly HighlightSpan[];
  readonly notes: readonly string[];
}
