import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_JOBS, SAMPLE_RESUME } from "../src/samples";

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

const result = (page: Page) => page.getByTestId("demo-result");

test("abre com a vaga de exemplo já analisada e sem erros", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("lido contra a vaga");
  await expect(result(page).getByTestId("score")).toHaveAttribute("data-value", "86");
  await expect(result(page).getByTestId("score")).toHaveText("86");
  await expect(page.getByRole("tab", { name: /Back-end Pleno/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".vm-jobtext mark[data-status='tem']").first()).toBeVisible();
  await expect(page.locator(".vm-jobtext mark[data-status='falta']").filter({ hasText: "Kubernetes" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("trocar de vaga muda a nota e o texto destacado", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Front-end Sênior/ }).click();
  await expect(result(page).getByTestId("headline")).toHaveText("Aderência baixa");
  await expect(page.locator(".vm-jobtext__title")).toHaveText("Senior Frontend Engineer");
  const score = Number(await result(page).getByTestId("score").getAttribute("data-value"));
  expect(score).toBeLessThan(35);
});

test("as abas respondem às setas do teclado", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Back-end Pleno/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Front-end Sênior/ })).toBeFocused();
  await expect(page.getByRole("tab", { name: /Front-end Sênior/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /Usar os meus/ })).toHaveAttribute("aria-selected", "true");
});

test("explica de onde veio a nota", async ({ page }) => {
  await page.goto("./");
  await result(page).getByText("Como a nota foi calculada").click();
  await expect(result(page).locator(".vm-breakdown__row")).toHaveCount(4);
  await expect(result(page).locator(".vm-breakdown__row[data-id='senioridade']")).toContainText("15/15");
});

test("colar vaga e currículo próprios gera a análise", async ({ page }) => {
  await page.goto("./");
  await page.getByTestId("cta-try").click();
  await expect(page.getByRole("tab", { name: /Usar os meus/ })).toHaveAttribute("aria-selected", "true");
  await expect(result(page)).toContainText("Falta pouco.");
  const job = SAMPLE_JOBS.find((item) => item.id === "dados-junior");
  await page.getByTestId("own-job").fill(job?.text ?? "");
  await expect(result(page)).toContainText("Cole o currículo");
  await page.getByTestId("resume-text").fill(SAMPLE_RESUME);
  await expect(result(page).getByTestId("headline")).toHaveText("Aderência parcial");
  await expect(result(page).getByText("Texto colado por você")).toBeVisible();
});

test("lê um currículo em PDF no próprio navegador", async ({ page, browser }) => {
  const maker = await browser.newPage();
  await maker.setContent(`<main style="font: 14px Arial; padding: 40px">${SAMPLE_RESUME.split("\n").map((line) => `<p style="margin:0 0 4px">${line || "&nbsp;"}</p>`).join("")}</main>`);
  const pdf = await maker.pdf({ format: "A4" });
  await maker.close();

  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./");
  await page.getByRole("tab", { name: /Usar os meus/ }).click();
  await page.getByTestId("own-job").fill(SAMPLE_JOBS[0]?.text ?? "");
  await page.getByTestId("resume-file").setInputFiles({ name: "curriculo.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByText("Texto lido de curriculo.pdf")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("resume-text")).toHaveValue(/Marina Duarte Costa/);
  await expect(page.getByText(/Reconheci \d+ habilidades/)).toBeVisible();
  await expect(result(page).getByTestId("score")).toHaveAttribute("data-value", /^\d+$/);
  const origin = new URL(page.url()).origin;
  expect(requests.filter((url) => !url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:"))).toEqual([]);
});

test("avisa quando o arquivo não tem texto", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("tab", { name: /Usar os meus/ }).click();
  await page.getByTestId("resume-file").setInputFiles({ name: "vazio.txt", mimeType: "text/plain", buffer: Buffer.from("oi") });
  await expect(page.getByText(/Não achei texto nesse arquivo/)).toBeVisible();
});

test("o botão de instalar aponta para o zip da última versão", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("download")).toHaveAttribute("href", "https://github.com/leandromlmoreira/vaga-match/releases/latest/download/vaga-match.zip");
  await page.getByTestId("cta-install").click();
  await expect(page.getByRole("heading", { name: "Instale em dois minutos." })).toBeInViewport();
});

test("no celular não há rolagem horizontal e a nota aparece", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("./");
  await expect(result(page).getByTestId("score")).toHaveAttribute("data-value", "86");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test("respeita quem prefere menos movimento", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(result(page).getByTestId("score")).toHaveText("86");
});
