import "../ui/styles/tokens.css";
import "../ui/styles/result.css";
import "../ui/styles/form.css";
import "./site.css";
import { analyze } from "../engine/analyze";
import { skillIdsIn } from "../engine/match";
import { SKILL_BY_ID, SKILLS } from "../engine/skills";
import { SAMPLE_JOBS, SAMPLE_RESUME } from "../samples";
import { clear, h, icon } from "../ui/dom";
import { renderJobText } from "../ui/job-text";
import { renderAnalysis } from "../ui/result-view";
import { createResumeForm } from "../ui/resume-form";

type TabId = string;
const OWN: TabId = "meus";

const stage = document.querySelector<HTMLElement>("#demo");
const tryOwn = document.querySelector<HTMLButtonElement>("#try-own");

const own = { job: "", resume: "" };
let current: TabId = SAMPLE_JOBS[0]?.id ?? OWN;
let ownTimer = 0;

const tabs = [
  ...SAMPLE_JOBS.map((job) => ({ id: job.id, label: job.label, meta: job.source })),
  { id: OWN, label: "Usar os meus", meta: "vaga e currículo" },
];

const tablist = h("div", { class: "st-tabs", role: "tablist", "aria-label": "Escolha uma vaga para testar" });
const sheet = h("section", { class: "st-sheet", id: "demo-sheet", role: "tabpanel", tabindex: "0" });
const panelBody = h("div", { class: "st-panel__body", "data-testid": "demo-result" });
const panel = h(
  "aside",
  { class: "st-panel", "aria-label": "Resultado do Vaga Match" },
  h(
    "header",
    { class: "st-panel__bar" },
    h("p", { class: "st-panel__brand" }, "Vaga ", h("span", {}, "Match")),
    h("p", { class: "st-panel__lock" }, icon("lock", 13), "calculado no seu navegador"),
  ),
  panelBody,
);

function legend(): HTMLElement {
  return h(
    "ul",
    { class: "vm-legend", "aria-label": "Legenda" },
    h("li", {}, h("span", { class: "vm-chip", "data-status": "tem" }, "verde"), "você tem"),
    h("li", {}, h("span", { class: "vm-chip", "data-status": "falta" }, "ondulado"), "falta"),
    h("li", {}, h("span", { class: "vm-chip", "data-status": "inferido" }, "pontilhado"), "deduzido"),
  );
}

function showResult(jobText: string, resumeText: string, sourceLabel: string, animate: boolean): void {
  clear(panelBody);
  panelBody.append(renderAnalysis(analyze(jobText, resumeText), { animate, sourceLabel }));
  panelBody.scrollTop = 0;
}

function showSample(id: string): void {
  const job = SAMPLE_JOBS.find((item) => item.id === id);
  if (!job) return;
  const analysis = analyze(job.text, SAMPLE_RESUME);
  clear(sheet);
  sheet.append(
    h(
      "header",
      { class: "st-sheet__head" },
      h("p", { class: "st-sheet__meta" }, `${job.company} · vaga fictícia no formato ${job.source}`),
      legend(),
    ),
    renderJobText(job.text, analysis.highlights),
    h(
      "details",
      { class: "st-sheet__resume" },
      h("summary", {}, "Ver o currículo usado na comparação"),
      h("pre", { class: "st-sheet__pre" }, SAMPLE_RESUME.trim()),
    ),
  );
  sheet.scrollTop = 0;
  clear(panelBody);
  panelBody.append(renderAnalysis(analysis, { animate: true, sourceLabel: `Descrição da vaga · ${job.source}` }));
  panelBody.scrollTop = 0;
}

function ownEmptyState(): HTMLElement {
  const missing = [own.job.trim().length < 80 ? "a vaga" : null, own.resume.trim().length < 40 ? "o currículo" : null].filter(Boolean);
  return h(
    "section",
    { class: "st-empty" },
    h("p", { class: "st-empty__title" }, "Falta pouco."),
    h("p", { class: "st-empty__body" }, `Cole ${missing.join(" e ")} ao lado. A nota aparece aqui enquanto você digita.`),
  );
}

function updateOwn(animate: boolean): void {
  if (own.job.trim().length < 80 || own.resume.trim().length < 40) {
    clear(panelBody);
    panelBody.append(ownEmptyState());
    return;
  }
  showResult(own.job, own.resume, "Texto colado por você", animate);
}

