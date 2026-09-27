import type { Analysis, SkillResult, Suggestion } from "../engine/types";
import { diffInline } from "./diff";
import { h, icon, prefersReducedMotion } from "./dom";

const SUGGESTION_TAG: Record<Suggestion["kind"], string> = {
  termo: "Palavra da vaga",
  destaque: "Mostre o uso",
  lacuna: "O que falta",
  impacto: "Resultado",
  idioma: "Idioma",
  nivel: "Experiência",
};

function chip(result: SkillResult): HTMLLIElement {
  const statusText = result.status === "tem" ? "você tem" : result.status === "inferido" ? `deduzido de ${result.via ?? ""}` : "falta no currículo";
  const title = result.status === "inferido" && result.via ? `Deduzido de ${result.via}` : result.jobTerms.length > 1 ? `Na vaga: ${result.jobTerms.join(", ")}` : undefined;
  return h(
    "li",
    { class: "vm-chip", "data-status": result.status, title },
    h("span", { class: "vm-chip__label" }, result.label),
    result.alternatives.length > 0 ? h("span", { class: "vm-chip__aside" }, `ou ${result.alternatives.join(" ou ")}`) : null,
    result.status === "inferido" && result.via ? h("span", { class: "vm-chip__aside" }, `via ${result.via}`) : null,
    h("span", { class: "vm-sr" }, `: ${statusText}`),
  );
}

function skillGroup(title: string, list: readonly SkillResult[], hint: string): HTMLElement | null {
  if (list.length === 0) return null;
  const covered = list.filter((r) => r.status !== "falta").length;
  return h(
    "section",
    { class: "vm-group" },
    h(
      "header",
      { class: "vm-group__head" },
      h("h3", { class: "vm-group__title" }, title),
      h("span", { class: "vm-group__count", "aria-label": `${covered} de ${list.length}` }, `${covered}/${list.length}`),
    ),
    h("p", { class: "vm-group__hint" }, hint),
    h("ul", { class: "vm-chips" }, list.map(chip)),
  );
}

function ruler(analysis: Analysis): HTMLElement {
  const label = analysis.breakdown.map((b) => `${b.label}: ${b.points} de ${b.max}`).join("; ");
  return h(
    "div",
    { class: "vm-ruler", role: "img", "aria-label": label },
    analysis.breakdown.map((item) =>
      h(
        "span",
        { class: "vm-ruler__seg", "data-id": item.id, style: `flex-grow:${item.max}` },
        h("span", { class: "vm-ruler__fill", style: `--fill:${item.max === 0 ? 0 : item.points / item.max}` }),
      ),
    ),
  );
}

function breakdownList(analysis: Analysis): HTMLElement {
  return h(
    "dl",
    { class: "vm-breakdown" },
    analysis.breakdown.map((item) =>
      h(
        "div",
        { class: "vm-breakdown__row", "data-id": item.id },
        h("dt", {}, h("span", { class: "vm-breakdown__key", "aria-hidden": "true" }), item.label),
        h("dd", { class: "vm-breakdown__points" }, h("strong", {}, String(item.points)), `/${item.max}`),
        h("dd", { class: "vm-breakdown__detail" }, item.detail),
      ),
    ),
  );
}

function facts(analysis: Analysis): HTMLElement {
  const rows: [string, string, string | null][] = [];
  const job = analysis.seniority.job;
  const resume = analysis.seniority.resume;
  rows.push(["Nível", job ? job.label : "Não informado", resume ? `Você: ${resume.label}${resume.years !== null ? ` (≈${Math.round(resume.years)} anos)` : ""}` : null]);
  rows.push(["Modelo", analysis.workModel?.label ?? "Não informado", analysis.workModel?.evidence ?? null]);
  rows.push(["Contrato", analysis.contracts.length > 0 ? analysis.contracts.join(" ou ") : "Não informado", null]);
  rows.push(["Salário", analysis.salary ?? "Não informado", null]);
  const english = analysis.english.job;
  rows.push([
    "Inglês",
    english ? `${english.label}${english.importance === "nice" ? " (diferencial)" : ""}` : "Não pedido",
    analysis.english.resume ? `Você: ${analysis.english.resume.label}` : english ? "Você: não informado" : null,
  ]);
  return h(
    "section",
    { class: "vm-facts" },
    h("h3", { class: "vm-section-title" }, "Sobre a vaga"),
    h(
      "dl",
      { class: "vm-facts__list" },
      rows.map(([key, value, aside]) =>
        h("div", { class: "vm-facts__row", "data-empty": value.startsWith("Não") ? "true" : null }, h("dt", {}, key), h("dd", {}, value, aside ? h("span", { class: "vm-facts__aside" }, aside) : null)),
      ),
    ),
  );
}

