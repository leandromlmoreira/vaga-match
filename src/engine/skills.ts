export type SkillCategory =
  | "linguagem"
  | "frontend"
  | "backend"
  | "mobile"
  | "dados"
  | "banco"
  | "cloud"
  | "devops"
  | "testes"
  | "pratica"
  | "ferramenta"
  | "idioma";

export interface SkillDef {
  readonly id: string;
  readonly label: string;
  readonly category: SkillCategory;
  readonly aliases: readonly string[];
  readonly cased?: readonly RegExp[];
  readonly implies?: readonly string[];
}

export const CATEGORY_LABEL: Record<SkillCategory, string> = {
  linguagem: "Linguagens",
  frontend: "Front-end",
  backend: "Back-end",
  mobile: "Mobile",
  dados: "Dados",
  banco: "Bancos de dados",
  cloud: "Nuvem",
  devops: "DevOps",
  testes: "Testes",
  pratica: "Práticas",
  ferramenta: "Ferramentas",
  idioma: "Idiomas",
};

export const SKILLS: readonly SkillDef[] = [
  { id: "javascript", label: "JavaScript", category: "linguagem", aliases: ["javascript", "js", "ecmascript", "es6", "es2015", "vanilla js"] },
  { id: "typescript", label: "TypeScript", category: "linguagem", aliases: ["typescript", "ts"], implies: ["javascript"] },
  { id: "python", label: "Python", category: "linguagem", aliases: ["python", "python3", "python 3"] },
  { id: "java", label: "Java", category: "linguagem", aliases: ["java", "java 8", "java 11", "java 17", "java 21", "jvm"] },
  { id: "kotlin", label: "Kotlin", category: "linguagem", aliases: ["kotlin"] },
  { id: "csharp", label: "C#", category: "linguagem", aliases: ["c#", "csharp", "c sharp"] },
  { id: "cpp", label: "C++", category: "linguagem", aliases: ["c++", "cpp"] },
  { id: "c", label: "C", category: "linguagem", aliases: ["linguagem c", "ansi c", "embedded c", "c/c++"] },
  {
    id: "go",
    label: "Go",
    category: "linguagem",
    aliases: ["golang", "go lang"],
    cased: [/(?<![\w.#/&-])Go(?![\w'-])(?!\s+(?:to|live|ahead|back|further|beyond|through|for|with|on)\b)/g],
  },
  { id: "rust", label: "Rust", category: "linguagem", aliases: ["rust"] },
  { id: "php", label: "PHP", category: "linguagem", aliases: ["php", "php 8", "php8"] },
  { id: "ruby", label: "Ruby", category: "linguagem", aliases: ["ruby"] },
  { id: "elixir", label: "Elixir", category: "linguagem", aliases: ["elixir"] },
  { id: "scala", label: "Scala", category: "linguagem", aliases: ["scala"] },
  { id: "swift", label: "Swift", category: "linguagem", aliases: ["swift", "swiftui"] },
  { id: "dart", label: "Dart", category: "linguagem", aliases: ["dart"] },
  {
    id: "r",
    label: "R",
    category: "linguagem",
    aliases: ["linguagem r", "r language", "rstudio", "tidyverse"],
    cased: [/(?<![\w.#&/'$-])R(?![\w$&.+#/'-])(?=\s*(?:[,;)]|e\s|and\s|$))/gm],
  },
  { id: "sql", label: "SQL", category: "banco", aliases: ["sql", "t-sql", "tsql", "consultas sql", "queries sql"] },
  { id: "bash", label: "Shell script", category: "ferramenta", aliases: ["bash", "shell script", "shell scripting", "shellscript", "powershell"] },

  { id: "html", label: "HTML", category: "frontend", aliases: ["html", "html5"] },
  { id: "css", label: "CSS", category: "frontend", aliases: ["css", "css3", "css-in-js", "styled-components", "styled components"] },
  { id: "sass", label: "Sass", category: "frontend", aliases: ["sass", "scss"], implies: ["css"] },
  { id: "tailwind", label: "Tailwind CSS", category: "frontend", aliases: ["tailwind", "tailwindcss", "tailwind css"], implies: ["css"] },
  { id: "react", label: "React", category: "frontend", aliases: ["react", "reactjs", "react.js", "react js", "react hooks"], implies: ["javascript"] },
  { id: "react-native", label: "React Native", category: "mobile", aliases: ["react native", "react-native", "expo"], implies: ["react", "javascript"] },
  { id: "nextjs", label: "Next.js", category: "frontend", aliases: ["next.js", "nextjs", "next js"], implies: ["react", "javascript"] },
  { id: "redux", label: "Redux", category: "frontend", aliases: ["redux", "redux toolkit", "zustand", "context api"], implies: ["react"] },
  { id: "vue", label: "Vue.js", category: "frontend", aliases: ["vue", "vue.js", "vuejs", "vue js", "vue 3", "vuex", "pinia"], implies: ["javascript"] },
  { id: "nuxt", label: "Nuxt", category: "frontend", aliases: ["nuxt", "nuxt.js", "nuxtjs"], implies: ["vue", "javascript"] },
  { id: "angular", label: "Angular", category: "frontend", aliases: ["angular", "angularjs", "angular.js", "rxjs"], implies: ["typescript"] },
  { id: "svelte", label: "Svelte", category: "frontend", aliases: ["svelte", "sveltekit"], implies: ["javascript"] },
  { id: "jquery", label: "jQuery", category: "frontend", aliases: ["jquery"], implies: ["javascript"] },
  { id: "webpack", label: "Webpack / Vite", category: "frontend", aliases: ["webpack", "vite", "rollup", "esbuild", "bundlers"] },
  { id: "storybook", label: "Storybook", category: "frontend", aliases: ["storybook"] },
  { id: "a11y", label: "Acessibilidade", category: "frontend", aliases: ["acessibilidade", "accessibility", "a11y", "wcag", "aria"] },
  { id: "seo", label: "SEO", category: "frontend", aliases: ["seo"] },
  { id: "figma", label: "Figma", category: "ferramenta", aliases: ["figma"] },
  { id: "design-system", label: "Design system", category: "frontend", aliases: ["design system", "design systems", "biblioteca de componentes", "component library"] },
  { id: "responsive", label: "Responsividade", category: "frontend", aliases: ["responsividade", "responsivo", "responsive design", "layout responsivo", "responsive", "mobile first", "mobile-first"] },

  { id: "nodejs", label: "Node.js", category: "backend", aliases: ["node.js", "nodejs", "node", "node js"], implies: ["javascript"] },
  { id: "express", label: "Express", category: "backend", aliases: ["express.js", "expressjs", "fastify", "koa"], cased: [/(?<![\w.-])Express(?![\w.-])(?=\s*(?:[,;/)]|e\s|and\s|$))/gm], implies: ["nodejs"] },
  { id: "nestjs", label: "NestJS", category: "backend", aliases: ["nestjs", "nest.js", "nest js"], implies: ["nodejs", "typescript"] },
  { id: "django", label: "Django", category: "backend", aliases: ["django", "django rest framework", "drf"], implies: ["python"] },
  { id: "flask", label: "Flask", category: "backend", aliases: ["flask"], implies: ["python"] },
  { id: "fastapi", label: "FastAPI", category: "backend", aliases: ["fastapi", "fast api"], implies: ["python"] },
  { id: "spring", label: "Spring Boot", category: "backend", aliases: ["spring boot", "springboot", "spring", "spring framework", "spring cloud"], implies: ["java"] },
  { id: "hibernate", label: "JPA / Hibernate", category: "backend", aliases: ["hibernate", "jpa", "spring data"], implies: ["java"] },
  { id: "dotnet", label: ".NET", category: "backend", aliases: [".net", "dotnet", ".net core", "asp.net", "asp.net core", "asp net", "entity framework", "net core"], implies: ["csharp"] },
  { id: "laravel", label: "Laravel", category: "backend", aliases: ["laravel", "symfony"], implies: ["php"] },
  { id: "rails", label: "Ruby on Rails", category: "backend", aliases: ["ruby on rails", "rails", "ror"], implies: ["ruby"] },
  { id: "rest", label: "APIs REST", category: "backend", cased: [/(?<![\w-])REST(?![\w-])/g], aliases: ["restful", "api rest", "apis rest", "rest api", "rest apis", "apis restful", "api restful"] },
  { id: "graphql", label: "GraphQL", category: "backend", aliases: ["graphql", "apollo"] },
  { id: "grpc", label: "gRPC", category: "backend", aliases: ["grpc", "protobuf"] },
  { id: "microservices", label: "Microsserviços", category: "backend", aliases: ["microsservicos", "microservicos", "microservices", "micro servicos", "microservice", "arquitetura de microsservicos"] },
  { id: "messaging", label: "Mensageria", category: "backend", aliases: ["mensageria", "filas", "message queue", "message broker", "event-driven", "orientada a eventos", "event driven", "pub/sub"] },
  { id: "kafka", label: "Kafka", category: "backend", aliases: ["kafka", "apache kafka"], implies: ["messaging"] },
  { id: "rabbitmq", label: "RabbitMQ", category: "backend", aliases: ["rabbitmq", "rabbit mq", "amqp"], implies: ["messaging"] },
  { id: "prisma", label: "ORM (Prisma, TypeORM)", category: "backend", aliases: ["prisma", "typeorm", "sequelize", "drizzle", "orm", "sqlalchemy"] },
  { id: "websocket", label: "WebSockets", category: "backend", aliases: ["websocket", "websockets", "socket.io"] },
  { id: "auth", label: "Autenticação (OAuth, JWT)", category: "backend", aliases: ["oauth", "oauth2", "oauth 2.0", "jwt", "openid connect", "keycloak", "autenticacao e autorizacao"] },

  { id: "postgresql", label: "PostgreSQL", category: "banco", aliases: ["postgresql", "postgres", "psql", "pgsql"], implies: ["sql"] },
  { id: "mysql", label: "MySQL", category: "banco", aliases: ["mysql", "mariadb"], implies: ["sql"] },
  { id: "sqlserver", label: "SQL Server", category: "banco", aliases: ["sql server", "sqlserver", "mssql", "ms sql"], implies: ["sql"] },
  { id: "oracle", label: "Oracle", category: "banco", aliases: ["oracle", "oracle database", "pl/sql", "plsql"], implies: ["sql"] },
  { id: "sqlite", label: "SQLite", category: "banco", aliases: ["sqlite"], implies: ["sql"] },
  { id: "mongodb", label: "MongoDB", category: "banco", aliases: ["mongodb", "mongo", "mongoose"] },
  { id: "redis", label: "Redis", category: "banco", aliases: ["redis", "memcached"] },
  { id: "dynamodb", label: "DynamoDB", category: "banco", aliases: ["dynamodb", "dynamo db"], implies: ["aws"] },
  { id: "elasticsearch", label: "Elasticsearch", category: "banco", aliases: ["elasticsearch", "elastic search", "opensearch", "elk"] },
  { id: "nosql", label: "NoSQL", category: "banco", aliases: ["nosql", "no-sql", "bancos nao relacionais", "banco nao relacional"] },
  { id: "firebase", label: "Firebase", category: "cloud", aliases: ["firebase", "firestore"] },
  { id: "supabase", label: "Supabase", category: "cloud", aliases: ["supabase"], implies: ["postgresql"] },

  { id: "aws", label: "AWS", category: "cloud", aliases: ["aws", "amazon web services", "ec2", "s3", "aws lambda", "rds", "ecs", "cloudformation", "sqs", "sns", "cloudwatch", "api gateway"] },
  { id: "gcp", label: "Google Cloud", category: "cloud", aliases: ["gcp", "google cloud", "google cloud platform", "cloud run", "gke", "cloud functions"] },
  { id: "azure", label: "Azure", category: "cloud", aliases: ["azure", "microsoft azure", "azure devops", "aks"] },
  { id: "serverless", label: "Serverless", category: "cloud", aliases: ["serverless", "lambda", "funcoes serverless", "cloud functions"] },
  { id: "docker", label: "Docker", category: "devops", aliases: ["docker", "docker compose", "docker-compose", "dockerfile", "containers", "conteineres", "conteiner", "containerizacao", "container"] },
  { id: "kubernetes", label: "Kubernetes", category: "devops", aliases: ["kubernetes", "k8s", "helm", "eks", "openshift"] },
  { id: "terraform", label: "Terraform", category: "devops", aliases: ["terraform", "pulumi"], implies: ["iac"] },
  { id: "iac", label: "Infraestrutura como código", category: "devops", aliases: ["infraestrutura como codigo", "infrastructure as code", "iac", "ansible"] },
  { id: "cicd", label: "CI/CD", category: "devops", aliases: ["ci/cd", "ci cd", "ci-cd", "cicd", "integracao continua", "continuous integration", "entrega continua", "continuous delivery", "continuous deployment", "deploy continuo", "pipelines", "pipeline de deploy", "esteira de deploy", "esteiras"] },
  { id: "github-actions", label: "GitHub Actions", category: "devops", aliases: ["github actions", "gitlab ci", "jenkins", "circleci", "azure pipelines", "bitbucket pipelines"], implies: ["cicd"] },
  { id: "linux", label: "Linux", category: "devops", aliases: ["linux", "ubuntu", "debian", "unix"] },
  { id: "nginx", label: "Nginx", category: "devops", aliases: ["nginx", "apache http", "load balancer"] },
  { id: "observability", label: "Observabilidade", category: "devops", aliases: ["observabilidade", "observability", "monitoramento", "monitoring", "logs estruturados", "tracing", "apm"] },
  { id: "datadog", label: "Datadog / Grafana", category: "devops", aliases: ["datadog", "grafana", "prometheus", "new relic", "newrelic", "opentelemetry", "sentry", "kibana", "splunk", "dynatrace"], implies: ["observability"] },
  { id: "git", label: "Git", category: "ferramenta", aliases: ["git", "github", "gitlab", "bitbucket", "controle de versao", "version control", "versionamento de codigo", "git flow", "gitflow"] },

  { id: "tests", label: "Testes automatizados", category: "testes", aliases: ["testes automatizados", "testes unitarios", "testes de unidade", "testes de integracao", "testes e2e", "testes end-to-end", "unit tests", "unit testing", "automated tests", "automated testing", "integration tests", "testes automatizado", "testes"] },
  { id: "tdd", label: "TDD", category: "testes", aliases: ["tdd", "test driven development", "test-driven development", "bdd"], implies: ["tests"] },
  { id: "jest", label: "Jest / Vitest", category: "testes", aliases: ["jest", "vitest", "mocha", "testing library", "react testing library"], implies: ["tests"] },
  { id: "cypress", label: "Cypress / Playwright", category: "testes", aliases: ["cypress", "playwright", "selenium", "puppeteer", "webdriverio"], implies: ["tests"] },
  { id: "pytest", label: "pytest", category: "testes", aliases: ["pytest", "unittest"], implies: ["tests", "python"] },
  { id: "junit", label: "JUnit", category: "testes", aliases: ["junit", "mockito", "testng"], implies: ["tests", "java"] },
  { id: "xunit", label: "xUnit / NUnit", category: "testes", aliases: ["xunit", "nunit", "mstest"], implies: ["tests"] },

  { id: "android", label: "Android", category: "mobile", aliases: ["android", "jetpack compose", "android sdk"] },
  { id: "ios", label: "iOS", category: "mobile", aliases: ["ios", "uikit", "xcode"] },
  { id: "flutter", label: "Flutter", category: "mobile", aliases: ["flutter"], implies: ["dart"] },

  { id: "pandas", label: "Pandas / NumPy", category: "dados", aliases: ["pandas", "numpy", "polars", "scipy"], implies: ["python"] },
  { id: "spark", label: "Spark", category: "dados", aliases: ["spark", "pyspark", "apache spark", "databricks", "hadoop"] },
  { id: "airflow", label: "Airflow", category: "dados", aliases: ["airflow", "apache airflow", "prefect", "dagster"], implies: ["etl"] },
  { id: "dbt", label: "dbt", category: "dados", aliases: ["dbt", "data build tool"], implies: ["etl", "sql"] },
  { id: "etl", label: "ETL / pipelines de dados", category: "dados", aliases: ["etl", "elt", "pipelines de dados", "pipeline de dados", "data pipelines", "data pipeline", "engenharia de dados", "data engineering", "ingestao de dados"] },
  { id: "warehouse", label: "Data warehouse", category: "dados", aliases: ["data warehouse", "datawarehouse", "dw", "data lake", "datalake", "lakehouse", "snowflake", "bigquery", "redshift"] },
  { id: "bi", label: "Power BI / BI", category: "dados", aliases: ["power bi", "powerbi", "tableau", "looker", "metabase", "business intelligence", "dashboards", "qlik"] },
  { id: "excel", label: "Excel", category: "ferramenta", aliases: ["excel", "planilhas", "google sheets", "spreadsheets"] },
  { id: "ml", label: "Machine learning", category: "dados", aliases: ["machine learning", "aprendizado de maquina", "ml", "scikit-learn", "sklearn", "modelos preditivos", "xgboost"] },
  { id: "deep-learning", label: "Deep learning", category: "dados", aliases: ["deep learning", "tensorflow", "pytorch", "keras", "redes neurais", "neural networks"], implies: ["ml"] },
  { id: "llm", label: "LLMs / IA generativa", category: "dados", aliases: ["llm", "llms", "ia generativa", "generative ai", "genai", "rag", "langchain", "openai", "prompt engineering", "engenharia de prompt"] },
  { id: "statistics", label: "Estatística", category: "dados", aliases: ["estatistica", "statistics", "statistical", "testes a/b", "a/b testing", "ab testing"] },

  { id: "agile", label: "Métodos ágeis", category: "pratica", aliases: ["metodologias ageis", "metodos ageis", "agil", "ageis", "agile", "scrum", "kanban", "sprints", "sprint"] },
  { id: "clean-code", label: "Clean code / SOLID", category: "pratica", cased: [/(?<![\w-])SOLID(?![\w-])/g], aliases: ["clean code", "codigo limpo", "boas praticas de codigo", "clean architecture", "arquitetura limpa", "arquitetura hexagonal", "hexagonal architecture", "design patterns", "padroes de projeto"] },
  { id: "ddd", label: "DDD", category: "pratica", aliases: ["ddd", "domain driven design", "domain-driven design"] },
  { id: "system-design", label: "Arquitetura de sistemas", category: "pratica", aliases: ["arquitetura de software", "arquitetura de sistemas", "system design", "software architecture", "sistemas distribuidos", "distributed systems", "escalabilidade", "scalability", "alta disponibilidade"] },
  { id: "code-review", label: "Code review", category: "pratica", aliases: ["code review", "code reviews", "revisao de codigo", "revisoes de codigo", "pull requests", "pull request"] },
  { id: "mentoring", label: "Mentoria", category: "pratica", aliases: ["mentoria", "mentorar", "mentoring", "mentor", "mentorship"] },
  { id: "leadership", label: "Liderança técnica", category: "pratica", aliases: ["lideranca tecnica", "technical leadership", "tech lead", "lideranca de time", "lideranca de equipe", "team leadership"] },
  { id: "docs", label: "Documentação técnica", category: "pratica", aliases: ["documentacao tecnica", "technical documentation", "documentacao de apis", "swagger", "openapi", "adr", "adrs"] },
  { id: "security", label: "Segurança (OWASP)", category: "pratica", aliases: ["owasp", "seguranca da informacao", "application security", "appsec", "lgpd", "seguranca de aplicacoes"] },
  { id: "performance", label: "Performance", category: "pratica", aliases: ["otimizacao de performance", "performance web", "performance de aplicacoes", "web vitals", "core web vitals", "otimizacao de consultas", "profiling"] },
  { id: "product", label: "Visão de produto", category: "pratica", aliases: ["visao de produto", "product mindset", "mentalidade de produto", "discovery", "product discovery"] },

  { id: "jira", label: "Jira", category: "ferramenta", aliases: ["jira", "confluence", "trello", "clickup"] },
  { id: "spanish", label: "Espanhol", category: "idioma", aliases: ["espanhol", "spanish", "espanol"] },
];

export const SKILL_BY_ID: ReadonlyMap<string, SkillDef> = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function skillLabel(id: string): string {
  return SKILL_BY_ID.get(id)?.label ?? id;
}

export function impliedBy(ids: Iterable<string>): Map<string, string> {
  const implied = new Map<string, string>();
  const direct = new Set(ids);
  const queue = [...direct].map((id) => ({ id, source: id }));
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const target of SKILL_BY_ID.get(current.id)?.implies ?? []) {
      if (direct.has(target) || implied.has(target)) continue;
      implied.set(target, current.source);
      queue.push({ id: target, source: current.source });
    }
  }
  return implied;
}
