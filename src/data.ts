import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dataset, SchoolLevel, Standard } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveDataPath(): string {
  if (process.env.CU2022_DATA_PATH && existsSync(process.env.CU2022_DATA_PATH)) {
    return process.env.CU2022_DATA_PATH;
  }
  // package root /data/standards.json (dist/../data)
  const candidates = [
    join(__dirname, "..", "data", "standards.json"),
    join(process.cwd(), "data", "standards.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "standards.json not found. Set CU2022_DATA_PATH or run npm run build:data",
  );
}

let cache: Dataset | null = null;

export function loadDataset(): Dataset {
  if (cache) return cache;
  const path = resolveDataPath();
  cache = JSON.parse(readFileSync(path, "utf8")) as Dataset;
  return cache;
}

export function schoolLevelLabel(level: string): string {
  if (level === "elementary") return "초등";
  if (level === "middle") return "중등";
  if (level === "high") return "고등";
  return level;
}

export function matchLevel(
  s: Standard,
  level: SchoolLevel | undefined,
): boolean {
  if (!level || level === "all") return true;
  return s.schoolLevel === level;
}

/** Simple Korean-friendly scoring */
export function searchStandards(opts: {
  query: string;
  schoolLevel?: SchoolLevel;
  subject?: string;
  limit?: number;
}): Array<Standard & { score: number }> {
  const ds = loadDataset();
  const q = opts.query.trim();
  const limit = Math.min(opts.limit ?? 10, 50);
  if (!q) return [];

  // exact code
  const exact = ds.standards.filter(
    (s) =>
      matchLevel(s, opts.schoolLevel) &&
      (!opts.subject || s.subject.includes(opts.subject)) &&
      (s.code === q || s.code.replace(/\s+/g, "") === q.replace(/\s+/g, "")),
  );
  if (exact.length) {
    return exact.slice(0, limit).map((s) => ({ ...s, score: 100 }));
  }

  const tokens = tokenize(q);
  const scored: Array<Standard & { score: number }> = [];

  for (const s of ds.standards) {
    if (!matchLevel(s, opts.schoolLevel)) continue;
    if (opts.subject && !s.subject.includes(opts.subject)) continue;

    let score = 0;
    const hay = `${s.code} ${s.text} ${s.subject} ${s.domain ?? ""} ${s.gradeBand ?? ""}`;
    const hayNorm = hay.toLowerCase();

    if (s.code.includes(q) || q.includes(s.code)) score += 40;
    for (const t of tokens) {
      if (!t) continue;
      if (s.text.includes(t)) score += 8;
      if (s.subject.includes(t)) score += 6;
      if (s.domain?.includes(t)) score += 4;
      if (s.code.includes(t)) score += 10;
      if (hayNorm.includes(t.toLowerCase())) score += 2;
    }
    // grade hints
    if (/초|elem/i.test(q) && s.schoolLevel === "elementary") score += 3;
    if (/중|middle/i.test(q) && s.schoolLevel === "middle") score += 3;
    if (/고|high/i.test(q) && s.schoolLevel === "high") score += 3;
    if (/5학년|초5/.test(q) && (s.gradeBand?.includes("5") || s.code.startsWith("6")))
      score += 5;
    if (/분수/.test(q) && s.text.includes("분수")) score += 12;

    if (score > 0) scored.push({ ...s, score });
  }

  scored.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code, "ko"));
  return scored.slice(0, limit);
}

function tokenize(q: string): string[] {
  const parts = q
    .split(/[\s,./|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
  // also extract hangul words of length 2+
  const hangul = q.match(/[가-힣]{2,}/g) ?? [];
  return [...new Set([...parts, ...hangul])];
}

export function getByCode(code: string): Standard | undefined {
  const ds = loadDataset();
  const norm = code.replace(/\s+/g, " ").trim();
  return (
    ds.standards.find((s) => s.code === norm) ||
    ds.standards.find((s) => s.code.replace(/\s+/g, "") === norm.replace(/\s+/g, ""))
  );
}

export function listSubjects(schoolLevel?: SchoolLevel): Array<{
  schoolLevel: string;
  subject: string;
  count: number;
}> {
  const ds = loadDataset();
  const map = new Map<string, number>();
  for (const s of ds.standards) {
    if (!matchLevel(s, schoolLevel)) continue;
    const k = `${s.schoolLevel}::${s.subject}`;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([k, count]) => {
      const [schoolLevel, subject] = k.split("::");
      return { schoolLevel, subject, count };
    })
    .sort((a, b) => a.schoolLevel.localeCompare(b.schoolLevel) || b.count - a.count);
}

export function stats() {
  return loadDataset().meta;
}