function copyButton(text: string): HTMLButtonElement {
  const label = h("span", {}, "Copiar");
  const button = h("button", { type: "button", class: "vm-copy", "aria-label": "Copiar texto sugerido" }, icon("copy", 14), label);
  button.addEventListener("click", () => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        label.textContent = "Copiado";
        button.dataset.done = "true";
        window.setTimeout(() => {
          label.textContent = "Copiar";
          delete button.dataset.done;
        }, 1600);
      })
      .catch(() => {
        label.textContent = "Não deu";
      });
  });
  return button;
}

function suggestionItem(suggestion: Suggestion): HTMLLIElement {
  const children: (Node | null)[] = [
    h("p", { class: "vm-sug__tag" }, SUGGESTION_TAG[suggestion.kind]),
    h("p", { class: "vm-sug__title" }, suggestion.title),
    h("p", { class: "vm-sug__body" }, suggestion.body),
  ];
  if (suggestion.before && suggestion.after) {
    const parts = diffInline(suggestion.before, suggestion.after);
    children.push(
      h(
        "div",
        { class: "vm-diff" },
        h("p", { class: "vm-diff__line", "data-side": "antes" }, h("span", { class: "vm-diff__label" }, "Antes"), h("span", { class: "vm-diff__text" }, parts.prefix, parts.removed ? h("del", {}, parts.removed) : null, parts.suffix)),
        h(
          "p",
          { class: "vm-diff__line", "data-side": "depois" },
          h("span", { class: "vm-diff__label" }, "Depois"),
          h("span", { class: "vm-diff__text" }, parts.prefix, parts.added ? h("ins", {}, parts.added) : null, parts.suffix),
        ),
        copyButton(suggestion.after),
      ),
    );
  } else if (suggestion.after) {
    children.push(h("div", { class: "vm-diff" }, h("p", { class: "vm-diff__line", "data-side": "depois" }, h("span", { class: "vm-diff__label" }, "Sugestão"), h("span", { class: "vm-diff__text" }, h("ins", {}, suggestion.after))), copyButton(suggestion.after)));
  }
  return h("li", { class: "vm-sug", "data-kind": suggestion.kind }, children);
}

function animateScore(target: HTMLElement, score: number): void {
  if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
    target.textContent = String(score);
    return;
  }
  const duration = 720;
  const started = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(2, -10 * t);
    target.textContent = String(Math.round(score * (t === 1 ? 1 : eased)));
    if (t < 1) requestAnimationFrame(step);
  };
  target.textContent = "0";
  requestAnimationFrame(step);
}

export interface RenderOptions {
  readonly animate?: boolean;
  readonly sourceLabel?: string | null;
}

export function renderAnalysis(analysis: Analysis, options: RenderOptions = {}): HTMLElement {
  const scoreNumber = h("span", { class: "vm-score__num", "data-testid": "score", "data-value": analysis.score ?? "" }, analysis.score === null ? "?" : String(analysis.score));
  const root = h(
    "article",
    { class: "vm-result", "data-band": analysis.band ?? "vazio", "aria-live": "polite" },
    h(
      "header",
      { class: "vm-score" },
      h("p", { class: "vm-score__figure", "aria-label": analysis.score === null ? "Sem nota" : `Nota ${analysis.score} de 100` }, scoreNumber, analysis.score === null ? null : h("span", { class: "vm-score__of", "aria-hidden": "true" }, "/100")),
      h(
        "div",
        { class: "vm-score__text" },
        h("p", { class: "vm-score__headline", "data-testid": "headline" }, analysis.headline),
        analysis.title ? h("p", { class: "vm-score__title" }, analysis.title) : null,
        options.sourceLabel ? h("p", { class: "vm-score__source" }, options.sourceLabel) : null,
      ),
    ),
    analysis.breakdown.length > 0 ? ruler(analysis) : null,
    h("div", { class: "vm-summary" }, analysis.summary.map((line) => h("p", {}, line))),
    analysis.notes.map((note) => h("p", { class: "vm-note", role: "note" }, note)),
    analysis.breakdown.length > 0
      ? h("details", { class: "vm-why" }, h("summary", {}, "Como a nota foi calculada"), breakdownList(analysis))
      : null,
    h(
      "div",
      { class: "vm-groups" },
      skillGroup("Obrigatórias", analysis.skills.required, "O que a vaga exige."),
      skillGroup("Citadas na descrição", analysis.skills.context, "Aparecem nas atividades ou na stack."),
      skillGroup("Diferenciais", analysis.skills.nice, "Contam pontos extras."),
    ),
    analysis.suggestions.length > 0
      ? h(
          "section",
          { class: "vm-suggestions" },
          h("h3", { class: "vm-section-title" }, "Como ajustar o currículo"),
          h("p", { class: "vm-suggestions__hint" }, "Só com o que você já tem. Nada aqui inventa experiência."),
          h("ol", { class: "vm-sug-list" }, analysis.suggestions.map(suggestionItem)),
        )
      : null,
    facts(analysis),
  );
  if (options.animate && analysis.score !== null) {
    root.classList.add("is-entering");
    animateScore(scoreNumber, analysis.score);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("is-entering")));
  }
  return root;
}

