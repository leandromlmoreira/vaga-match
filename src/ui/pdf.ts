import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface TextItemLike {
  readonly str: string;
  readonly transform: readonly number[];
  readonly hasEOL?: boolean;
  readonly width?: number;
}

const MAX_PAGES = 12;

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isTextItem(item: unknown): item is TextItemLike {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

export function joinTextItems(items: readonly TextItemLike[]): string {
  let output = "";
  let lastY: number | null = null;
  let lastRight: number | null = null;
  for (const item of items) {
    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    const fontSize = Math.abs(item.transform[3] ?? 10) || 10;
    const newLine = lastY !== null && Math.abs(y - lastY) > fontSize * 0.4;
    if (newLine && !output.endsWith("\n")) output += "\n";
    const gap = !newLine && lastRight !== null && x - lastRight > fontSize * 0.15;
    if (gap && !output.endsWith("\n") && !output.endsWith(" ") && !item.str.startsWith(" ")) output += " ";
    output += item.str;
    if (item.hasEOL) output += "\n";
    if (item.str.length > 0) {
      lastY = y;
      lastRight = x + (item.width ?? 0);
    }
  }
  return output
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, useSystemFonts: false });
  const pages: string[] = [];
  try {
    const pdf = await task.promise;
    for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const items: unknown[] = content.items;
      pages.push(joinTextItems(items.filter(isTextItem)));
    }
  } finally {
    await task.destroy();
  }
  return pages.join("\n\n").trim();
}

export async function readResumeFile(file: File): Promise<string> {
  if (isPdf(file)) return extractPdfText(file);
  return (await file.text()).trim();
}
