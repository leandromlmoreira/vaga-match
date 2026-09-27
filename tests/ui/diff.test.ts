import { describe, expect, it } from "vitest";
import { diffInline } from "../../src/ui/diff";
import { joinTextItems } from "../../src/ui/pdf";

describe("diferença entre antes e depois", () => {
  it("destaca a palavra trocada inteira", () => {
    const parts = diffInline("consultas no Postgres para relatórios", "consultas no PostgreSQL para relatórios");
    expect(parts).toEqual({ prefix: "consultas no ", removed: "Postgres", added: "PostgreSQL", suffix: " para relatórios" });
  });

  it("destaca só o trecho acrescentado no fim", () => {
    const parts = diffInline("Criei a API.", "Criei a API, usando Docker.");
    expect(parts).toEqual({ prefix: "Criei a API", removed: "", added: ", usando Docker", suffix: "." });
  });

  it("não inventa diferença quando os textos são iguais", () => {
    expect(diffInline("igual", "igual")).toEqual({ prefix: "igual", removed: "", added: "", suffix: "" });
  });
});

describe("texto extraído do PDF", () => {
  const item = (str: string, x: number, y: number, width: number, hasEOL = false) => ({ str, transform: [10, 0, 0, 10, x, y], width, hasEOL });

  it("quebra linha quando a altura muda e junta pedaços da mesma palavra", () => {
    const text = joinTextItems([item("Desenvol", 0, 700, 40), item("vedora", 40, 700, 30), item("Python", 0, 680, 30)]);
    expect(text).toBe("Desenvolvedora\nPython");
  });

  it("coloca espaço quando há distância entre pedaços", () => {
    expect(joinTextItems([item("Python,", 0, 700, 35), item("Django", 40, 700, 30)])).toBe("Python, Django");
  });

  it("respeita o fim de linha informado pelo PDF", () => {
    expect(joinTextItems([item("Resumo", 0, 700, 30, true), item("Dev", 0, 700, 15)])).toBe("Resumo\nDev");
  });
});
