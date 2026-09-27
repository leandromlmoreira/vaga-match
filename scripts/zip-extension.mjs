import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { zipSync } from "fflate";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "dist/extension");
const target = resolve(root, process.argv[2] ?? "vaga-match.zip");

function collect(dir, files = {}) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collect(full, files);
    else files[relative(source, full).split("\\").join("/")] = [readFileSync(full), { mtime: new Date("2026-01-01T00:00:00Z") }];
  }
  return files;
}

const files = collect(source);
if (!files["manifest.json"]) throw new Error("Rode npm run build:ext antes de gerar o zip.");
writeFileSync(target, zipSync(files, { level: 9 }));
process.stdout.write(`${relative(root, target)}: ${Object.keys(files).length} arquivos\n`);
