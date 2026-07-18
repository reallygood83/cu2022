#!/usr/bin/env node
/**
 * Build compact curriculum index from local 2022 curriculum markdown sources.
 * Set CU2022_SOURCE_ROOT to the folder that contains 초등/중등/고등 교육과정 md trees.
 * High school: prefer official combined md; skip mega 전문 if CU2022_SKIP_PRO=1.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = process.env.CU2022_SOURCE_ROOT || "";
if (!ROOT || !existsSync(ROOT)) {
  console.error(
    "CU2022_SOURCE_ROOT must point to a curriculum markdown root (초등/중등/고등 폴더 포함).\n" +
      "Bundled data/standards.json is enough for normal MCP use — rebuild only when re-indexing.",
  );
  process.exit(1);
}
const OUT_DIR = join(process.cwd(), "data");
const SKIP_PRO = process.env.CU2022_SKIP_PRO === "1"; // default include pro codes but can skip for lighter package
const INCLUDE_PRO = process.env.CU2022_INCLUDE_PRO !== "0"; // default include

mkdirSync(OUT_DIR, { recursive: true });

/** @typedef {{ code: string, text: string, schoolLevel: 'elementary'|'middle'|'high', subject: string, domain?: string, gradeBand?: string, sourceFile: string }} Standard */

/** @type {Standard[]} */
const standards = [];
const seen = new Set();

function add(std) {
  const key = `${std.schoolLevel}|${std.code}|${std.text.slice(0, 40)}`;
  if (seen.has(std.code + "|" + std.schoolLevel)) {
    // prefer longer text
    const idx = standards.findIndex((s) => s.code === std.code && s.schoolLevel === std.schoolLevel);
    if (idx >= 0 && standards[idx].text.length < std.text.length) {
      standards[idx] = std;
    }
    return;
  }
  seen.add(std.code + "|" + std.schoolLevel);
  standards.push(std);
}

function cleanText(t) {
  return t.replace(/\s+/g, " ").replace(/[\.．]\s*$/, ".").trim();
}

function parseElementary(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  let subject = "공통";
  let gradeBand = "";
  let domain = "";
  for (const line of text.split("\n")) {
    const subjM = line.match(/초등학교 성취기준 \(([^)]+)\)/);
    if (subjM) {
      subject = subjM[1].trim();
      continue;
    }
    const gradeM = line.match(/### \*\*(.+)\*\*/);
    if (gradeM) {
      gradeBand = gradeM[1].replace(/\\~/g, "~").replace(/\*\*/g, "").trim();
      continue;
    }
    const domM = line.match(/^\(([0-9]+)\)\s*(.+)/);
    if (domM) {
      domain = domM[2].trim();
      continue;
    }
    // * **\[2바01-01\]** text
    let m = line.match(/\*\*\\\[([^\]]+)\\\]\*\*\s*(.+)/);
    if (!m) m = line.match(/\*\*\[([^\]]+)\]\*\*\s*(.+)/);
    if (!m) m = line.match(/^\s*\*\s+\\?\[([^\]]+)\\?\]\s*(.+)/);
    if (m) {
      add({
        code: m[1].trim(),
        text: cleanText(m[2]),
        schoolLevel: "elementary",
        subject,
        domain: domain || undefined,
        gradeBand: gradeBand || undefined,
        sourceFile: basename(file),
      });
    }
  }
}

