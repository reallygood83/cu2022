#!/usr/bin/env node
/**
 * cu2022-mcp · 성취기준 커넥터
 * 2022 개정 교육과정 성취기준 MCP Server (stdio)
 * Claude / Codex / Gemini / Cursor / Hermes 등 범용
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getByCode,
  listCourses,
  listSubjects,
  loadDataset,
  qualityReport,
  schoolLevelLabel,
  searchStandards,
  stats,
} from "./data.js";
import { buildLessonPack, validateLessonDraft } from "./lesson.js";
import { isTruncatedSuspect } from "./quality.js";
import { chatgptFetch, chatgptSearch } from "./chatgpt.js";

export function createCu2022Server() {
const server = new McpServer(
  {
    name: "cu2022-mcp",
    version: "1.4.0",
    websiteUrl: "https://github.com/reallygood83/cu2022",
  },
  {
    instructions:
      "2022 개정 교육과정 성취기준 커넥터. ChatGPT는 search로 찾고 fetch로 본문을 읽으세요. 성취기준 코드·문장은 도구 결과만 인용하고 절대 창작하지 마세요.",
  },
);

const schoolLevelSchema = z
  .enum(["elementary", "middle", "high", "all"])
  .optional()
  .describe("학교급: elementary|middle|high|all");

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Eager load to fail fast
try {
  loadDataset();
} catch (e) {
  console.error("[cu2022-mcp] dataset load failed:", e);
}

// --- Tools ---

server.tool(
  "curriculum_stats",
  "2022 개정 성취기준 데이터셋 통계(초·중·고 건수, 빌드 시각)를 반환합니다.",
  {},
  async () => jsonResult(stats()),
);

server.tool(
  "curriculum_list_subjects",
  "학교급별 과목 목록과 성취기준 건수를 반환합니다.",
  {
    schoolLevel: schoolLevelSchema,
  },
  async ({ schoolLevel }) =>
    jsonResult({
      subjects: listSubjects(schoolLevel ?? "all"),
    }),
);

server.tool(
  "curriculum_list_courses",
  "고등학교 과목(공통·일반선택·진로선택·융합선택·전문계열) 목록과 성취기준 건수를 반환합니다. 예: 미적분Ⅰ, 확률과 통계, 화법과 언어, 현대사회와 윤리.",
  {
    subject: z
      .string()
      .optional()
      .describe("교과 필터 예: 수학, 국어, 사회, 과학"),
  },
  async ({ subject }) =>
    jsonResult({
      courses: listCourses(subject),
      note: "course 값을 curriculum_search의 course 파라미터로 사용할 수 있습니다.",
    }),
);

server.tool(
  "curriculum_search",
  "자연어·키워드·코드로 2022 개정 성취기준을 검색합니다. 고교 선택과목명(미적분Ⅰ, 확률과 통계, 화법과 언어 등)도 인식합니다. 생성 시 반드시 이 결과의 code/text만 인용하세요.",
  {
    query: z
      .string()
      .describe(
        "검색어 예: '5학년 분수', '9수02-15', '중2 일차함수', '미적분 수열의 극한', '확률과 통계 조건부확률'",
      ),
    schoolLevel: schoolLevelSchema,
    subject: z.string().optional().describe("교과 필터 예: 수학, 국어"),
    course: z
      .string()
      .optional()
      .describe(
        "고교 과목 필터 예: 미적분Ⅰ, 확률과 통계, 화법과 언어, 현대사회와 윤리 (curriculum_list_courses로 목록 확인)",
      ),
    limit: z.number().int().min(1).max(50).optional().describe("결과 개수 기본 10"),
  },
  async ({ query, schoolLevel, subject, course, limit }) => {
    const results = searchStandards({
      query,
      schoolLevel: schoolLevel ?? "all",
      subject,
      course,
      limit,
    });
    return jsonResult({
      query,
      count: results.length,
      results: results.map((r) => ({
        code: r.code,
        text: r.text,
        schoolLevel: r.schoolLevel,
        schoolLevelKo: schoolLevelLabel(r.schoolLevel),
        subject: r.subject,
        course: r.course,
        courseType: r.courseType,
        domain: r.domain,
        gradeBand: r.gradeBand,
        score: r.score,
        sourceFile: r.sourceFile,
        quality: isTruncatedSuspect(r) ? "truncated_suspect" : r.repair ? "repaired" : "ok",
        qualityWarning: isTruncatedSuspect(r)
          ? "본문 잘림 가능 — 원문 대조 권장"
          : undefined,
        repair: r.repair,
      })),
      citationRule:
        "이후 생성물에는 위 results의 code와 text만 성취기준으로 인용하세요. 없는 코드를 만들지 마세요. truncated_suspect는 단정 인용하지 마세요.",
    });
  },
);

server.tool(
  "curriculum_get",
  "성취기준 코드로 단건 조회합니다.",
  {
    code: z.string().describe("예: 6수01-06, 9수02-15, 10공수1-01-01"),
  },
  async ({ code }) => {
    const hit = getByCode(code);
    if (!hit) {
      return jsonResult({
        found: false,
        code,
        message: "해당 코드가 인덱스에 없습니다. curriculum_search로 유사 항목을 찾으세요.",
      });
    }
    return jsonResult({
      found: true,
      standard: {
        ...hit,
        schoolLevelKo: schoolLevelLabel(hit.schoolLevel),
      },
    });
  },
);

// ChatGPT 앱·커넥터 호환 (search / fetch). Deep Research·커넥터 검색에 사용.
server.registerTool(
  "search",
  {
    title: "성취기준 검색",
    description:
      "2022 개정 교육과정 성취기준을 검색합니다. 예: '5학년 분수', '중2 일차함수', '미적분 수열의 극한'. 결과는 id(코드)·title·url 입니다. 본문은 fetch로 가져오세요.",
    inputSchema: {
      query: z.string().describe("자연어 검색어 또는 성취기준 코드"),
    },
    outputSchema: {
      results: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          url: z.string(),
        }),
      ),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ query }) => {
    const payload = chatgptSearch(query);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
);

server.registerTool(
  "fetch",
  {
    title: "성취기준 본문",
    description:
      "search 결과의 id(성취기준 코드)로 원문 전체를 가져옵니다. 코드·문장만 인용하세요.",
    inputSchema: {
      id: z.string().describe("search가 반환한 id(코드) 또는 /s/{코드} URL"),
    },
    outputSchema: {
      id: z.string(),
      title: z.string(),
      text: z.string(),
      url: z.string(),
      metadata: z.record(z.unknown()).optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ id }) => {
    const payload = chatgptFetch(id);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
);

server.tool(
  "lesson_pack",
  "Claude for Teachers 스타일 Lesson Pack. 성취기준 검색→인용→학습초점→오개념 뱅크→활동→형성평가→agentGenerationBrief(호스트 모델 구체화 지시). cite-only. 교사 검토 필수.",
  {
    query: z
      .string()
      .describe("예: '5학년 분수, 이번 주 부진 학생 포함 45분'"),
    schoolLevel: schoolLevelSchema,
    subject: z.string().optional(),
    durationMin: z.number().int().min(10).max(120).optional(),
    includeParentNotice: z
      .boolean()
      .optional()
      .describe("학부모 안내 초안 포함 (기본 true)"),
  },
  async (args) => {
    const pack = buildLessonPack({
      query: args.query,
      schoolLevel: args.schoolLevel,
      subject: args.subject,
      durationMin: args.durationMin,
      includeParentNotice: args.includeParentNotice,
    });
    return jsonResult(pack);
  },
);

server.tool(
  "lesson_pack_validate",
  "수업 초안 텍스트에 등장하는 성취기준 코드가 인덱스(또는 허용 목록)에 있는지 검사합니다. 창작 코드 차단용 cite-only 가드.",
  {
    draft: z.string().describe("검증할 수업안·안내문 전체 텍스트"),
    allowedCodes: z
      .array(z.string())
      .optional()
      .describe("허용 코드 목록(없으면 query로 검색한 후보 사용)"),
    query: z
      .string()
      .optional()
      .describe("allowedCodes 없을 때 검색 쿼리"),
    schoolLevel: schoolLevelSchema,
    subject: z.string().optional(),
  },
  async (args) =>
    jsonResult(
      validateLessonDraft({
        draft: args.draft,
        allowedCodes: args.allowedCodes,
        query: args.query,
        schoolLevel: args.schoolLevel,
        subject: args.subject,
      }),
    ),
);

server.tool(
  "curriculum_quality",
  "성취기준 인덱스 품질 리포트(잘림·복구·과목별 노이즈). PDF 추출 한계를 투명하게 보고하고 완화 정책을 안내합니다.",
  {
    sampleLimit: z.number().int().min(1).max(30).optional(),
  },
  async ({ sampleLimit }) => jsonResult(qualityReport(sampleLimit ?? 10)),
);

server.tool(
  "assessment_scaffold",
  "성취기준 기반 형성·총괄 평가 골격(평가 요소·문항 초안·채점 포인트)을 만듭니다.",
  {
    query: z.string().describe("평가 주제 또는 성취기준 코드"),
    schoolLevel: schoolLevelSchema,
    subject: z.string().optional(),
    itemCount: z.number().int().min(1).max(10).optional(),
  },
  async ({ query, schoolLevel, subject, itemCount }) => {
    const n = itemCount ?? 3;
    const hits = searchStandards({
      query,
      schoolLevel: schoolLevel ?? "all",
      subject,
      limit: 3,
    });
    const primary = hits[0];
    const items = Array.from({ length: n }, (_, i) => ({
      no: i + 1,
      type: i === 0 ? "개념 확인" : i === 1 ? "적용" : "설명·전이",
      prompt: primary
        ? `(${primary.code}) 관련 ${i + 1}번: ${primary.text.replace(/다\.\s*$/, "")}를 바탕으로 한 문항을 설계하세요.`
        : `${query} 관련 ${i + 1}번 문항`,
      lookFor: ["핵심 용어 사용", "절차 정확성", "오개념 여부"][i % 3],
      levelHint: ["기본", "보통", "도전"][i % 3],
    }));
    return jsonResult({
      standards: hits.map((h) => ({
        code: h.code,
        text: h.text,
        subject: h.subject,
        schoolLevel: schoolLevelLabel(h.schoolLevel),
      })),
      evaluationElements: hits.map((h) => h.text),
      items,
      rubricSketch: {
        A: "성취기준 도달·설명 가능",
        B: "대체로 도달·일부 지원 필요",
        C: "부분 도달·보충 필요",
      },
      minimumAchievementNote:
        "고등·학점제 맥락에서는 미도달 예방 지도(과제·방과후·피드백) 계획을 별도로 세우세요.",
      disclaimer:
        "문항 문구는 골격입니다. 교육과정·평가 기준에 맞게 교사가 최종 작성하세요.",
    });
  },
);

server.tool(
  "parent_notice_draft",
  "성취기준을 인용한 학부모 안내문 초안(안심 문체)을 만듭니다. 발송 전 교사 검수 필수.",
  {
    query: z.string().describe("안내할 학습 주제"),
    schoolLevel: schoolLevelSchema,
    subject: z.string().optional(),
    extraContext: z
      .string()
      .optional()
      .describe("체험학습 일정, 준비물 등 추가 사실"),
  },
  async ({ query, schoolLevel, subject, extraContext }) => {
    const hits = searchStandards({
      query,
      schoolLevel: schoolLevel ?? "all",
      subject,
      limit: 2,
    });
    const primary = hits[0];
    return jsonResult({
      standardsCited: hits.map((h) => ({ code: h.code, text: h.text })),
      toneRules: [
        "사실 우선",
        "비난·과장 금지",
        "짧은 문장",
        "요청은 정중하게",
      ],
      draft: {
        title: `${query} 관련 가정 안내`,
        body: [
          "안녕하세요. 담임(교과) 교사입니다.",
          primary
            ? `이번 학습에서 학생들은 「${primary.text}」(${primary.code})와 관련하여 배움을 이어갑니다.`
            : `이번 학습에서 학생들은 「${query}」와 관련하여 배움을 이어갑니다.`,
          extraContext ? `안내 사항: ${extraContext}` : "",
          "가정에서도 오늘 배운 내용을 짧게 물어봐 주시면 도움이 됩니다.",
          "궁금한 점이 있으시면 연락 부탁드립니다. 감사합니다.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      checklistBeforeSend: [
        "날짜·대상·사실관계 확인",
        "학생 개인정보·성적 언급 없음",
        "학교 공식 톤 검토",
      ],
      disclaimer: "발송 전 반드시 교사가 검토·수정하세요.",
    });
  },
);

server.tool(
  "unit_map",
  "검색된 성취기준을 단원/영역 단위로 묶어 지도 개요를 만듭니다 (Marble light).",
  {
    query: z.string(),
    schoolLevel: schoolLevelSchema,
    subject: z.string().optional(),
    limit: z.number().int().min(3).max(30).optional(),
  },
  async ({ query, schoolLevel, subject, limit }) => {
    const hits = searchStandards({
      query,
      schoolLevel: schoolLevel ?? "all",
      subject,
      limit: limit ?? 12,
    });
    const byDomain = new Map<string, typeof hits>();
    for (const h of hits) {
      const d = h.domain || h.subject || "기타";
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d)!.push(h);
    }
    return jsonResult({
      query,
      clusters: [...byDomain.entries()].map(([domain, items]) => ({
        domain,
        count: items.length,
        standards: items.map((i) => ({
          code: i.code,
          text: i.text,
          schoolLevel: schoolLevelLabel(i.schoolLevel),
        })),
      })),
      teachingTips: [
        "영역 클러스터 순서를 학교 배정표와 맞추세요.",
        "부진 학생이 있으면 앞 영역 선수 성취기준을 먼저 검색하세요.",
      ],
    });
  },
);

// --- Resources ---
server.resource(
  "dataset-meta",
  "curriculum://meta",
  {
    description: "성취기준 데이터셋 메타데이터",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(stats(), null, 2),
      },
    ],
  }),
);

// --- Prompts ---
server.prompt(
  "teacher_lesson_design",
  "성취기준 인용 수업 설계 프롬프트",
  {
    topic: z.string().describe("수업 주제"),
    minutes: z.string().optional().describe("시수(분)"),
  },
  async ({ topic, minutes }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "당신은 한국 초·중·고 교사 수업 설계 도우미입니다.",
            "반드시 cu2022-mcp(성취기준 커넥터)의 curriculum_search 또는 lesson_pack 도구를 먼저 호출하세요.",
            "성취기준 코드·문장은 도구 결과만 인용하고 절대 창작하지 마세요.",
            `주제: ${topic}`,
            minutes ? `시수: ${minutes}분` : "",
            "출력: 성취기준 인용 → 오개념 → 활동 순서 → 형성평가 → (선택) 가정 안내",
            "마지막에 학교 교육과정 대조 면책 문구를 넣으세요.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
    ],
  }),
);

server.prompt(
  "teacher_parent_notice",
  "학부모 안내문 작성 프롬프트",
  {
    topic: z.string(),
  },
  async ({ topic }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `parent_notice_draft 도구로 「${topic}」 가정 안내 초안을 만든 뒤, 안심 문체로 다듬어 주세요. 개인정보·성적 언급 금지.`,
        },
      },
    ],
  }),
);

  return server;
}

async function main() {
  if (process.argv.includes("--http")) {
    const { startHttpServer } = await import("./http.js");
    await startHttpServer();
    return;
  }
  const server = createCu2022Server();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMain =
  /(?:^|[\\/])index\.(js|ts)$/.test(process.argv[1] ?? "");
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
