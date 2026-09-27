import { describe, expect, it } from "vitest";
import { parseJob, type Importance, type ParsedJob } from "../../src/engine/job";
import { SAMPLE_JOBS } from "../../src/samples";
import { DADOS_R, DEVOPS_INLINE, DOTNET_PT, ESTAGIO_FRONT, FLUTTER_NO_SECTIONS, JAVA_EN } from "../fixtures/jobs";

function importanceOf(job: ParsedJob, id: string): Importance | undefined {
  return job.skills.find((s) => s.id === id)?.importance;
}

function sample(id: string): string {
  const found = SAMPLE_JOBS.find((job) => job.id === id);
  if (!found) throw new Error(id);
  return found.text;
}

describe("seções da vaga", () => {
  it("separa obrigatórios e diferenciais no formato Gupy", () => {
    const job = parseJob(sample("backend-pleno"));
    expect(importanceOf(job, "python")).toBe("required");
    expect(importanceOf(job, "postgresql")).toBe("required");
    expect(importanceOf(job, "docker")).toBe("required");
    expect(importanceOf(job, "kubernetes")).toBe("nice");
    expect(importanceOf(job, "terraform")).toBe("nice");
    expect(importanceOf(job, "rest")).toBe("context");
    expect(job.hasSections).toBe(true);
  });

  it("entende títulos em inglês", () => {
    const job = parseJob(JAVA_EN);
    expect(importanceOf(job, "java")).toBe("required");
    expect(importanceOf(job, "spring")).toBe("required");
    expect(importanceOf(job, "aws")).toBe("nice");
    expect(importanceOf(job, "kafka")).toBe("context");
    expect(importanceOf(job, "go")).toBe("nice");
  });

  it("ignora habilidades citadas em benefícios", () => {
    const job = parseJob(DEVOPS_INLINE);
    expect(importanceOf(job, "aws")).toBeUndefined();
  });

  it("respeita marcações por item, como (desejável)", () => {
    const job = parseJob(DEVOPS_INLINE);
    expect(importanceOf(job, "kubernetes")).toBe("required");
    expect(importanceOf(job, "terraform")).toBe("nice");
    expect(importanceOf(job, "cicd")).toBe("required");
    expect(job.english?.importance).toBe("nice");
  });

  it("aceita cabeçalho na mesma linha, como 'Diferenciais: X'", () => {
    const job = parseJob("Desenvolvedor Back-end\nRequisitos\n- Python\nDiferenciais: Docker e Redis\n- Django");
    expect(importanceOf(job, "docker")).toBe("nice");
    expect(importanceOf(job, "redis")).toBe("nice");
    expect(importanceOf(job, "django")).toBe("required");
  });

  it("não confunde item de lista com título de seção", () => {
    const job = parseJob("Diferenciais\n- Conhecimentos em Kubernetes\n- Habilidades com Terraform");
    expect(importanceOf(job, "kubernetes")).toBe("nice");
    expect(importanceOf(job, "terraform")).toBe("nice");
  });

  it("ignora a área de formação", () => {
    const job = parseJob(sample("dados-junior"));
    expect(importanceOf(job, "statistics")).toBeUndefined();
    expect(importanceOf(job, "sql")).toBe("required");
  });

  it("marca vaga sem seções e trata tudo como contexto", () => {
    const job = parseJob(FLUTTER_NO_SECTIONS);
    expect(job.hasSections).toBe(false);
    expect(job.hasRequiredSection).toBe(false);
    expect(importanceOf(job, "flutter")).toBe("context");
    expect(importanceOf(job, "dart")).toBe("context");
  });

  it("habilidades do título são obrigatórias", () => {
    const job = parseJob("Desenvolvedor Python Pleno\n\nSobre a vaga\nTime pequeno.");
    expect(importanceOf(job, "python")).toBe("required");
    expect(job.title).toBe("Desenvolvedor Python Pleno");
  });

  it("registra alternativas com 'ou'", () => {
    const job = parseJob(sample("backend-pleno"));
    expect(job.alternatives).toContainEqual(["django", "fastapi"]);
    expect(job.alternatives).toContainEqual(["kafka", "rabbitmq"]);
  });
});

