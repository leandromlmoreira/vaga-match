import "../ui/styles/tokens.css";
import "../ui/styles/result.css";
import "./popup.css";
import { analyze } from "../engine/analyze";
import { clear, h, icon } from "../ui/dom";
import { renderAnalysis } from "../ui/result-view";
import { extractJobFromPage, type PageExtraction } from "./extract-page";
import { loadResume } from "./storage";

const MIN_JOB_CHARS = 120;

const main = document.querySelector<HTMLElement>("#main");
const refreshButton = document.querySelector<HTMLButtonElement>("#refresh");
const resumeButton = document.querySelector<HTMLButtonElement>("#resume");

function openOptions(): void {
  void chrome.runtime.openOptionsPage();
}

function show(...nodes: Node[]): void {
  if (!main) return;
  clear(main);
  main.append(...nodes);
  main.scrollTop = 0;
}

function stateView(kind: "vazio" | "erro" | "carregando", title: string, body: string, action?: HTMLElement): HTMLElement {
  return h(
    "section",
    { class: "pp-state", "data-kind": kind, role: kind === "erro" ? "alert" : "status" },
    kind === "carregando" ? h("div", { class: "pp-state__bar", "aria-hidden": "true" }, h("span", {})) : null,
    h("h2", { class: "pp-state__title" }, title),
    h("p", { class: "pp-state__body" }, body),
    action ?? null,
  );
}

function sourceLabel(extraction: PageExtraction): string {
  if (extraction.source === "selecao") return `Texto selecionado · ${extraction.siteLabel}`;
  if (extraction.source === "vaga") return `Descrição da vaga · ${extraction.siteLabel}`;
  return `Página inteira · ${extraction.siteLabel}`;
}

async function targetTab(): Promise<chrome.tabs.Tab | undefined> {
  const self = await chrome.tabs.getCurrent();
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (active && active.id !== self?.id) return active;
  const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
  return tabs
    .filter((tab) => tab.id !== self?.id && !(tab.url ?? "").startsWith("chrome"))
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
}

async function readPage(tabId: number): Promise<PageExtraction | null> {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: extractJobFromPage });
  return (injection?.result as PageExtraction | undefined) ?? null;
}

async function run(): Promise<void> {
  if (refreshButton) refreshButton.disabled = true;
  try {
    const resume = await loadResume();
    if (!resume) {
      show(
        stateView(
          "vazio",
          "Primeiro, o seu currículo",
          "Envie o PDF ou cole o texto uma vez. Ele fica guardado só neste navegador, e daí é só abrir uma vaga e clicar aqui.",
          h("button", { type: "button", class: "vm-button", onclick: openOptions, "data-testid": "add-resume" }, icon("upload", 16), "Adicionar currículo"),
        ),
      );
      return;
    }
    show(stateView("carregando", "Lendo a vaga desta aba…", "Só o texto da página aberta, só agora."));
    const tab = await targetTab();
    if (tab?.id === undefined) {
      show(stateView("erro", "Nenhuma aba para ler", "Abra a página de uma vaga e clique no ícone de novo."));
      return;
    }
    let extraction: PageExtraction | null;
    try {
      extraction = await readPage(tab.id);
    } catch {
      show(
        stateView(
          "erro",
          "Não consigo ler esta página",
          "O Chrome não deixa extensões lerem páginas internas, a loja de extensões e alguns PDFs. Abra a vaga num site comum, ou cole o texto no site de demonstração.",
        ),
      );
      return;
    }
    if (!extraction || extraction.text.trim().length < MIN_JOB_CHARS) {
      show(
        stateView(
          "erro",
          "Não achei o texto da vaga",
          "Selecione a descrição da vaga com o mouse e clique no ícone de novo. Assim eu leio só o trecho certo.",
          h("button", { type: "button", class: "vm-button", "data-variant": "ghost", onclick: () => void run() }, icon("refresh", 16), "Tentar de novo"),
        ),
      );
      return;
    }
    const analysis = analyze(extraction.text, resume.text);
    const nodes: Node[] = [];
    if (extraction.source === "pagina") {
      nodes.push(h("p", { class: "pp-hint", role: "note" }, "Li a página inteira. Para uma nota mais precisa, selecione só a descrição da vaga e clique em Analisar de novo."));
    }
    nodes.push(renderAnalysis(analysis, { animate: true, sourceLabel: sourceLabel(extraction) }));
    show(...nodes);
  } finally {
    if (refreshButton) refreshButton.disabled = false;
  }
}

refreshButton?.addEventListener("click", () => void run());
resumeButton?.addEventListener("click", openOptions);
void run();