function parseMiddleFile(file) {
  const text = readFileSync(file, "utf8");
  // subject from title or filename
  let subject = basename(file).replace(/^\d+_/, "").replace(/-성취기준\.md$/, "").replace(/\.md$/, "");
  const titleM = text.match(/^#\s*.*중학교\s*(.+?)\s*성취기준/m);
  if (titleM) subject = titleM[1].trim();
  let domain = "";
  for (const line of text.split("\n")) {
    const dm = line.match(/^##\s*\(?([0-9]+)?\)?\s*(.+)/);
    if (dm && !line.includes("성취기준 수")) {
      domain = dm[2].replace(/^#+\s*/, "").trim();
      continue;
    }
    const m = line.match(/^\s*-\s*\[([^\]]+)\]\s*(.+)/);
    if (m) {
      add({
        code: m[1].trim(),
        text: cleanText(m[2]),
        schoolLevel: "middle",
        subject,
        domain: domain || undefined,
        sourceFile: basename(file),
      });
    }
  }
}

function parseHighOfficial(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  // Skip if including full pro makes package huge - still parse all
  for (const line of text.split("\n")) {
    const m = line.match(/\*\*\\\[([^\]]+)\\\]\*\*\s*(.+)/);
    if (!m) continue;
    const code = m[1].trim();
    const body = cleanText(m[2]);
    if (body.length < 6) continue;
    // subject inference from code prefix
    let subject = inferHighSubject(code);
    if (!INCLUDE_PRO && isProCode(code)) continue;
    add({
      code,
      text: body,
      schoolLevel: "high",
      subject,
      sourceFile: basename(file),
    });
  }
}

function isProCode(code) {
  // general high school codes start with 10 or 12 + hangul subject abbr
  if (/^(10|12)/.test(code)) return false;
  // professional like "보일 01-02-01"
  return true;
}

function inferHighSubject(code) {
  const c = code.replace(/\s+/g, "");
  const map = [
    [/공수|기수|대수|미적|확통|기하|경수|인수|수과|수문|실통|직수|이수|전수|고대|고미|고기/, "수학"],
    [/공국|문학|화법|독서|영독|국/, "국어"],
    [/공영|영Ⅰ|영Ⅱ|영독|영문|영/, "영어"],
    [/통사|한사|세사|지리|정치|경제|법/, "사회"],
    [/통과|과탐|물리|화학|생과|지구|고물|고화|고생|고지/, "과학"],
    [/운건|체육|스포/, "체육"],
    [/음악|음/, "음악"],
    [/미술|미창/, "미술"],
    [/정보|소프트|인공|데이터/, "정보"],
    [/기술|가정|로봇|생애/, "기술가정"],
    [/한문|한자/, "한문"],
    [/윤리|도덕/, "도덕"],
    [/일|중|독|프|스|러|베|아/, "제2외국어"],
  ];
  for (const [re, name] of map) {
    if (re.test(c)) return name;
  }
  if (isProCode(code)) return "전문교과";
  return "기타";
}

// --- load sources ---
const elem = join(ROOT, "초등교육과정", "2022 개정 교육과정 초등학교 성취기준 .md");
// also try alternate path
const elemAlt = join(ROOT, "교육과정", "2022 개정 교육과정 초등학교 성취기준 .md");
parseElementary(existsSync(elem) ? elem : elemAlt);

const middleDir = join(ROOT, "중등교육과정");
if (existsSync(middleDir)) {
  for (const f of readdirSync(middleDir)) {
    if (!f.endsWith(".md") || f.startsWith("00_")) continue;
    parseMiddleFile(join(middleDir, f));
  }
}

const highOfficial = join(ROOT, "고등교육과정", "2022 개정 교육과정 고등학교 성취기준.md");
const highOfficial2 = join(ROOT, "고등교육과정", "2022 개정 교육과정 고등학교 성취기준 (공식).md");
// For npm package size: if file > 4MB and CU2022_LIGHT=1, only parse general from _official_md excluding 전문
if (process.env.CU2022_LIGHT === "1") {
  const od = join(ROOT, "고등교육과정", "_official_md");
  if (existsSync(od)) {
    for (const f of readdirSync(od)) {
      if (!f.endsWith(".md") || f.includes("전문")) continue;
      parseHighOfficial(join(od, f));
    }
  }
} else {
  const hf = existsSync(highOfficial) ? highOfficial : highOfficial2;
  if (existsSync(hf) && statSync(hf).size > 8_000_000 && !INCLUDE_PRO) {
    // too big without pro intent - use official_md general only
    const od = join(ROOT, "고등교육과정", "_official_md");
    for (const f of readdirSync(od)) {
      if (!f.endsWith(".md") || f.includes("전문")) continue;
      parseHighOfficial(join(od, f));
    }
  } else if (existsSync(hf)) {
    // Prefer lighter: general official_md + sample, OR full file
    // Full file is fine for git LFS? User wants complete - use official_md for general + pro md files
    const od = join(ROOT, "고등교육과정", "_official_md");
    if (existsSync(od)) {
      for (const f of readdirSync(od)) {
        if (!f.endsWith(".md")) continue;
        if (!INCLUDE_PRO && f.includes("전문")) continue;
        parseHighOfficial(join(od, f));
      }
    } else {
      parseHighOfficial(hf);
    }
  }
}

// stats
const byLevel = {};
const bySubject = {};
for (const s of standards) {
  byLevel[s.schoolLevel] = (byLevel[s.schoolLevel] || 0) + 1;
  const k = `${s.schoolLevel}:${s.subject}`;
  bySubject[k] = (bySubject[k] || 0) + 1;
}

const meta = {
  builtAt: new Date().toISOString(),
  sourceRoot: ROOT,
  total: standards.length,
  byLevel,
  subjectCount: Object.keys(bySubject).length,
  version: "1.0.0",
  note: "2022 개정 교육과정 성취기준 인덱스. 원문 근거는 교육부/NCIC.",
};

// Write JSON array (compact)
const outPath = join(OUT_DIR, "standards.json");
writeFileSync(outPath, JSON.stringify({ meta, standards }));
// also write meta alone
writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2));

console.log("Built", outPath);
console.log("Total standards:", standards.length);
console.log("By level:", byLevel);
console.log("Size MB:", (statSync(outPath).size / 1024 / 1024).toFixed(2));
