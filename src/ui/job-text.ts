import { JOB_RULES } from "../engine/job";
import { detectHeading } from "../engine/sections";
import { isBulletLine, splitLines, stripBullet } from "../engine/text";
import type { HighlightSpan } from "../engine/types";
import { h } from "./dom";

const STATUS_TEXT: Record<HighlightSpan["status"], string> = {
  tem: "você tem",
  inferido: "deduzido do seu currículo",
  falta: "falta no seu currículo",
};

function markedLine(text: string, offset: number, spans: readonly HighlightSpan[]): (Node | string)[] {
  const parts: (Node | string)[] = [];
  let cursor = 0;
  for (const span of spans) {
    const start = span.start - offset;
    const end = span.end - offset;
    if (end <= 0 || start >= text.length || start < cursor) continue;
    parts.push(text.slice(cursor, start));
    parts.push(h("mark", { class: "vm-mark", "data-status": span.status, title: STATUS_TEXT[span.status] }, text.slice(start, end), h("span", { class: "vm-sr" }, ` (${STATUS_TEXT[span.status]})`)));
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return parts;
}

export function renderJobText(text: string, highlights: readonly HighlightSpan[]): HTMLElement {
  const root = h("div", { class: "vm-jobtext" });
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  let list: HTMLUListElement | null = null;
  let first = true;
  for (const line of splitLines(text)) {
    const content = line.text.trim();
    if (content.length === 0) {
      list = null;
      continue;
    }
    const spans = sorted.filter((s) => s.start >= line.start && s.end <= line.end);
    if (first) {
      first = false;
      root.append(h("h3", { class: "vm-jobtext__title" }, markedLine(line.text, line.start, spans)));
      continue;
    }
    const heading = detectHeading(line.text, JOB_RULES);
    if (heading && heading.bodyOffset >= line.text.length) {
      list = null;
      root.append(h("h4", { class: "vm-jobtext__heading" }, content.replace(/:$/, "")));
      continue;
    }
    if (isBulletLine(line.text)) {
      const stripped = stripBullet(line.text);
      const offset = line.start + line.text.indexOf(stripped);
      if (!list) {
        list = h("ul", { class: "vm-jobtext__list" });
        root.append(list);
      }
      list.append(h("li", {}, markedLine(stripped, offset, spans)));
      continue;
    }
    list = null;
    root.append(h("p", {}, markedLine(line.text, line.start, spans)));
  }
  return root;
}
