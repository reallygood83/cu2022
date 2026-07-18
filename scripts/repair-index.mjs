#!/usr/bin/env node
/**
 * Re-run quality heuristics on data/standards.json (no PDF re-extract).
 * Full multi-source repair (wiki/PDF) is maintained as Python one-shot in PLAN;
 * this script re-flags truncated_suspect + strips 탐구/해설 noise.
 *
 * Usage: node scripts/repair-index.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA = join(process.cwd(), "data", "standards.json");

function isComplete(text) {
  const t = (text || "").trim();
  if (t.length < 8) return false;
  if (/(다|요|음|함|임|됨)\s*\.?\s*$/.test(t)) return true;
  if (/(수 있다|할 수 있다|한다|된다|보인다)\s*\.?\s*$/.test(t)) return true;
  if (/(의|을|를|이|가|은|는|와|과|로|으로|한|할|하는|하며|하고|하여|설|여)\s*$/.test(t))
    return false;
  if (/(그|이|저|및|등|또|또한|또는)\s*$/.test(t)) return false;
  return t.length >= 40 && /[다요]\s*\.?\s*$/.test(t);
}

function stripNoise(t) {
  let s = t || "";
  s = s.split(
    /(?:<탐구\s*활동>|탐구\s*활동|\(가\)\s*성취기준\s*해설|성취기준\s*해설|성취기준\s*적용\s*시)/,
  )[0];
  s = s.replace(/\s+/g, " ").replace(/(다|요)\s+\./g, "$1.").trim();
  const m = s.match(/^(.{10,500}?다)\s*\.?/);
  if (m) {
    let body = m[1].trim();
    if (!body.endsWith(".")) body += ".";
    const rest = s.slice(m[0].length).trim();
    if (!rest || /^[<\(•·]/.test(rest) || !isComplete(s)) s = body;
  }
  return s.trim();
}

const raw = JSON.parse(readFileSync(DATA, "utf8"));
const standards = raw.standards;
let stripped = 0;
let flagged = 0;

for (const s of standards) {
  const before = s.text;
  const after = stripNoise(before);
  if (after !== before && after.length >= 10) {
    s.text = after;
    stripped++;
  }
  if (isComplete(s.text)) {
    if (s.quality === "truncated_suspect") delete s.quality;
  } else {
    s.quality = "truncated_suspect";
    flagged++;
  }
}

const high = standards.filter((s) => s.schoolLevel === "high");
const highTrunc = high.filter((s) => s.quality === "truncated_suspect");
const highGen = high.filter((s) => s.subject !== "전문교과");
const highGenTrunc = highGen.filter((s) => s.quality === "truncated_suspect");

raw.meta = {
  ...raw.meta,
  version: raw.meta?.version || "1.1.0",
  repairedAt: new Date().toISOString(),
  quality: {
    ...(raw.meta?.quality || {}),
    highTruncated: highTrunc.length,
    highCompletePct: Number(
      (((high.length - highTrunc.length) / Math.max(1, high.length)) * 100).toFixed(2),
    ),
    highGeneralCompletePct: Number(
      (
        ((highGen.length - highGenTrunc.length) / Math.max(1, highGen.length)) *
        100
      ).toFixed(2),
    ),
  },
};

writeFileSync(DATA, JSON.stringify({ meta: raw.meta, standards }));
writeFileSync(
  join(process.cwd(), "data", "meta.json"),
  JSON.stringify(raw.meta, null, 2),
);
writeFileSync(
  join(process.cwd(), "data", "quality-report.json"),
  JSON.stringify(
    {
      stripped,
      flagged,
      highCompletePct: raw.meta.quality.highCompletePct,
      highGeneralCompletePct: raw.meta.quality.highGeneralCompletePct,
    },
    null,
    2,
  ),
);

console.log({
  stripped,
  flagged,
  highCompletePct: raw.meta.quality.highCompletePct,
  highGeneralCompletePct: raw.meta.quality.highGeneralCompletePct,
});
