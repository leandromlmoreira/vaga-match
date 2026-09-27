export type SiteId = "linkedin" | "gupy" | "indeed" | "vagas" | "generico";
export type ExtractionSource = "selecao" | "vaga" | "pagina";

export interface PageExtraction {
  readonly site: SiteId;
  readonly siteLabel: string;
  readonly source: ExtractionSource;
  readonly title: string;
  readonly text: string;
  readonly url: string;
}

export function extractJobFromPage(): PageExtraction {
  const MAX_CHARS = 30000;
  const MIN_SELECTION = 80;
  const MIN_BODY = 200;
  const BLOCK = new Set([
    "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM",
    "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TR", "UL",
  ]);
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "BUTTON", "TEMPLATE", "IFRAME", "INPUT", "SELECT", "TEXTAREA", "CANVAS", "VIDEO", "AUDIO"]);

  interface SiteRule {
    readonly id: SiteId;
    readonly label: string;
    readonly host: RegExp;
    readonly title: readonly string[];
    readonly meta: readonly string[];
    readonly body: readonly string[];
  }

  const SITES: readonly SiteRule[] = [
    {
      id: "linkedin",
      label: "LinkedIn Vagas",
      host: /(^|\.)linkedin\.com$/,
      title: [".job-details-jobs-unified-top-card__job-title", ".jobs-unified-top-card__job-title", ".top-card-layout__title", "h1"],
      meta: [
        ".job-details-jobs-unified-top-card__primary-description-container",
        ".job-details-jobs-unified-top-card__tertiary-description-container",
        ".job-details-preferences-and-skills",
        ".job-details-fit-level-preferences",
        ".jobs-unified-top-card__workplace-type",
        ".topcard__flavor-row",
        ".description__job-criteria-list",
      ],
      body: [".jobs-description__content", ".jobs-description-content__text", ".jobs-box__html-content", "#job-details", ".show-more-less-html__markup", ".description__text"],
    },
    {
      id: "gupy",
      label: "Gupy",
      host: /(^|\.)gupy\.io$/,
      title: ["[data-testid='job-title']", "h1"],
      meta: ["[data-testid='job-badges']", "[data-testid='job-info']", "[data-testid='job-details-container'] ul"],
      body: ["[data-testid='job-description']", "[data-testid='text-section']", "#job-description", "main section"],
    },
    {
      id: "indeed",
      label: "Indeed",
      host: /(^|\.)indeed\.com(\.[a-z]{2})?$/,
      title: ["[data-testid='jobsearch-JobInfoHeader-title']", ".jobsearch-JobInfoHeader-title", "h1"],
      meta: ["[data-testid='jobsearch-CompanyInfoContainer']", "#salaryInfoAndJobType", "#jobDetailsSection", "[data-testid='jobsearch-OtherJobDetailsContainer']"],
      body: ["#jobDescriptionText", ".jobsearch-jobDescriptionText"],
    },
    {
      id: "vagas",
      label: "Vagas.com",
      host: /(^|\.)vagas\.com\.br$/,
      title: [".job-shortdescription__title", "h1"],
      meta: [".job-hierarchylist", ".job-shortdescription__company", ".info-localizacao", ".infoVaga"],
      body: [".job-description", ".job-tab-content", ".job-descriptions", "#JobContent"],
    },
  ];

  const hidden = (element: Element): boolean => {
    if (element.getAttribute("aria-hidden") === "true" || element.hasAttribute("hidden")) return true;
    const style = window.getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden";
  };

  const textOf = (root: Element): string => {
    const out: string[] = [];
    const walk = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        out.push((node.textContent ?? "").replace(/\s+/g, " "));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      if (SKIP.has(element.tagName.toUpperCase()) || hidden(element)) return;
      const tag = element.tagName.toUpperCase();
      const block = BLOCK.has(tag);
      if (block) out.push("\n");
      if (tag === "LI") out.push("- ");
      element.childNodes.forEach(walk);
      if (block) out.push("\n");
    };
    walk(root);
    return out
      .join("")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line, index, lines) => line.length > 0 || (lines[index - 1] ?? "").length > 0)
      .join("\n")
      .trim();
  };

  const first = (selectors: readonly string[]): Element | null => {
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found && !hidden(found) && (found.textContent ?? "").trim().length > 0) return found;
    }
    return null;
  };

  const all = (selectors: readonly string[]): Element[] => {
    for (const selector of selectors) {
      const found = [...document.querySelectorAll(selector)].filter((el) => !hidden(el));
      const text = found.map((el) => (el.textContent ?? "").trim()).join(" ");
      if (text.length >= MIN_BODY) return found;
    }
    return [];
  };

  const unique = (items: readonly string[]): string[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.trim();
      if (key.length === 0 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const host = window.location.hostname.toLowerCase();
  const site = SITES.find((rule) => rule.host.test(host));
  const base = { site: site?.id ?? "generico", siteLabel: site?.label ?? host.replace(/^www\./, ""), url: window.location.href } as const;
  const pageTitle = (site ? first(site.title) : document.querySelector("h1"))?.textContent?.trim().replace(/\s+/g, " ") ?? document.title;

  const selection = window.getSelection()?.toString().trim() ?? "";
  if (selection.length >= MIN_SELECTION) {
    const withTitle = selection.includes(pageTitle.slice(0, 20)) || pageTitle.length === 0 ? selection : `${pageTitle}\n\n${selection}`;
    return { ...base, source: "selecao", title: pageTitle, text: withTitle.slice(0, MAX_CHARS) };
  }

  if (site) {
    const bodies = all(site.body);
    if (bodies.length > 0) {
      const metaParts = site.meta.map((selector) => document.querySelector(selector)).filter((el): el is Element => el !== null && !hidden(el)).map(textOf);
      const text = unique([pageTitle, ...metaParts, ...bodies.map(textOf)]).join("\n\n");
      return { ...base, source: "vaga", title: pageTitle, text: text.slice(0, MAX_CHARS) };
    }
  }

  const candidates = ["main article", "article", "[role='main']", "main", "#main", "#content", "body"];
  for (const selector of candidates) {
    const element = document.querySelector(selector);
    if (!element || hidden(element)) continue;
    const text = textOf(element);
    if (text.length >= MIN_BODY || selector === "body") {
      const withTitle = text.length === 0 || text.startsWith(pageTitle) || pageTitle.length === 0 ? text : `${pageTitle}\n\n${text}`;
      return { ...base, source: "pagina", title: pageTitle, text: withTitle.slice(0, MAX_CHARS) };
    }
  }
  return { ...base, source: "pagina", title: pageTitle, text: "" };
}
