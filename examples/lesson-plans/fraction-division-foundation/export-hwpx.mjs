#!/usr/bin/env node
/**
 * Spike: Markdown 과정안 → HWPX (kordoc markdownToHwpx)
 * Usage: node export-hwpx.mjs
 * Requires: npm i kordoc (dev) in repo root
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
let markdownToHwpx;
try {
  ({ markdownToHwpx } = await import(
    join(root, "node_modules/kordoc/dist/index.js")
  ).catch(() => import("kordoc")));
} catch {
  console.error("Install kordoc: npm i kordoc");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(here, "03-과정안-1장-compact.md"), "utf8");
const out = join(here, "03-과정안-1장.hwpx");
const buf = Buffer.from(await markdownToHwpx(md));
writeFileSync(out, buf);
console.log("OK", out, buf.length, "bytes");
