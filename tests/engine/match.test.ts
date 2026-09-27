import { describe, expect, it } from "vitest";
import { findMentions, skillIdsIn } from "../../src/engine/match";
import { SKILLS } from "../../src/engine/skills";

const ids = (text: string) => [...skillIdsIn(text)].sort();

describe("sinônimos", () => {
  it.each([
    ["Experiência com JS e ES6", ["javascript"]],
    ["Sólidos conhecimentos em JavaScript", ["javascript"]],
    ["Banco Postgres", ["postgresql"]],
    ["PostgreSQL 15", ["postgresql"]],
    ["psql na linha de comando", ["postgresql"]],
    ["k8s em produção", ["kubernetes"]],
    ["Kubernetes", ["kubernetes"]],
    ["NodeJS", ["nodejs"]],
    ["Node.js 20", ["nodejs"]],
    ["back-end em Node", ["nodejs"]],
    ["VueJS 3", ["vue"]],
    ["ASP.NET Core", ["dotnet"]],
    [".NET 8", ["dotnet"]],
    ["C# moderno", ["csharp"]],
    ["C++ embarcado", ["cpp"]],
    ["Golang ou Go", ["go"]],
    ["integração contínua", ["cicd"]],
    ["CI/CD", ["cicd"]],
    ["Amazon Web Services", ["aws"]],
    ["microsserviços", ["microservices"]],
    ["micro-serviços", ["microservices"]],
    ["Spring  Boot", ["spring"]],
    ["spring-boot", ["spring"]],
    ["TypeScript", ["typescript"]],
    ["Aprendizado de máquina", ["ml"]],
  ])("%s", (text, expected) => {
    expect(ids(text)).toEqual(expected);
  });

  it("ignora acentos e caixa", () => {
    expect(ids("MICROSSERVIÇOS e Integração Contínua")).toEqual(["cicd", "microservices"]);
  });
});

describe("falsos positivos", () => {
  it("não confunde Java com JavaScript", () => {
    expect(ids("Vaga para JavaScript")).toEqual(["javascript"]);
    expect(ids("Java 17 e JavaScript")).toEqual(["java", "javascript"]);
  });

  it("não acha Go em expressões comuns em inglês", () => {
    expect(ids("Our Go-to-market team")).toEqual([]);
    expect(ids("Go to the office")).toEqual([]);
    expect(ids("We use Google Cloud")).toEqual(["gcp"]);
    expect(ids("Stack: Go, Python")).toEqual(["go", "python"]);
  });

  it("não acha R em valores em reais", () => {
    expect(ids("Salário de R$ 6.000")).toEqual([]);
    expect(ids("Python, R e SQL")).toEqual(["python", "r", "sql"]);
    expect(ids("Rua R. Augusta")).toEqual([]);
  });

  it("prefere o termo mais longo quando há sobreposição", () => {
    expect(ids("React Native")).toEqual(["react-native"]);
    expect(ids("SQL Server")).toEqual(["sqlserver"]);
    expect(ids("GitHub Actions")).toEqual(["github-actions"]);
    expect(ids("MySQL")).toEqual(["mysql"]);
    expect(ids("NoSQL")).toEqual(["nosql"]);
  });

  it("não acha palavras comuns do inglês", () => {
    expect(ids("the rest of the team, next steps, less meetings")).toEqual([]);
    expect(ids("a solid understanding of express delivery")).toEqual([]);
    expect(ids("We follow SOLID and REST")).toEqual(["clean-code", "rest"]);
  });

  it("não acha tecnologia dentro de nomes de arquivo", () => {
    expect(ids("abra o arquivo main.java")).toEqual([]);
    expect(ids("three.js")).toEqual([]);
  });
});

describe("posições", () => {
  it("devolve as posições no texto original, com acentos", () => {
    const text = "Experiência com integração contínua e Postgres";
    const mentions = findMentions(text);
    expect(mentions.map((m) => text.slice(m.start, m.end))).toEqual(["integração contínua", "Postgres"]);
    expect(mentions.map((m) => m.term)).toEqual(["integração contínua", "Postgres"]);
  });

  it("devolve menções em ordem", () => {
    const mentions = findMentions("Docker, Python e AWS");
    expect(mentions.map((m) => m.skillId)).toEqual(["docker", "python", "aws"]);
  });
});

describe("dicionário", () => {
  it("tem ids únicos e implicações válidas", () => {
    const all = new Set(SKILLS.map((s) => s.id));
    expect(all.size).toBe(SKILLS.length);
    for (const skill of SKILLS) for (const target of skill.implies ?? []) expect(all.has(target), `${skill.id} -> ${target}`).toBe(true);
  });

  it("guarda apelidos já normalizados", () => {
    for (const skill of SKILLS) for (const alias of skill.aliases) expect(alias).toBe(alias.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
  });

  it("cobre mais de cem habilidades", () => {
    expect(SKILLS.length).toBeGreaterThan(100);
  });
});
