import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
import { extractJobFromPage } from "../../src/extension/extract-page";

const LONG = "Buscamos alguém para construir APIs REST em Python e Django, com testes automatizados e PostgreSQL. ".repeat(4);

const globals = globalThis as unknown as Record<string, unknown>;
const saved = { window: globals.window, document: globals.document, Node: globals.Node };

function load(url: string, body: string): JSDOM {
  const dom = new JSDOM(`<!doctype html><html><head><title>Página da vaga</title></head><body>${body}</body></html>`, { url });
  globals.window = dom.window;
  globals.document = dom.window.document;
  globals.Node = dom.window.Node;
  return dom;
}

afterEach(() => {
  Object.assign(globals, saved);
});

describe("leitura da página", () => {
  it("usa o bloco da descrição no LinkedIn e junta título e detalhes", () => {
    load(
      "https://www.linkedin.com/jobs/view/123",
      `<ul class="jobs-list"><li>Outra vaga: Kotlin</li></ul>
       <h1 class="job-details-jobs-unified-top-card__job-title">Desenvolvedora Python Pleno</h1>
       <div class="job-details-jobs-unified-top-card__primary-description-container">São Paulo · Híbrido</div>
       <div class="jobs-description__content"><h2>Requisitos</h2><ul><li>Python</li><li>Django</li></ul><p>${LONG}</p></div>`,
    );
    const result = extractJobFromPage();
    expect(result).toMatchObject({ site: "linkedin", siteLabel: "LinkedIn Vagas", source: "vaga", title: "Desenvolvedora Python Pleno" });
    expect(result.text.split("\n")[0]).toBe("Desenvolvedora Python Pleno");
    expect(result.text).toContain("Híbrido");
    expect(result.text).toContain("- Django");
    expect(result.text).not.toContain("Kotlin");
  });

  it("junta as várias seções de texto da Gupy", () => {
    load(
      "https://empresa.gupy.io/jobs/99",
      `<h1>Pessoa Engenheira de Dados</h1>
       <div data-testid="text-section"><h2>Responsabilidades</h2><p>${LONG}</p></div>
       <div data-testid="text-section"><h2>Requisitos e qualificações</h2><ul><li>SQL</li><li>Airflow</li></ul></div>`,
    );
    const result = extractJobFromPage();
    expect(result.site).toBe("gupy");
    expect(result.text).toContain("Responsabilidades");
    expect(result.text).toContain("- Airflow");
  });

  it("lê a descrição do Indeed", () => {
    load("https://br.indeed.com/viewjob?jk=1", `<h1 class="jobsearch-JobInfoHeader-title">Dev Front-end</h1><div id="jobDescriptionText"><p>${LONG}</p></div>`);
    expect(extractJobFromPage()).toMatchObject({ site: "indeed", source: "vaga", title: "Dev Front-end" });
  });

  it("lê a descrição do Vagas.com", () => {
    load("https://www.vagas.com.br/vagas/v1", `<h1 class="job-shortdescription__title">Analista de BI</h1><div class="job-description"><p>${LONG}</p></div>`);
    expect(extractJobFromPage()).toMatchObject({ site: "vagas", source: "vaga" });
  });

  it("prefere o texto selecionado e acrescenta o título da página", () => {
    const dom = load("https://carreiras.exemplo.com.br/vaga", `<h1>Dev Java</h1><nav>Menu com Rust e Go</nav><article id="a"><p>${LONG}</p></article>`);
    const article = dom.window.document.querySelector("#a");
    const range = dom.window.document.createRange();
    if (article) range.selectNodeContents(article);
    dom.window.getSelection()?.addRange(range);
    const result = extractJobFromPage();
    expect(result.source).toBe("selecao");
    expect(result.site).toBe("generico");
    expect(result.siteLabel).toBe("carreiras.exemplo.com.br");
    expect(result.text.startsWith("Dev Java\n\n")).toBe(true);
    expect(result.text).not.toContain("Rust");
  });

  it("sem seleção num site desconhecido, lê o conteúdo principal", () => {
    load("https://exemplo.com/vaga", `<nav>Início</nav><main><h1>Dev Go</h1><p>${LONG}</p></main>`);
    const result = extractJobFromPage();
    expect(result.source).toBe("pagina");
    expect(result.text).toContain("Dev Go");
    expect(result.text).not.toContain("Início");
  });

  it("ignora elementos escondidos e scripts", () => {
    load("https://exemplo.com/vaga", `<main><p>${LONG}</p><p hidden>Segredo com Kubernetes</p><script>var k8s = 1;</script><div style="display:none">Scala</div></main>`);
    const text = extractJobFromPage().text;
    expect(text).not.toContain("Kubernetes");
    expect(text).not.toContain("k8s");
    expect(text).not.toContain("Scala");
  });

  it("devolve texto vazio quando não há conteúdo", () => {
    load("https://exemplo.com/", "");
    expect(extractJobFromPage().text).toBe("");
  });

  it("é uma função autocontida, que pode ser injetada na aba", () => {
    const source = extractJobFromPage.toString();
    expect(source).not.toMatch(/\b(import|require)\b/);
    expect(() => new Function(`return (${source})`)).not.toThrow();
  });
});
