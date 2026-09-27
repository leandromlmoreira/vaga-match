import "../ui/styles/tokens.css";
import "../ui/styles/result.css";
import "../ui/styles/form.css";
import "./options.css";
import { createResumeForm } from "../ui/resume-form";
import { deleteResume, loadResume, saveResume } from "./storage";

const mount = document.querySelector<HTMLElement>("#form");
const saveButton = document.querySelector<HTMLButtonElement>("#save");
const deleteButton = document.querySelector<HTMLButtonElement>("#delete");
const status = document.querySelector<HTMLElement>("#status");

const timeFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

let savedText = "";
let confirmTimer = 0;

function setStatus(message: string, tone: "ok" | "aviso" | "neutro" = "neutro"): void {
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function refreshButtons(current: string): void {
  if (saveButton) {
    saveButton.disabled = current.trim().length === 0 || current === savedText;
    saveButton.textContent = current === savedText && savedText.length > 0 ? "Salvo" : "Salvar currículo";
  }
  if (deleteButton) deleteButton.hidden = savedText.length === 0;
}

async function init(): Promise<void> {
  if (!mount) return;
  const stored = await loadResume();
  savedText = stored?.text ?? "";
  const form = createResumeForm({
    id: "resume",
    initialText: savedText,
    rows: 16,
    onChange: (text) => {
      refreshButtons(text);
      if (text !== savedText && savedText.length > 0) setStatus("Alterações ainda não salvas.", "aviso");
    },
  });
  mount.append(form.element);
  form.textarea.addEventListener("input", () => refreshButtons(form.getText()));
  refreshButtons(savedText);
  if (stored) setStatus(`Salvo neste navegador em ${timeFormat.format(stored.updatedAt)}.`, "ok");

  saveButton?.addEventListener("click", async () => {
    const text = form.getText().trim();
    if (text.length === 0) return;
    const result = await saveResume(text);
    savedText = result.text;
    form.setText(savedText);
    refreshButtons(savedText);
    setStatus(`Salvo neste navegador em ${timeFormat.format(result.updatedAt)}. Agora é só abrir uma vaga.`, "ok");
  });

  deleteButton?.addEventListener("click", async () => {
    if (deleteButton.dataset.confirm !== "true") {
      deleteButton.dataset.confirm = "true";
      deleteButton.textContent = "Clique de novo para apagar";
      window.clearTimeout(confirmTimer);
      confirmTimer = window.setTimeout(() => {
        delete deleteButton.dataset.confirm;
        deleteButton.textContent = "Apagar currículo";
      }, 4000);
      return;
    }
    window.clearTimeout(confirmTimer);
    await deleteResume();
    savedText = "";
    form.setText("");
    delete deleteButton.dataset.confirm;
    deleteButton.textContent = "Apagar currículo";
    refreshButtons("");
    setStatus("Currículo apagado deste navegador.", "neutro");
  });
}

void init();
