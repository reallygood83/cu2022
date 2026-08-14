import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Dataset, SchoolLevel, Standard } from "./types.js";
import { isTruncatedSuspect } from "./quality.js";
import {
  highCourseFor,
  highCoursePrefix,
  inferHighCourseFromQuery,
} from "./highCourses.js";

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
  const ds = JSON.parse(readFileSync(path, "utf8")) as Dataset;
  enrichHighCourses(ds);
  cache = ds;
  return cache;
}

/**
 * 고교 성취기준에 선택과목 정보(course/courseType)를 부여하고
 * 접두 기반으로 오분류된 교과를 교정한다.
 * (예: 12현윤 '기타'→'도덕', 12독작 '제2외국어'→'국어')
 * 번들 데이터 재빌드 없이 로드 시점에 결정론적으로 수행.
 */
function enrichHighCourses(ds: Dataset): void {
  for (const s of ds.standards) {
    if (s.schoolLevel !== "high" || s.subject === "전문교과") continue;
    const info = highCourseFor(s.code, s.sourceFile, s.text);
    if (!info) continue;
    if (info.course) s.course = info.course;
    s.courseType = info.track;
    if (info.subject) s.subject = info.subject;
  }
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

/** 질의에서 교과 힌트 추론 (UI가 수학으로 고정하면 짬뽕 발생 → 호출측에서도 추론 사용) */
export function inferSubjectFromQuery(query: string): string | undefined {
  const q = query.trim();
  if (!q) return undefined;
  // 더 구체적인 패턴을 먼저
  const rules: Array<{ test: RegExp; subject: string }> = [
    { test: /체육|스포츠|운동\s*기능|건강\s*체력|야구|축구|농구|배구|피구|발야구|티볼|네트형|영역형|경쟁\s*게임|게임\s*활동/, subject: "체육" },
    { test: /수학|분수|소수|연산|도형|확률|통계|방정식|함수|측정/, subject: "수학" },
    { test: /국어|독해|작문|문학|매체\s*언어|읽기|쓰기|말하기|듣기/, subject: "국어" },
    { test: /영어|English|어휘|listening|reading/i, subject: "영어" },
    { test: /과학|실험|광합성|물질|에너지|지구|생명|혼합물/, subject: "과학" },
    { test: /사회|역사|지리|시민|경제|정치|일반사회/, subject: "사회" },
    { test: /음악|가창|기악|창작\s*국악/, subject: "음악" },
    { test: /미술|그리기|조소|디자인\s*표현/, subject: "미술" },
    { test: /실과|기술|가정|정보/, subject: "실과" },
    { test: /도덕|인성|배려|정의/, subject: "도덕" },
  ];
  for (const r of rules) {
    if (r.test.test(q)) return r.subject;
  }
  // "OO교과" 패턴
  const m = q.match(/([가-힣]{2,8})\s*교과/);
  if (m) return m[1].replace(/(과|교육)$/, "") || m[1];
  return undefined;
}

/** Simple Korean-friendly scoring */
export function searchStandards(opts: {
  query: string;
  schoolLevel?: SchoolLevel;
  subject?: string;
  /** 고교 과목 필터 (예: 미적분Ⅰ, 확률과 통계, 화법과 언어) */
  course?: string;
  limit?: number;
}): Array<Standard & { score: number }> {
  const ds = loadDataset();
  const q = opts.query.trim();
  const limit = Math.min(opts.limit ?? 10, 50);
  if (!q) return [];

  const courseFilter = opts.course?.replace(/\s+/g, "") || undefined;
  const inferredCourse = courseFilter ? undefined : inferHighCourseFromQuery(q);
  const inferredPrefixes = inferredCourse
    ? new Set(inferredCourse.prefixes)
    : undefined;

  // 과목명 추론(예: 현대사회와 윤리 → 도덕)이 광역 교과 추론보다 구체적이므로 우선
  const subject =
    opts.subject?.trim() ||
    inferredCourse?.subject ||
    inferSubjectFromQuery(q) ||
    undefined;

  const matchCourse = (s: Standard): boolean => {
    if (!courseFilter) return true;
    if (!s.course) return false;
    const c = s.course.replace(/\s+/g, "");
    return c.includes(courseFilter) || courseFilter.includes(c);
  };

  // exact code
  const exact = ds.standards.filter(
    (s) =>
      matchLevel(s, opts.schoolLevel) &&
      (!subject || s.subject.includes(subject)) &&
      (s.code === q || s.code.replace(/\s+/g, "") === q.replace(/\s+/g, "")),
  );
  if (exact.length) {
    return exact.slice(0, limit).map((s) => ({ ...s, score: 100 }));
  }

  const tokens = tokenize(q);
  const scored: Array<Standard & { score: number }> = [];

  for (const s of ds.standards) {
    if (!matchLevel(s, opts.schoolLevel)) continue;
    if (subject && !s.subject.includes(subject)) continue;
    if (!matchCourse(s)) continue;

    let score = 0;
    const hay = `${s.code} ${s.text} ${s.subject} ${s.course ?? ""} ${s.domain ?? ""} ${s.gradeBand ?? ""}`;
    const hayNorm = hay.toLowerCase();

    if (s.code.includes(q) || q.includes(s.code)) score += 40;
    for (const t of tokens) {
      if (!t) continue;
      // 검색 노이즈 토큰 (문서 유형 단어)은 약한 가중치
      const weak = /^(지도안|수업안|과정안|작성|위한|짜리|관련|대해|대한|있는|하는|하기)$/.test(t);
      if (s.text.includes(t)) score += weak ? 2 : 8;
      if (s.subject.includes(t) || t.includes(s.subject)) score += 10;
      // 과목명 토큰 매치: 1음절 토큰·교과명과 동일한 과목명은 제외 (초·중 검색 오염 방지)
      if (
        s.course &&
        !weak &&
        t.length >= 2 &&
        s.course !== s.subject &&
        (s.course.includes(t) || t.includes(s.course.replace(/\s+/g, "")))
      )
        score += 6;
      if (s.domain?.includes(t)) score += 4;
      if (s.code.includes(t)) score += 10;
      if (hayNorm.includes(t.toLowerCase())) score += weak ? 0 : 2;
    }
    // 교과 명시 시 해당 교과 가산
    if (subject && s.subject.includes(subject)) score += 14;
    // 고교 선택과목 매칭 가산 (질의에서 과목명 추론 성공 시)
    if (inferredPrefixes) {
      const p = highCoursePrefix(s.code);
      if (p && inferredPrefixes.has(p)) score += 35;
    }
    if (courseFilter && s.course) score += 20;
    // grade hints
    if (/초|elem/i.test(q) && s.schoolLevel === "elementary") score += 3;
    if (/중|middle/i.test(q) && s.schoolLevel === "middle") score += 3;
    if (/고|high/i.test(q) && s.schoolLevel === "high") score += 3;
    if (/6학년|초6/.test(q) && (s.gradeBand?.includes("6") || s.code.startsWith("6")))
      score += 6;
    if (/5학년|초5/.test(q) && (s.gradeBand?.includes("5") || s.code.startsWith("6")))
      score += 5;
    if (/4학년|초4/.test(q) && (s.gradeBand?.includes("4") || s.code.startsWith("4")))
      score += 5;
    // 주제 특화 가산
    if (/분수/.test(q) && s.text.includes("분수")) score += 12;
    if (/소수/.test(q) && s.text.includes("소수")) score += 12;
    if (/나눗셈/.test(q) && s.text.includes("나눗셈")) score += 12;
    if (
      /야구|발야구|티볼|축구|농구|배구|피구|스포츠|게임/.test(q) &&
      /스포츠|게임|경쟁|기술형|전략형|영역형|네트형/.test(s.text + (s.domain ?? ""))
    ) {
      score += 18;
    }
    if (/체육/.test(q) && s.subject.includes("체육")) score += 10;

    // PDF 잘림·전문교과 노이즈: 완전 문장 우선
    if (isTruncatedSuspect(s)) score -= 15;
    if (s.subject === "전문교과" && !/전문|특성화|마이스터/.test(q)) score -= 8;
    if (s.repair) score += 2;

    // 교과 불일치 페널티 (추론/명시 교과가 있는데 다른 교과 히트)
    if (subject && !s.subject.includes(subject)) score -= 30;

    if (score > 0) scored.push({ ...s, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(isTruncatedSuspect(a)) - Number(isTruncatedSuspect(b)) ||
      a.code.localeCompare(b.code, "ko"),
  );
  return scored.slice(0, limit);
}

function tokenize(q: string): string[] {
  const parts = q
    .split(/[\s,./|·]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
  // hangul words 2+
  const hangul = q.match(/[가-힣]{2,}/g) ?? [];
  // 복합어 분해: 체육교과 → 체육, 교과 / 야구형 → 야구
  const expanded: string[] = [];
  for (const h of hangul) {
    expanded.push(h);
    if (h.endsWith("교과") && h.length > 2) expanded.push(h.slice(0, -2));
    if (h.endsWith("형") && h.length > 2) expanded.push(h.slice(0, -1));
    if (h.endsWith("짜리") && h.length > 2) expanded.push(h.slice(0, -2));
  }
  // 주요 교과·주제 키워드가 부분 문자열로 있으면 토큰 추가
  for (const key of [
    "체육", "수학", "국어", "영어", "과학", "사회", "음악", "미술", "실과", "도덕",
    "야구", "축구", "농구", "배구", "피구", "스포츠", "게임", "분수", "소수", "나눗셈",
  ]) {
    if (q.includes(key)) expanded.push(key);
  }
  return [...new Set([...parts, ...hangul, ...expanded])];
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

/** 고교 과목(공통·선택·계열) 목록과 건수 */
export function listCourses(subject?: string): Array<{
  course: string;
  subject: string;
  courseType: string;
  count: number;
  codePrefix: string;
}> {
  const ds = loadDataset();
  const map = new Map<
    string,
    { course: string; subject: string; courseType: string; count: number; codePrefix: string }
  >();
  for (const s of ds.standards) {
    if (s.schoolLevel !== "high" || !s.course) continue;
    if (subject && !s.subject.includes(subject)) continue;
    const prefix = highCoursePrefix(s.code) ?? "";
    const k = `${s.course}::${s.courseType ?? ""}`;
    const e = map.get(k);
    if (e) e.count += 1;
    else
      map.set(k, {
        course: s.course,
        subject: s.subject,
        courseType: s.courseType ?? "",
        count: 1,
        codePrefix: prefix,
      });
  }
  const trackOrder: Record<string, number> = {
    공통: 0,
    일반선택: 1,
    진로선택: 2,
    융합선택: 3,
    "전문(계열)": 4,
  };
  return [...map.values()].sort(
    (a, b) =>
      a.subject.localeCompare(b.subject, "ko") ||
      (trackOrder[a.courseType] ?? 9) - (trackOrder[b.courseType] ?? 9) ||
      a.course.localeCompare(b.course, "ko"),
  );
}

export function stats() {
  return loadDataset().meta;
}

/** 데이터 품질 요약 + 샘플 (한계 투명 공개) */
export function qualityReport(limitSamples = 10) {
  const ds = loadDataset();
  const byLevel = { elementary: 0, middle: 0, high: 0 };
  const truncByLevel = { elementary: 0, middle: 0, high: 0 };
  const truncBySubject = new Map<string, number>();
  const samples: Array<{
    code: string;
    schoolLevel: string;
    subject: string;
    text: string;
  }> = [];

  for (const s of ds.standards) {
    byLevel[s.schoolLevel] += 1;
    if (isTruncatedSuspect(s)) {
      truncByLevel[s.schoolLevel] += 1;
      truncBySubject.set(
        s.subject,
        (truncBySubject.get(s.subject) ?? 0) + 1,
      );
      if (
        samples.length < limitSamples &&
        s.schoolLevel === "high" &&
        s.subject !== "전문교과"
      ) {
        samples.push({
          code: s.code,
          schoolLevel: s.schoolLevel,
          subject: s.subject,
          text: s.text,
        });
      }
    }
  }

  const high = byLevel.high || 1;
  return {
    meta: ds.meta.quality ?? null,
    repair: ds.meta.repair ?? null,
    version: ds.meta.version,
    counts: {
      byLevel,
      truncatedByLevel: truncByLevel,
      highCompletePct: Number(
        (((high - truncByLevel.high) / high) * 100).toFixed(2),
      ),
      truncatedBySubjectTop: [...truncBySubject.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([subject, count]) => ({ subject, count })),
    },
    samplesTruncatedGeneral: samples,
    mitigation: [
      "검색 시 truncated_suspect 감점, 전문교과 기본 감점",
      "lesson_pack은 완전 문장 우선 선정 + qualityWarning",
      "lesson_pack_validate로 창작 코드 차단",
      "멀티소스 복구(wiki/official_md/pdf) 결과는 repair 필드로 표시",
    ],
  };
}
