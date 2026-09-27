import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, "package.json"), "utf8")) as { version: string; description: string };

const ICONS = { "16": "icons/icon-16.png", "32": "icons/icon-32.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" };

export const manifest = {
  manifest_version: 3,
  name: "Vaga Match",
  version: pkg.version,
  description: "Compara o seu currículo com a vaga aberta na tela: nota de 0 a 100, o que você tem, o que falta e como ajustar. Tudo no navegador.",
  minimum_chrome_version: "116",
  action: { default_popup: "popup.html", default_title: "Vaga Match: analisar esta vaga", default_icon: ICONS },
  options_ui: { page: "options.html", open_in_tab: true },
  background: { service_worker: "background.js", type: "module" },
  permissions: ["activeTab", "scripting", "storage"],
  icons: ICONS,
};

function emitManifest(): Plugin {
  return {
    name: "vaga-match-manifest",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.json", source: `${JSON.stringify(manifest, null, 2)}\n` });
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, "src/extension"),
  base: "/",
  publicDir: resolve(import.meta.dirname, "src/extension/public"),
  plugins: [emitManifest()],
  build: {
    outDir: resolve(import.meta.dirname, "dist/extension"),
    emptyOutDir: true,
    target: "es2022",
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, "src/extension/popup.html"),
        options: resolve(import.meta.dirname, "src/extension/options.html"),
        background: resolve(import.meta.dirname, "src/extension/background.ts"),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js"),
        assetFileNames: (info) => (info.names.some((name) => name.endsWith(".mjs")) ? "assets/[name]-[hash].js" : "assets/[name]-[hash][extname]"),
      },
    },
  },
});
