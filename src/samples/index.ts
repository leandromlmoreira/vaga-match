export interface SampleJob {
  readonly id: string;
  readonly label: string;
  readonly company: string;
  readonly source: string;
  readonly text: string;
}

export const SAMPLE_RESUME = `Marina Duarte Costa
Desenvolvedora Back-end Pleno · Belo Horizonte, MG
marina.duarte@exemplo.dev · github.com/marina-duarte-exemplo

Resumo
Desenvolvedora back-end com foco em APIs e dados financeiros. Gosto de sistemas fáceis de operar e de código que a próxima pessoa do time entende sem pedir ajuda.

Experiência
Desenvolvedora Back-end · Grão Direto Logística
mar/2022 - atual
- Desenvolvi APIs REST em Python com Django para o módulo de fretes, que hoje atende 40 mil requisições por dia.
- Modelei tabelas e escrevi consultas no Postgres para os relatórios de faturamento do time financeiro.
- Criei a suíte de testes automatizados com pytest e levei a cobertura do módulo de 35% para 81%.
- Participei de code review e pareamento com as pessoas que entraram no time depois de mim.

Desenvolvedora Júnior · Casa Pixel Software
fev/2020 - fev/2022
- Mantive integrações com gateways de pagamento escritas em Node.js e JavaScript.
- Automatizei a conciliação diária de pagamentos com scripts em Python agendados no Linux.

Habilidades
Python, Django, FastAPI, Postgres, Redis, Docker, Git, JavaScript, Node.js, Linux, pytest, Scrum

Idiomas
Inglês intermediário, leitura técnica tranquila

Formação
Sistemas de Informação · PUC Minas · 2016 - 2019
`;

export const SAMPLE_JOBS: readonly SampleJob[] = [
  {
    id: "backend-pleno",
    label: "Back-end Pleno",
    company: "Ribeira Pagamentos",
    source: "Gupy",
    text: `Pessoa Desenvolvedora Back-end Pleno (Python)
Ribeira Pagamentos · São Paulo, SP · Híbrido

Sobre a vaga
Na Ribeira, o time de Recebíveis cuida do dinheiro que entra na conta de 30 mil lojistas todos os dias. Você vai construir e manter os serviços que calculam, antecipam e liquidam esses valores.

Responsabilidades
- Desenvolver e evoluir APIs REST usadas pelo app e pelos parceiros;
- Escrever testes automatizados e revisar o código do time em code reviews;
- Acompanhar métricas e alertas dos serviços em produção com Datadog;
- Conversar com produto para quebrar problemas grandes em entregas pequenas.

Requisitos e qualificações
- Experiência sólida com Python e Django ou FastAPI;
- Vivência com PostgreSQL: modelagem, índices e consultas que não travam o banco;
- Docker no dia a dia de desenvolvimento;
- Git e fluxo de pull requests;
- Pelo menos 3 anos de experiência com desenvolvimento back-end.

Diferenciais
- Kubernetes e AWS;
- Mensageria com Kafka ou RabbitMQ;
- Terraform;
- Inglês intermediário para ler documentação.

Modelo de trabalho: híbrido, 2 dias por semana no escritório da Vila Madalena.
Contratação CLT · Faixa salarial de R$ 9.500 a R$ 12.800.

Benefícios
Vale-refeição, plano de saúde, Gympass e auxílio home office.`,
  },
  {
    id: "frontend-senior",
    label: "Front-end Sênior",
    company: "Lumen Health",
    source: "LinkedIn Vagas",
    text: `Senior Frontend Engineer
Lumen Health · Remote (Brazil)

About the role
Lumen Health builds scheduling software used by 900 clinics. You will own the patient-facing web app and work closely with our designers on a shared design system.

What you'll do
- Ship features end to end in our React and TypeScript codebase;
- Keep the app fast and accessible for patients on low-end phones;
- Review pull requests and mentor two mid-level engineers.

What we're looking for
- 5+ years of experience building web applications;
- Deep knowledge of React, TypeScript and Next.js;
- Experience with GraphQL APIs;
- Strong testing habits with Jest and Playwright;
- Accessibility (WCAG) is not optional for us;
- Fluent English: the whole team writes and meets in English.

Nice to have
- Storybook and design systems experience;
- Some Node.js on the backend.

This is a fully remote position. Contractor (PJ) or CLT.`,
  },
  {
    id: "dados-junior",
    label: "Dados Júnior",
    company: "Cooperativa Vale do Sapucaí",
    source: "Vagas.com",
    text: `Analista de Engenharia de Dados Júnior
Cooperativa Vale do Sapucaí · Pouso Alegre, MG

Descrição
A cooperativa reúne 4.200 produtores de café e leite. O time de dados está nascendo e vai organizar as informações de entregas, preços e qualidade para as áreas comerciais.

Atividades
- Construir e manter pipelines de dados com Python e Airflow;
- Escrever transformações em SQL com dbt;
- Publicar tabelas no BigQuery para os dashboards das áreas;
- Documentar as tabelas e as regras de negócio.

Requisitos
- SQL (obrigatório);
- Python para manipular dados, com Pandas;
- Git;
- Formação completa ou em andamento em Computação, Estatística ou áreas afins.

Desejável
- Power BI;
- Docker;
- Noções de Google Cloud.

Regime: presencial, de segunda a sexta, na sede em Pouso Alegre.
Contratação CLT.`,
  },
];