function scheduleOwn(): void {
  window.clearTimeout(ownTimer);
  ownTimer = window.setTimeout(() => updateOwn(false), 280);
}

function showOwn(): void {
  clear(sheet);
  const jobField = h("textarea", {
    id: "own-job",
    class: "vm-textarea",
    rows: 10,
    placeholder: "Cole aqui o texto da vaga, do título até os benefícios.",
    "data-testid": "own-job",
  });
  jobField.value = own.job;
  jobField.addEventListener("input", () => {
    own.job = jobField.value;
    scheduleOwn();
  });
  const form = createResumeForm({
    id: "own-resume",
    initialText: own.resume,
    rows: 8,
    onChange: (text) => {
      own.resume = text;
      scheduleOwn();
    },
  });
  const useSample = h("button", { type: "button", class: "st-link" }, "usar o currículo de exemplo");
  useSample.addEventListener("click", () => {
    own.resume = SAMPLE_RESUME;
    form.setText(SAMPLE_RESUME);
    updateOwn(true);
  });
  sheet.append(
    h(
      "div",
      { class: "st-own" },
      h("p", { class: "st-own__note" }, icon("lock", 14), h("span", {}, "O que você colar fica só nesta aba. Recarregou, sumiu.")),
      h("div", { class: "vm-field" }, h("label", { class: "vm-label", for: "own-job" }, "Texto da vaga"), jobField),
      h("div", { class: "st-own__resume-head" }, h("p", { class: "vm-label" }, "Seu currículo"), h("p", { class: "vm-help" }, "Sem currículo à mão? ", useSample, ".")),
      form.element,
    ),
  );
  updateOwn(true);
}

function select(id: TabId, focusTab = false): void {
  current = id;
  for (const button of tablist.querySelectorAll<HTMLButtonElement>("[role='tab']")) {
    const active = button.dataset.id === id;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focusTab) button.focus();
  }
  sheet.setAttribute("aria-labelledby", `tab-${id}`);
  stage?.setAttribute("data-mode", id === OWN ? "own" : "sample");
  if (id === OWN) showOwn();
  else showSample(id);
}

function buildTabs(): void {
  for (const tab of tabs) {
    const button = h(
      "button",
      { type: "button", role: "tab", id: `tab-${tab.id}`, class: "st-tab", "data-id": tab.id, "aria-controls": "demo-sheet", "aria-selected": "false", tabindex: "-1" },
      h("span", { class: "st-tab__label" }, tab.label),
      h("span", { class: "st-tab__meta" }, tab.meta),
    );
    button.addEventListener("click", () => select(tab.id));
    tablist.append(button);
  }
  tablist.addEventListener("keydown", (event) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === current);
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const target = tabs[next];
    if (target) select(target.id, true);
  });
}

const PAIRS: readonly (readonly [string, readonly string[]])[] = [
  ["postgresql", ["Postgres", "psql", "PostgreSQL"]],
  ["javascript", ["JS", "ES6", "JavaScript"]],
  ["kubernetes", ["k8s", "Helm", "Kubernetes"]],
  ["nodejs", ["Node", "NodeJS", "Node.js"]],
  ["cicd", ["integração contínua", "CI-CD", "CI/CD"]],
  ["microservices", ["micro-serviços", "microservices", "Microsserviços"]],
  ["ml", ["aprendizado de máquina", "ML", "Machine learning"]],
];

function renderPairs(): void {
  const target = document.querySelector("#pairs");
  if (!target) return;
  for (const [id, variants] of PAIRS) {
    const valid = variants.filter((variant) => skillIdsIn(variant).has(id));
    const label = SKILL_BY_ID.get(id)?.label ?? id;
    target.append(h("div", {}, h("dt", {}, valid.filter((variant) => variant !== label).join(", ")), h("dd", {}, label)));
  }
  const count = document.querySelector("#count");
  if (count) {
    const aliases = SKILLS.reduce((sum, skill) => sum + skill.aliases.length + (skill.cased?.length ?? 0), 0);
    count.textContent = `${SKILLS.length} habilidades de tecnologia e ${aliases} jeitos de escrevê-las, em português e em inglês.`;
  }
}

if (stage) {
  stage.append(tablist, h("div", { class: "st-stage__body" }, sheet, panel));
  buildTabs();
  select(current);
}

tryOwn?.addEventListener("click", () => {
  select(OWN);
  stage?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => document.querySelector<HTMLTextAreaElement>("#own-job")?.focus({ preventScroll: true }), 350);
});

renderPairs();
