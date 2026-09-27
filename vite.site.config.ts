import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(import.meta.dirname, "src/site"),
  base: "/vaga-match/",
  publicDir: resolve(import.meta.dirname, "src/site/public"),
  build: {
    outDir: resolve(import.meta.dirname, "dist/site"),
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      output: {
        assetFileNames: (info) => (info.names.some((name) => name.endsWith(".mjs")) ? "assets/[name]-[hash].js" : "assets/[name]-[hash][extname]"),
      },
    },
  },
  server: { port: 5178 },
  preview: { port: 4178 },
});