describe("senioridade da vaga", () => {
  it.each([
    ["Desenvolvedor(a) Back-end Sênior", "Sênior"],
    ["Pessoa Desenvolvedora Pleno", "Pleno"],
    ["Junior Frontend Engineer", "Júnior"],
    ["Estágio em Dados", "Estágio"],
    ["Staff Software Engineer", "Especialista"],
    ["Dev Front-end PL", "Pleno"],
    ["Desenvolvedor Júnior/Pleno", "Júnior a Pleno"],
  ])("título %s", (title, label) => {
    expect(parseJob(`${title}\n\nRequisitos\n- Python`).level?.label).toBe(label);
  });

  it("usa anos de experiência quando o título não diz", () => {
    const job = parseJob("Desenvolvedor Back-end\n\nRequisitos\n- Mínimo de 5 anos de experiência com Java");
    expect(job.level?.label).toBe("Sênior");
    expect(job.level?.source).toBe("anos");
    expect(job.level?.years).toBe(5);
  });

  it("lê '3+ years' em inglês", () => {
    const job = parseJob("Backend Engineer\n\nRequirements\n- 3+ years of experience with Go");
    expect(job.level?.label).toBe("Pleno");
  });

  it("devolve nulo quando não há pista", () => {
    expect(parseJob("Desenvolvedor Back-end\nRequisitos\n- Python").level).toBeNull();
  });
});

describe("modelo de trabalho", () => {
  it.each([
    [sample("backend-pleno"), "hibrido"],
    [sample("frontend-senior"), "remoto"],
    [sample("dados-junior"), "presencial"],
    [JAVA_EN, "hibrido"],
    [DOTNET_PT, "presencial"],
    [FLUTTER_NO_SECTIONS, "remoto"],
    [ESTAGIO_FRONT, "presencial"],
    [DADOS_R, "hibrido"],
    [DEVOPS_INLINE, "remoto"],
  ])("vaga %#", (text, expected) => {
    expect(parseJob(text).workModel?.value).toBe(expected);
  });

  it("não confunde auxílio home office com vaga remota", () => {
    const job = parseJob("Analista de Dados\nPresencial em Recife\nBenefícios: auxílio home office");
    expect(job.workModel?.value).toBe("presencial");
  });

  it("devolve nulo quando a vaga não diz", () => {
    expect(parseJob("Dev Python\nRequisitos\n- Python").workModel).toBeNull();
  });
});

describe("contrato, salário e idioma", () => {
  it("acha tipo de contrato", () => {
    expect(parseJob(DOTNET_PT).contracts).toEqual(["PJ"]);
    expect(parseJob(sample("frontend-senior")).contracts).toEqual(["CLT", "PJ"]);
    expect(parseJob(ESTAGIO_FRONT).contracts).toContain("Estágio");
  });

  it("acha faixa salarial", () => {
    expect(parseJob(sample("backend-pleno")).salary).toBe("R$ 9.500 a R$ 12.800");
    expect(parseJob(DOTNET_PT).salary).toBe("R$ 7.000 a R$ 8.500");
    expect(parseJob(DADOS_R).salary).toBe("R$ 11.000");
    expect(parseJob(JAVA_EN).salary).toBeNull();
  });

  it("lê nível de inglês pedido", () => {
    expect(parseJob(sample("frontend-senior")).english?.label).toBe("fluente");
    expect(parseJob(sample("backend-pleno")).english).toMatchObject({ label: "intermediário", importance: "nice" });
    expect(parseJob(sample("dados-junior")).english).toBeNull();
  });

  it("deduz inglês quando a vaga está escrita em inglês", () => {
    const job = parseJob(JAVA_EN.replace("- Good English for daily written communication.", ""));
    expect(job.english).toMatchObject({ inferred: true, label: "avançado" });
  });
});
