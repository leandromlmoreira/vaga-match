import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { SAMPLE_RESUME } from "../src/samples";
import { startJobServer } from "./support/job-server";

const BUILT = resolve(import.meta.dirname, "../dist/extension");

let context: BrowserContext;
let extensionId: string;
let server: Server;
let port: number;
let workdir: string;

test.beforeAll(async () => {
  ({ server, port } = await startJobServer());
  workdir = mkdtempSync(join(tmpdir(), "vaga-match-e2e-"));
  const extensionDir = join(workdir, "extension");
  cpSync(BUILT, extensionDir, { recursive: true });
  const manifestPath = join(extensionDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  manifest.host_permissions = ["http://127.0.0.1/*", "http://www.vagas.com.br/*", "http://www.linkedin.com/*"];
  writeFileSync(manifestPath, JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(join(workdir, "profile"), {
    channel: process.env.VM_E2E_CHANNEL ?? "chromium",
    headless: true,
    viewport: { width: 1280, height: 800 },
    colorScheme: process.env.VM_E2E_SCHEME === "dark" ? "dark" : "light",
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`, `--host-resolver-rules=MAP www.vagas.com.br 127.0.0.1, MAP www.linkedin.com 127.0.0.1`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  extensionId = new URL(worker.url()).host;
  await expect
    .poll(() => context.pages().some((page) => page.url().endsWith("/options.html")), { timeout: 30_000, message: "a página do currículo abre sozinha na instalação" })
    .toBe(true);
  await closeAllBut();
});

test.afterAll(async () => {
  await context?.close();
  server?.close();
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

async function openPopup(): Promise<Page> {
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 600 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return popup;
}

async function openJob(path: string, host = "127.0.0.1"): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`http://${host}:${port}${path}`);
  await page.bringToFront();
  return page;
}

async function seedResume(): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate(async (text) => chrome.storage.local.set({ resume: { text, updatedAt: Date.now() } }), SAMPLE_RESUME);
  await page.close();
}

async function closeAllBut(keep: Page[] = []): Promise<void> {
  for (const page of context.pages()) if (!keep.includes(page)) await page.close();
}

test("sem currículo salvo, o popup pede o currículo", async () => {
  await openJob("/vagas/v1", "www.vagas.com.br");
  const popup = await openPopup();
  await expect(popup.getByRole("heading", { name: "Primeiro, o seu currículo" })).toBeVisible();
  await expect(popup.getByTestId("add-resume")).toBeVisible();
  await popup.screenshot({ path: test.info().outputPath("popup-vazio.png") });
  await closeAllBut();
});

test("salva o currículo na página de opções", async () => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.getByRole("heading", { name: /Seu currículo fica aqui/ })).toBeVisible();
  await options.getByTestId("resume-text").fill(SAMPLE_RESUME);
  await expect(options.getByText(/Reconheci \d+ habilidades/)).toBeVisible();
  await options.getByTestId("save-resume").click();
  await expect(options.getByRole("status").filter({ hasText: "Salvo neste navegador" })).toBeVisible();
  const stored = await options.evaluate(async () => (await chrome.storage.local.get("resume")) as { resume?: { text: string } });
  expect(stored.resume?.text).toContain("Marina Duarte Costa");
  await options.screenshot({ path: test.info().outputPath("opcoes.png"), fullPage: true });
  await closeAllBut();
});

test("analisa uma vaga no Vagas.com", async () => {
  await seedResume();
  const job = await openJob("/vagas/v1", "www.vagas.com.br");
  const popup = await openPopup();
  await expect(popup.getByTestId("score")).toHaveText("86", { timeout: 10_000 });
  await expect(popup.getByTestId("headline")).toHaveText("Aderência forte");
  await expect(popup.getByText("Descrição da vaga · Vagas.com")).toBeVisible();
  const required = popup.locator(".vm-group").filter({ hasText: "Obrigatórias" });
  await expect(required.locator(".vm-chip[data-status='tem']").filter({ hasText: "PostgreSQL" })).toBeVisible();
  const nice = popup.locator(".vm-group").filter({ hasText: "Diferenciais" });
  await expect(nice.locator(".vm-chip[data-status='falta']").filter({ hasText: "Kubernetes" })).toBeVisible();
  await expect(popup.getByText("Escreva “PostgreSQL”, como na vaga")).toBeVisible();
  await expect(popup.locator(".vm-facts")).toContainText("Híbrido");
  await expect(job.getByRole("button", { name: "Candidatar-se" })).toBeVisible();
  await popup.screenshot({ path: test.info().outputPath("popup-vagas.png") });
  await closeAllBut();
});

test("analisa uma vaga no LinkedIn e ignora a lista lateral", async () => {
  await seedResume();
  await openJob("/jobs/view/1", "www.linkedin.com");
  const popup = await openPopup();
  await expect(popup.getByText("Descrição da vaga · LinkedIn Vagas")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByTestId("headline")).toHaveText("Aderência baixa");
  await expect(popup.locator(".vm-result")).not.toContainText("Kotlin");
  await expect(popup.locator(".vm-facts")).toContainText("Remoto");
  await expect(popup.locator(".vm-facts")).toContainText("fluente");
  await popup.screenshot({ path: test.info().outputPath("popup-linkedin.png") });
  await closeAllBut();
});

test("em site genérico, lê só o texto selecionado", async () => {
  await seedResume();
  const job = await openJob("/carreiras/dados");
  await job.evaluate(() => {
    const section = document.querySelector("#vaga");
    const selection = window.getSelection();
    if (!section || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(section);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  const popup = await openPopup();
  await expect(popup.getByText("Texto selecionado · 127.0.0.1")).toBeVisible({ timeout: 10_000 });
  await expect(popup.locator(".vm-result")).not.toContainText("Kubernetes");
  await expect(popup.locator(".vm-facts")).toContainText("Presencial");
  const score = Number(await popup.getByTestId("score").getAttribute("data-value"));
  expect(score).toBeGreaterThan(30);
  expect(score).toBeLessThan(70);
  await closeAllBut();
});

test("sem seleção num site genérico, lê a página e avisa", async () => {
  await seedResume();
  await openJob("/carreiras/dados");
  const popup = await openPopup();
  await expect(popup.getByText(/Li a página inteira/)).toBeVisible({ timeout: 10_000 });
  await closeAllBut();
});

test("página sem vaga mostra como resolver", async () => {
  await seedResume();
  await openJob("/vazia");
  const popup = await openPopup();
  await expect(popup.getByRole("heading", { name: "Não achei o texto da vaga" })).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  await popup.screenshot({ path: test.info().outputPath("popup-erro.png") });
  await closeAllBut();
});

test("apagar o currículo exige dois cliques", async () => {
  await seedResume();
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const remove = options.getByTestId("delete-resume");
  await remove.click();
  await expect(remove).toHaveText("Clique de novo para apagar");
  await remove.click();
  await expect(options.getByText("Currículo apagado deste navegador.")).toBeVisible();
  const stored = await options.evaluate(async () => chrome.storage.local.get("resume"));
  expect(stored).toEqual({});
  await closeAllBut();
});
