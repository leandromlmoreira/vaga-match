import { describe, expect, it } from "vitest";
import { analyze } from "../../src/engine";
import { skillIdsIn } from "../../src/engine/match";
import { parseResume } from "../../src/engine/resume";
import { SAMPLE_JOBS, SAMPLE_RESUME } from "../../src/samples";
import { DADOS_R, DEVOPS_INLINE, DOTNET_PT, ESTAGIO_FRONT, FLUTTER_NO_SECTIONS, JAVA_EN } from "../fixtures/jobs";

const TODAY = new Date(2026, 8, 27);
const run = (job: string, resume = SAMPLE_RESUME) => analyze(job, resume, { today: TODAY });

const FRONT_RESUME = `Caio Nogueira
Desenvolvedor Front-end Júnior

Experiência
Estúdio Lampião · fev/2024 - atual
- Construí telas em React e TypeScript para um app de agendamento.
- Escrevi testes com Jest.

Habilidades
HTML, CSS, JavaScript, React, TypeScript, Git, Figma
`;

const ALL_JOBS = [...SAMPLE_JOBS.map((job) => job.text), JAVA_EN, DOTNET_PT, FLUTTER_NO_SECTIONS, ESTAGIO_FRONT, DEVOPS_INLINE, DADOS_R];
const ALL_RESUMES = [SAMPLE_RESUME, FRONT_RESUME, "Maria\nSkills: Python", ""];

function sample(id: string): string {
  const found = SAMPLE_JOBS.find((job) => job.id === id);
  if (!found) throw new Error(id);
  return found.text;
}

describe("notas das vagas de exemplo", () => {
  it("dá nota alta quando o currículo cobre quase tudo", () => {
    const result = run(sample("backend-pleno"));
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.band).toBe("forte");
    expect(result.skills.required.every((s) => s.status !== "falta")).toBe(true);
  });

  it("dá nota baixa para uma vaga de outra área", () => {
    const result = run(sample("frontend-senior"));
    expect(result.score).toBeLessThan(35);
    expect(result.band).toBe("baixa");
    expect(result.skills.required.map((s) => s.id)).toContain("react");
  });

  it("fica no meio quando cobre parte", () => {
    const result = run(sample("dados-junior"));
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(65);
  });

  it("o mesmo currículo muda de nota conforme a vaga", () => {
    const scores = SAMPLE_JOBS.map((job) => run(job.text).score ?? 0);
    expect(new Set(scores).size).toBe(3);
  });

  it("currículo de front-end cobre mais habilidades na vaga de front-end", () => {
    const skillsPoints = (job: string) => run(job, FRONT_RESUME).breakdown.find((b) => b.id === "obrigatorias")?.points ?? 0;
    expect(skillsPoints(sample("frontend-senior"))).toBeGreaterThan(skillsPoints(sample("backend-pleno")));
  });

  it("senioridade abaixo e inglês ausente pesam na nota", () => {
    const result = run(sample("frontend-senior"), FRONT_RESUME);
    expect(result.breakdown.find((b) => b.id === "senioridade")?.points).toBe(3);
    expect(result.breakdown.find((b) => b.id === "idioma")?.points).toBe(0);
  });
});

describe("pontuação transparente", () => {
  it.each(ALL_JOBS.flatMap((job, j) => ALL_RESUMES.map((resume, r) => [j, r, job, resume] as const)))(
    "vaga %i x currículo %i: nota entre 0 e 100 e igual à soma das partes",
    (_j, _r, job, resume) => {
      const result = run(job, resume);
      if (result.score === null) return;
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown.reduce((sum, item) => sum + item.points, 0)).toBe(result.score);
      for (const item of result.breakdown) {
        expect(item.points).toBeGreaterThanOrEqual(0);
        expect(item.points).toBeLessThanOrEqual(item.max);
      }
      expect(result.breakdown.reduce((sum, item) => sum + item.max, 0)).toBe(100);
    },
  );

  it("é determinística", () => {
    expect(run(JAVA_EN)).toEqual(run(JAVA_EN));
  });

  it("aprender uma habilidade obrigatória que faltava aumenta a nota", () => {
    const before = run(DEVOPS_INLINE);
    const after = run(DEVOPS_INLINE, `${SAMPLE_RESUME}\nKubernetes`);
    expect(after.score ?? 0).toBeGreaterThan(before.score ?? 0);
  });

  it("habilidade obrigatória pesa mais que diferencial", () => {
    const job = "Dev\nRequisitos\n- Python\n- Docker\nDiferenciais\n- Redis\n- Kafka";
    const withRequired = run(job, "Skills: Python, Docker");
    const withNice = run(job, "Skills: Redis, Kafka");
    expect(withRequired.score ?? 0).toBeGreaterThan(withNice.score ?? 0);
  });

  it("habilidade deduzida vale menos que declarada", () => {
    const job = "Dev\nRequisitos\n- SQL";
    const declared = run(job, "Skills: SQL");
    const inferred = run(job, "Skills: PostgreSQL");
    expect(inferred.skills.required[0]).toMatchObject({ status: "inferido", via: "PostgreSQL" });
    expect(declared.score ?? 0).toBeGreaterThan(inferred.score ?? 0);
  });

  it("alternativas com 'ou' contam uma vez só", () => {
    const job = "Dev\nRequisitos\n- Django ou FastAPI\n- Docker";
    const result = run(job, "Skills: Django, Docker");
    expect(result.skills.required.map((s) => s.id)).toEqual(["django", "docker"]);
    expect(result.skills.required[0]?.alternatives).toEqual(["FastAPI"]);
    expect(result.breakdown[0]?.points).toBe(result.breakdown[0]?.max);
  });

  it("junta alternativas que faltam num item só", () => {
    const result = run("Dev\nRequisitos\n- Kafka ou RabbitMQ", "Skills: Python");
    expect(result.skills.required).toHaveLength(1);
    expect(result.skills.required[0]?.label).toBe("Kafka ou RabbitMQ");
  });

  it("devolve nota nula quando a vaga não tem habilidades técnicas", () => {
    const result = run("Vendedor de loja\nRequisitos\n- Boa comunicação\n- Disponibilidade aos sábados");
    expect(result.score).toBeNull();
    expect(result.headline).toBe("Não deu para medir");
  });

  it("avisa quando o currículo não tem habilidade reconhecida", () => {
    expect(run(JAVA_EN, "Olá, meu nome é Ana.").notes).toHaveLength(1);
  });
});

