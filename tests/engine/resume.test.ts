import { describe, expect, it } from "vitest";
import { findRanges, totalMonths } from "../../src/engine/dates";
import { parseResume } from "../../src/engine/resume";
import { SAMPLE_RESUME } from "../../src/samples";

const TODAY = new Date(2026, 8, 27);

describe("datas de experiência", () => {
  it.each([
    ["mar/2022 - atual", 55],
    ["Jan 2020 – Dez 2020", 12],
    ["janeiro de 2019 a junho de 2019", 6],
    ["03/2021 - 02/2023", 24],
    ["2018 - 2019", 18],
    ["May 2023 - Present", 41],
  ])("%s", (text, months) => {
    expect(totalMonths(findRanges(text, TODAY))).toBe(months);
  });

  it("não soma duas vezes períodos que se sobrepõem", () => {
    const ranges = findRanges("jan/2020 - dez/2021\njun/2021 - jun/2022", TODAY);
    expect(totalMonths(ranges)).toBe(30);
  });

  it("ignora datas no futuro", () => {
    expect(totalMonths(findRanges("jan/2026 - dez/2030", TODAY))).toBe(9);
  });
});

describe("currículo de exemplo", () => {
  const resume = parseResume(SAMPLE_RESUME, TODAY);

  it("reconhece as habilidades com os nomes usados", () => {
    expect(resume.skills.get("postgresql")?.terms).toEqual(["Postgres"]);
    expect(resume.skills.has("django")).toBe(true);
    expect(resume.skills.has("tests")).toBe(true);
  });

  it("deduz habilidades implícitas", () => {
    expect(resume.implied.get("sql")).toBe("postgresql");
  });

  it("separa tópicos de experiência e sabe quais têm número", () => {
    expect(resume.bullets).toHaveLength(6);
    const first = resume.bullets[0];
    expect(first?.text).toMatch(/^Desenvolvi APIs REST/);
    expect(first?.hasNumber).toBe(true);
    expect(resume.bullets.filter((b) => !b.hasNumber)).toHaveLength(4);
  });

  it("marca o que só aparece na lista de habilidades", () => {
    expect(resume.skills.get("docker")?.inBullets).toBe(false);
    expect(resume.skills.get("django")?.inBullets).toBe(true);
  });

  it("lê nível pelo título e anos pelas datas, sem contar a faculdade", () => {
    expect(resume.level?.label).toBe("Pleno");
    expect(resume.years).toBe(6.7);
  });

  it("lê o inglês declarado", () => {
    expect(resume.english?.label).toBe("intermediário");
  });
});

describe("currículos variados", () => {
  it("estima nível só pelos anos", () => {
    const resume = parseResume("João Lima\n\nExperiência\nDev na Loja X\n2015 - 2025\n- Mantive o sistema de vendas em PHP e MySQL.", TODAY);
    expect(resume.level?.label).toBe("Especialista");
    expect(resume.level?.source).toBe("anos");
  });

  it("usa anos declarados no resumo", () => {
    const resume = parseResume("Ana\nResumo\nTenho 3 anos de experiência com React.", TODAY);
    expect(resume.years).toBe(3);
    expect(resume.level?.label).toBe("Pleno");
  });

  it("junta linhas quebradas de um mesmo tópico, como vem do PDF", () => {
    const resume = parseResume("Experiência\n• Construí o painel de pedidos com React e\nTypeScript para 12 lojas.\n• Criei testes com Jest.", TODAY);
    expect(resume.bullets[0]?.text.replace(/\s+/g, " ")).toBe("Construí o painel de pedidos com React e TypeScript para 12 lojas.");
    expect(resume.bullets[0]?.skills).toEqual(["react", "typescript"]);
  });

  it("deduz inglês avançado de currículo escrito em inglês", () => {
    const resume = parseResume("Summary\nI am a backend engineer with experience in Go and we built the payments team from the ground up. I love to work with the team and our users.", TODAY);
    expect(resume.english).toMatchObject({ label: "avançado", inferred: true });
  });

  it("aceita currículo vazio", () => {
    const resume = parseResume("", TODAY);
    expect(resume.skills.size).toBe(0);
    expect(resume.level).toBeNull();
    expect(resume.bullets).toEqual([]);
  });
});
