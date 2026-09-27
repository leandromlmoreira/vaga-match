import { describe, expect, it } from "vitest";
import { detectHeading } from "../../src/engine/sections";
import { JOB_RULES } from "../../src/engine/job";
import { compactKey, joinList, normalize, splitLines, stripBullet, toOriginalSpan } from "../../src/engine/text";

describe("normalização", () => {
  it("tira acentos, baixa a caixa e troca travessões", () => {
    expect(normalize("Integração – Contínua").text).toBe("integracao - continua");
  });

  it("mantém o mapa de posições até o texto original", () => {
    const original = "Ação em São Paulo";
    const norm = normalize(original);
    const at = norm.text.indexOf("sao paulo");
    const [start, end] = toOriginalSpan(norm, at, at + "sao paulo".length);
    expect(original.slice(start, end)).toBe("São Paulo");
  });

  it("pode preservar maiúsculas", () => {
    expect(normalize("Go é Ótimo", { lower: false }).text).toBe("Go e Otimo");
  });
});

describe("linhas", () => {
  it("quebra em linhas com posições, aceitando CRLF", () => {
    const text = "um\r\ndois\n\ntrês";
    const lines = splitLines(text);
    expect(lines.map((l) => l.text)).toEqual(["um", "dois", "", "três"]);
    for (const line of lines) expect(text.slice(line.start, line.end)).toBe(line.text);
  });

  it("remove marcadores de lista", () => {
    expect(stripBullet("• Python")).toBe("Python");
    expect(stripBullet("- Python")).toBe("Python");
    expect(stripBullet("3) Python")).toBe("Python");
    expect(stripBullet("Python")).toBe("Python");
  });
});

describe("títulos de seção", () => {
  it.each([
    ["Requisitos:", "required"],
    ["**Requisitos e qualificações**", "required"],
    ["O que esperamos de você", "required"],
    ["What you'll need", "required"],
    ["Requisitos desejáveis", "nice"],
    ["Diferenciais", "nice"],
    ["Será um diferencial se você tiver:", "nice"],
    ["Nice to have", "nice"],
    ["Responsabilidades e atribuições", "responsibilities"],
    ["Sobre a vaga", "responsibilities"],
    ["Benefícios", "benefits"],
    ["Sobre a Ribeira", "about"],
    ["Etapas do processo", "process"],
    ["## Stack", "stack"],
  ])("%s", (line, kind) => {
    expect(detectHeading(line, JOB_RULES)?.kind).toBe(kind);
  });

  it.each([
    "- Conhecimentos em Docker",
    "Experiência com Python e Django.",
    "Você tem experiência com filas e gosta de observabilidade no dia a dia de produção",
  ])("não é título: %s", (line) => {
    expect(detectHeading(line, JOB_RULES)).toBeNull();
  });
});

describe("utilidades", () => {
  it("junta listas em português", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["A"])).toBe("A");
    expect(joinList(["A", "B", "C"])).toBe("A, B e C");
    expect(joinList(["A", "B"], "ou")).toBe("A ou B");
  });

  it("compara termos sem pontuação", () => {
    expect(compactKey("Node.js")).toBe(compactKey("nodejs"));
    expect(compactKey("CI/CD")).toBe(compactKey("ci cd"));
  });
});