describe("explicação", () => {
  it("diz quantos obrigatórios faltam e quais", () => {
    const summary = run(sample("frontend-senior")).summary.join(" ");
    expect(summary).toContain("0 de 7 requisitos obrigatórios");
    expect(summary).toContain("React");
  });

  it("explica senioridade e idioma quando tiram pontos", () => {
    const summary = run(sample("frontend-senior")).summary.join(" ");
    expect(summary).toContain("Sênior");
    expect(summary).toContain("inglês fluente");
  });

  it("avisa quando a vaga não tem seções", () => {
    expect(run(FLUTTER_NO_SECTIONS).summary.join(" ")).toContain("mesmo peso");
  });

  it("traz modelo de trabalho, contrato e salário", () => {
    const result = run(sample("backend-pleno"));
    expect(result.workModel?.label).toBe("Híbrido");
    expect(result.contracts).toEqual(["CLT"]);
    expect(result.salary).toBe("R$ 9.500 a R$ 12.800");
  });
});

describe("destaques no texto da vaga", () => {
  it.each(ALL_JOBS.map((job, i) => [i, job] as const))("vaga %i: cada destaque aponta para o termo original", (_i, job) => {
    const result = run(job);
    for (const span of result.highlights) {
      const slice = job.slice(span.start, span.end);
      expect(skillIdsIn(slice).has(span.skillId)).toBe(true);
    }
  });

  it("pinta de verde o que você tem e de vermelho o que falta", () => {
    const job = sample("backend-pleno");
    const result = run(job);
    const status = (term: string) => result.highlights.find((h) => job.slice(h.start, h.end) === term)?.status;
    expect(status("PostgreSQL")).toBe("tem");
    expect(status("Kubernetes")).toBe("falta");
  });
});

describe("sugestões de reescrita", () => {
  it("sugere escrever o termo como a vaga escreve", () => {
    const termo = run(sample("backend-pleno")).suggestions.find((s) => s.kind === "termo");
    expect(termo?.before).toContain("Postgres ");
    expect(termo?.after).toContain("PostgreSQL");
    expect(termo?.after).toBe(termo?.before?.replace("Postgres", "PostgreSQL"));
  });

  it("não troca ferramentas diferentes que moram no mesmo grupo", () => {
    const result = run("Dev\nRequisitos\n- Jest", "Experiência\n- Criei a suíte de testes do app com Vitest e React.");
    expect(result.suggestions.filter((s) => s.kind === "termo")).toEqual([]);
  });

  it("não troca abreviação por termo mais curto da vaga", () => {
    const result = run("Dev\nRequisitos\n- JS", "Experiência\n- Construí o checkout inteiro em JavaScript puro para 3 lojas.");
    expect(result.suggestions.filter((s) => s.kind === "termo")).toEqual([]);
  });

  it("sugere mostrar em qual experiência você usou o que está só na lista", () => {
    const destaque = run(sample("backend-pleno")).suggestions.find((s) => s.kind === "destaque");
    expect(destaque?.title).toContain("Docker");
    expect(destaque?.after).toMatch(/usando .*Docker/);
    expect(destaque?.body).toContain("Se você usou");
  });

  it("aponta obrigatórios ausentes sem colocá-los em nenhum texto reescrito", () => {
    const result = run(sample("frontend-senior"));
    const lacuna = result.suggestions.find((s) => s.kind === "lacuna");
    expect(lacuna?.body).toContain("não invente");
    expect(lacuna?.after).toBeNull();
  });

  it.each(ALL_JOBS.flatMap((job, j) => ALL_RESUMES.map((resume, r) => [j, r, job, resume] as const)))(
    "vaga %i x currículo %i: nunca inventa habilidade que o currículo não tem",
    (_j, _r, job, resume) => {
      const own = new Set(parseResume(resume, TODAY).skills.keys());
      for (const suggestion of run(job, resume).suggestions) {
        if (!suggestion.after) continue;
        const beforeIds = suggestion.before ? skillIdsIn(suggestion.before) : new Set<string>();
        for (const id of skillIdsIn(suggestion.after)) {
          if (beforeIds.has(id)) continue;
          expect(own.has(id), `${suggestion.kind}: ${id} em "${suggestion.after}"`).toBe(true);
        }
      }
    },
  );

  it("limita a quantidade de sugestões", () => {
    for (const job of ALL_JOBS) expect(run(job).suggestions.length).toBeLessThanOrEqual(6);
  });

  it("pede o inglês quando a vaga exige e o currículo não fala", () => {
    const result = run(sample("frontend-senior"), FRONT_RESUME);
    expect(result.suggestions.find((s) => s.kind === "idioma")?.after).toBe("Inglês: fluente");
  });

  it("pede datas quando não dá para saber o nível", () => {
    const result = run(sample("backend-pleno"), "Skills: Python, Django, Docker");
    expect(result.suggestions.some((s) => s.kind === "nivel")).toBe(true);
  });
});
