import { parseResume } from "../engine/resume";
import { SKILL_BY_ID } from "../engine/skills";
import { clear, h, icon } from "./dom";
import { isPdf, readResumeFile } from "./pdf";

export interface ResumeFormOptions {
  readonly id: string;
  readonly initialText?: string;
  readonly onChange?: (text: string) => void;
  readonly rows?: number;
}

export interface ResumeForm {
  readonly element: HTMLElement;
  readonly textarea: HTMLTextAreaElement;
  getText(): string;
  setText(text: string): void;
}

const ACCEPT = ".pdf,.txt,.md,application/pdf,text/plain,text/markdown";
const MAX_BYTES = 8 * 1024 * 1024;

function renderDetected(target: HTMLElement, text: string): void {
  clear(target);
  if (text.trim().length === 0) {
    target.append(h("p", { class: "vm-detected__empty" }, "Quando o texto chegar, eu mostro aqui o que reconheci."));
    return;
  }
  const resume = parseResume(text);
  const labels = [...resume.skills.keys()].map((id) => SKILL_BY_ID.get(id)?.label ?? id);
  const facts = [
    resume.level ? `Nível: ${resume.level.label}` : "Nível: não identificado",
    resume.english ? `Inglês: ${resume.english.label}` : "Inglês: não informado",
    `${resume.bullets.length} ${resume.bullets.length === 1 ? "tópico" : "tópicos"} de experiência`,
  ];
  target.append(h("p", { class: "vm-detected__head" }, labels.length === 0 ? "Não reconheci nenhuma habilidade técnica ainda." : `Reconheci ${labels.length} ${labels.length === 1 ? "habilidade" : "habilidades"}`));
  if (labels.length > 0) {
    target.append(h("ul", { class: "vm-chips vm-chips--quiet" }, labels.map((label) => h("li", { class: "vm-chip", "data-status": "tem" }, h("span", { class: "vm-chip__label" }, label)))));
  }
  target.append(h("p", { class: "vm-detected__facts" }, facts.join(" · ")));
}

export function createResumeForm(options: ResumeFormOptions): ResumeForm {
  const fileInput = h("input", { type: "file", accept: ACCEPT, class: "vm-visually-hidden", id: `${options.id}-file`, "data-testid": "resume-file" });
  const status = h("span", { class: "vm-drop__status", role: "status" });
  const drop = h(
    "label",
    { class: "vm-drop", for: `${options.id}-file`, "data-state": "idle" },
    fileInput,
    h("span", { class: "vm-drop__icon" }, icon("upload", 20)),
    h("span", { class: "vm-drop__text" }, h("strong", {}, "Solte o PDF do currículo aqui"), h("span", {}, "ou clique para escolher. Também aceita .txt")),
    status,
  );
  const textarea = h("textarea", {
    id: `${options.id}-text`,
    class: "vm-textarea",
    rows: options.rows ?? 12,
    spellcheck: "false",
    placeholder: "Ou cole aqui o texto do currículo.",
    "data-testid": "resume-text",
  });
  textarea.value = options.initialText ?? "";
  const detected = h("div", { class: "vm-detected", "aria-live": "polite" });
  renderDetected(detected, textarea.value);

  let timer = 0;
  const changed = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      renderDetected(detected, textarea.value);
      options.onChange?.(textarea.value);
    }, 160);
  };
  textarea.addEventListener("input", changed);

  const setState = (state: "idle" | "over" | "loading" | "error" | "done", message = "") => {
    drop.dataset.state = state;
    status.textContent = message;
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setState("error", "Arquivo grande demais. O limite é 8 MB.");
      return;
    }
    setState("loading", isPdf(file) ? `Lendo ${file.name}…` : `Abrindo ${file.name}…`);
    try {
      const text = await readResumeFile(file);
      if (text.trim().length < 40) {
        setState("error", "Não achei texto nesse arquivo. Se for um PDF escaneado (imagem), cole o texto abaixo.");
        return;
      }
      textarea.value = text;
      renderDetected(detected, text);
      options.onChange?.(text);
      setState("done", `Texto lido de ${file.name}. Confira abaixo.`);
    } catch {
      setState("error", "Não consegui ler esse arquivo. Tente outro PDF ou cole o texto abaixo.");
    } finally {
      fileInput.value = "";
    }
  };

  fileInput.addEventListener("change", () => void handleFile(fileInput.files?.[0]));
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (drop.dataset.state !== "loading") setState("over", "Pode soltar.");
  });
  drop.addEventListener("dragleave", () => {
    if (drop.dataset.state === "over") setState("idle");
  });
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    void handleFile(event.dataTransfer?.files[0]);
  });

  const element = h(
    "div",
    { class: "vm-resume" },
    drop,
    h("div", { class: "vm-field" }, h("label", { class: "vm-label", for: textarea.id }, "Texto do currículo"), h("p", { class: "vm-help" }, "Confira o que foi lido. Pode editar à vontade."), textarea),
    detected,
  );

  return {
    element,
    textarea,
    getText: () => textarea.value,
    setText: (text: string) => {
      textarea.value = text;
      renderDetected(detected, text);
    },
  };
}
