#!/usr/bin/env node
/**
 * cu2022-doc — 터미널에서 지도안·가정통신문 작성 후 한컴 문서 저장
 *
 * 파이프라인:
 *   query → lesson_pack (cu2022-mcp cite-only)
 *        → Markdown 조립 (샘플 과정안 형식)
 *        → kordoc markdownToHwpx → .hwpx (+ .md)
 *
 * 형식 현실 (2026-07):
 *   ✅ .hwpx  — kordoc 생성, 한컴/macOS 한컴 호환 (권장 납품 형식)
 *   ✅ .md    — 중간 산출
 *   ⚠️ .hwp 바이너리 — 오픈소스 경로에서 MD→HWP5 신규 생성 미지원
 *       (kordoc/rhwp는 .hwp **파싱·패치** 강점, 생성은 HWPX)
 *       한컴에서 HWPX 연 뒤 "다른 이름으로 저장 → HWP" 가능
 *   👁  rhwp / master-of-hwp — 뷰어·편집 (선택)
 *
 * Usage:
 *   npx cu2022-doc lesson "분수 나눗셈 기초 40분" --level elementary --min 40 -o ~/Downloads
 *   npx cu2022-doc notice "현장체험학습 준비물 안내" --school 한빛초 -o ./out
 *   node scripts/export-teacher-doc.mjs lesson "..." --open
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);

function usage(code = 0) {
  console.log(`
성취기준 커넥터 문서 내보내기 · cu2022-doc

Usage:
  cu2022-doc <lesson|notice> "<주제/요청>" [options]

Options:
  --level elementary|middle|high|all   학교급 (기본 elementary)
  --subject <교과>                     교과 힌트 (기본 수학 for lesson)
  --min <분>                           시수 (기본 40)
  --school <학교명>                    가정통신문 학교명
  -o, --out <dir>                      출력 폴더 (기본 ~/Downloads)
  --name <basename>                    파일명 (확장자 제외)
  --md-only                            HWPX 없이 Markdown만
  --open                               저장 후 기본 앱으로 열기 (macOS open)
  -h, --help

Examples:
  cu2022-doc lesson "분수 나눗셈 개념, 부진 학생 기초 강화 40분" --level elementary --min 40
  cu2022-doc notice "현장체험학습 준비물 안내" --school 한빛초등학교

Format note:
  출력은 한컴 호환 **.hwpx** 입니다. 레거시 .hwp 바이너리 신규 생성은
  kordoc/rhwp 오픈 경로에서 지원하지 않습니다. 한컴에서 HWP로 재저장 가능.
`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") args.help = true;
    else if (a === "--md-only") args.mdOnly = true;
    else if (a === "--open") args.open = true;
    else if (a === "--level") args.level = argv[++i];
    else if (a === "--subject") args.subject = argv[++i];
    else if (a === "--min") args.min = Number(argv[++i]);
    else if (a === "--school") args.school = argv[++i];
    else if (a === "-o" || a === "--out") args.out = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a.startsWith("-")) {
      console.error("Unknown option:", a);
      usage(1);
    } else args._.push(a);
  }
  return args;
}

function safeName(s) {
  return String(s || "doc")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

async function loadLessonApi() {
  const distLesson = join(ROOT, "dist", "lesson.js");
  if (!existsSync(distLesson)) {
    console.error("dist/ 가 없습니다. 먼저: npm run build");
    process.exit(1);
  }
  return import(pathToFileURL(distLesson).href);
}

async function loadKordoc() {
  try {
    return await import("kordoc");
  } catch {
    // try local node_modules path
    try {
      return await import(pathToFileURL(join(ROOT, "node_modules/kordoc/dist/index.js")).href);
    } catch {
      return null;
    }
  }
}

function openPath(filePath) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [filePath], { detached: true, stdio: "ignore" }).unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length < 2) usage(args.help ? 0 : 1);

  const kind = args._[0];
  const query = args._.slice(1).join(" ").trim();
  if (!["lesson", "notice", "lesson-plan", "parent-notice"].includes(kind)) {
    console.error('kind는 lesson | notice 만 지원합니다.');
    usage(1);
  }
  if (!query) usage(1);

  const isNotice = kind === "notice" || kind === "parent-notice";
  const schoolLevel = args.level || "elementary";
  const durationMin = Number.isFinite(args.min) && args.min > 0 ? args.min : 40;
  const subject = args.subject || (isNotice ? undefined : "수학");
  const outDir = resolve(args.out || join(homedir(), "Downloads"));
  mkdirSync(outDir, { recursive: true });

  const { buildLessonPack, validateLessonDraft } = await loadLessonApi();
  const { lessonPlanMarkdown, parentNoticeMarkdown } = await import(
    pathToFileURL(join(__dirname, "lib/compose.mjs")).href
  );

  console.log("[1/4] Lesson Pack 생성 (cu2022-mcp cite-only)…");
  const pack = buildLessonPack({
    query,
    schoolLevel,
    subject,
    durationMin: isNotice ? undefined : durationMin,
    includeParentNotice: isNotice
  });

  if (!isNotice && !pack.standards?.length) {
    console.error("관련 성취기준을 찾지 못했습니다. 주제를 바꿔 보세요.");
    process.exit(2);
  }

  console.log(
    "  standards:",
    (pack.standards || []).map((s) => s.code).join(", ") || "(none)"
  );

  console.log("[2/4] Markdown 조립…");
  const markdown = isNotice
    ? parentNoticeMarkdown(pack, { school: args.school, citeStandards: true })
    : lessonPlanMarkdown(pack, { durationMin, subject });

  const REAL = /^\d+[가-힣]+\d+-\d+$/;
  const validation = validateLessonDraft({
    draft: markdown,
    allowedCodes: (pack.standards || []).map((s) => s.code)
  });
  const unknown = (validation.unknownCodes || []).filter((c) => REAL.test(c));
  if (unknown.length) {
    console.warn("  cite warning unknown real codes:", unknown.join(", "));
  } else {
    console.log("  cite-only: OK");
  }

  const base =
    args.name ||
    safeName(
      isNotice
        ? pack.parentNoticeOptional?.title || query
        : pack.handoffs?.documentTitle || query
    );
  const mdPath = join(outDir, `${base}.md`);
  writeFileSync(mdPath, markdown, "utf8");
  console.log("[3/4] Markdown →", mdPath);

  let hwpxPath = null;
  if (!args.mdOnly) {
    console.log("[4/4] kordoc markdownToHwpx → HWPX…");
    const kordoc = await loadKordoc();
    if (!kordoc?.markdownToHwpx) {
      console.error(`
kordoc 이 필요합니다 (HWPX 생성).

  cd ${ROOT}
  npm install kordoc

또는:
  npm install -g kordoc
  npm install --prefix ${ROOT} kordoc
`);
      console.log("Markdown 만 저장했습니다:", mdPath);
      process.exit(3);
    }
    const buf = Buffer.from(await kordoc.markdownToHwpx(markdown));
    hwpxPath = join(outDir, `${base}.hwpx`);
    writeFileSync(hwpxPath, buf);
    console.log("  HWPX →", hwpxPath, `(${buf.length} bytes)`);
  } else {
    console.log("[4/4] --md-only: HWPX 생략");
  }

  console.log(`
✅ 완료
  종류: ${isNotice ? "가정통신문" : "교수·학습과정안"}
  MD:   ${mdPath}
  HWPX: ${hwpxPath || "(생략)"}
  성취기준: ${(pack.standards || []).map((s) => s.code).join(", ") || "—"}

📌 형식 안내
  · 한컴/나모 등에서 **.hwpx** 를 바로 엽니다 (권장).
  · 레거시 **.hwp** 가 필요하면 한컴에서 다른 이름으로 저장하세요.
  · 뷰어(선택): pip install master-of-hwp-studio && mohwp studio
  · 파싱/패치: npx kordoc 문서.hwpx | npx kordoc 문서.hwp
`);

  if (args.open && hwpxPath) openPath(hwpxPath);
  else if (args.open) openPath(mdPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
