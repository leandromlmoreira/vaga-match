import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SAMPLE_JOBS } from "../../src/samples";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function jobHtml(text: string): { title: string; body: string } {
  const [titleLine = "", ...rest] = text.split("\n");
  const parts: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length > 0) parts.push(`<ul>${list.join("")}</ul>`);
    list = [];
  };
  for (const raw of rest) {
    const line = raw.trim();
    if (line.length === 0) {
      flush();
      continue;
    }
    if (line.startsWith("- ")) {
      list.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    flush();
    const isHeading = line.length < 40 && !/[.;:,]$/.test(line) && !line.includes("·");
    parts.push(isHeading ? `<h2>${escapeHtml(line)}</h2>` : `<p>${escapeHtml(line)}</p>`);
  }
  flush();
  return { title: titleLine, body: parts.join("\n") };
}

function sample(id: string): string {
  const job = SAMPLE_JOBS.find((item) => item.id === id);
  if (!job) throw new Error(id);
  return job.text;
}

function vagasPage(): string {
  const { title, body } = jobHtml(sample("backend-pleno"));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)} | Vagas.com</title></head>
<body>
  <header><nav><a href="#">Vagas</a> <a href="#">Entrar</a> <button>Candidatar-se</button></nav></header>
  <main>
    <h1 class="job-shortdescription__title">${escapeHtml(title)}</h1>
    <div class="job-description">${body}</div>
    <aside><h3>Outras vagas</h3><p>Designer de Produto Sênior, com Figma e pesquisa com usuários.</p></aside>
  </main>
</body></html>`;
}

function linkedinPage(): string {
  const { title, body } = jobHtml(sample("frontend-senior"));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)} | LinkedIn</title></head>
<body>
  <div class="scaffold-layout__list"><ul><li>Data Engineer, Kafka and Spark</li><li>Android Developer, Kotlin</li></ul></div>
  <div class="jobs-search__job-details">
    <h1 class="job-details-jobs-unified-top-card__job-title">${escapeHtml(title)}</h1>
    <div class="job-details-jobs-unified-top-card__primary-description-container">Lumen Health · Brasil · Remoto</div>
    <div id="job-details">${body}</div>
  </div>
</body></html>`;
}

function genericPage(): string {
  const { title, body } = jobHtml(sample("dados-junior"));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Carreiras</title></head>
<body>
  <header><nav><a href="#">Início</a> <a href="#">Blog</a></nav></header>
  <aside id="barra"><h3>Posts populares</h3><p>Como migramos para Kubernetes, Kafka e Rust em um fim de semana.</p><p>Nosso time de Swift e Kotlin conta tudo sobre mobile.</p></aside>
  <section id="vaga">
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </section>
  <footer><p>Empresa fictícia criada para testes.</p></footer>
</body></html>`;
}

const PAGES: Record<string, () => string> = {
  "/vagas/v1": vagasPage,
  "/jobs/view/1": linkedinPage,
  "/carreiras/dados": genericPage,
  "/vazia": () => "<!doctype html><html><head><meta charset='utf-8'><title>Olá</title></head><body><p>Oi.</p></body></html>",
};

export async function startJobServer(): Promise<{ server: Server; port: number }> {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://local").pathname;
    const page = PAGES[path];
    if (!page) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: (server.address() as AddressInfo).port };
}
