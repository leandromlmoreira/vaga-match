type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === "function") {
      element.addEventListener(key.replace(/^on/, "").toLowerCase(), value);
      continue;
    }
    if (key === "class") element.className = String(value);
    else if (value === true) element.setAttribute(key, "");
    else element.setAttribute(key, String(value));
  }
  append(element, children);
  return element;
}

export function append(parent: Node, children: (Child | Child[])[]): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === "string" || typeof child === "number" ? document.createTextNode(String(child)) : child);
  }
}

export function clear(element: Element): void {
  while (element.firstChild) element.removeChild(element.firstChild);
}

const SVG_NS = "http://www.w3.org/2000/svg";

const ICONS: Record<string, string> = {
  check: "M4 10.5l4 4 8-9",
  x: "M5 5l10 10M15 5L5 15",
  copy: "M7 7V4.5A1.5 1.5 0 018.5 3h7A1.5 1.5 0 0117 4.5v7a1.5 1.5 0 01-1.5 1.5H13M4.5 7h7A1.5 1.5 0 0113 8.5v7a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 15.5v-7A1.5 1.5 0 014.5 7z",
  refresh: "M16 10a6 6 0 11-1.8-4.3M16 3.5V7h-3.5",
  upload: "M10 13V3.5M6 7l4-4 4 4M4 13.5v2A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5v-2",
  file: "M11.5 2.5H6A1.5 1.5 0 004.5 4v12A1.5 1.5 0 006 17.5h8a1.5 1.5 0 001.5-1.5V6.5l-4-4zM11.5 2.5v4h4",
  lock: "M6 9V6.5a4 4 0 018 0V9M5 9h10a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6a1 1 0 011-1z",
  arrow: "M4 10h12M11 5l5 5-5 5",
  edit: "M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z",
  trash: "M4 6h12M8 6V4h4v2M6 6l.8 10.2A1 1 0 007.8 17h4.4a1 1 0 001-.8L14 6",
  spark: "M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4M5 5l2.2 2.2M12.8 12.8L15 15M15 5l-2.2 2.2M7.2 12.8L5 15",
  github: "M10 2a8 8 0 00-2.5 15.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 014 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.5.8.5 1.5v2.3c0 .2.1.5.6.4A8 8 0 0010 2z",
};

export function icon(name: keyof typeof ICONS | string, size = 16): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ICONS[name] ?? "");
  if (name === "github") {
    path.setAttribute("fill", "currentColor");
  } else {
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.6");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
  }
  svg.appendChild(path);
  return svg;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
