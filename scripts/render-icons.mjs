import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const svg = readFileSync(resolve(root, "src/extension/public/icons/icon.svg"), "utf8");
const targets = [
  [16, "src/extension/public/icons/icon-16.png"],
  [32, "src/extension/public/icons/icon-32.png"],
  [48, "src/extension/public/icons/icon-48.png"],
  [128, "src/extension/public/icons/icon-128.png"],
  [32, "src/site/public/favicon-32.png"],
  [180, "src/site/public/apple-touch-icon.png"],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [size, file] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.locator("svg").screenshot({ path: resolve(root, file), omitBackground: true });
}
await browser.close();
