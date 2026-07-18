import type { Standard } from "./types.js";
import { getByCode, searchStandards, schoolLevelLabel } from "./data.js";
import { isTruncatedSuspect, validateCitations } from "./quality.js";

export interface LessonPack {
  query: string;
  parsed: {
    durationMin?: number;
    differentiation: string[];
    schoolLevelHint?: string;
    subjectHint?: string;
  };
  standards: Array<{
    code: string;
    text: string;
    subject: string;
    schoolLevel: string;
    score: number;
    whySelected: string;
    quality?: string;
    qualityWarning?: string;
  }>;
  learningFocus: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
    fromStandardVerbs: string[];
  };
  misconceptions: string[];
  activities: Array<{
    min: number;
    phase: "도입" | "전개" | "정리" | "확장";
    title: string;
    teacher: string;
    student: string;
    linkedStandardCodes: string[];
    scaffoldForStruggling?: string;
    extensionForAdvanced?: string;
    materials?: string[];
  }>;
  formativeItems: Array<{
    type: string;
    prompt: string;
    lookFor: string;
    linkedStandardCodes: string[];
  }>;
  parentNoticeOptional?: {
    title: string;
    body: string;
    tone: string;
  };
  handoffs: {
    documentTitle: string;
    nextSteps: string[];
    myclHints?: string[];
  };
  /** 호스트 모델이 이 골격을 풍부화할 때 따를 지시 (cite-only) */
  agentGenerationBrief: {
    role: string;
    mustDo: string[];
    mustNot: string[];
    refineTargets: string[];
    citationCodes: string[];
    citationTexts: Array<{ code: string; text: string }>;
    outputChecklist: string[];
  };
  quality: {
    selectedCount: number;
    truncatedInSelection: number;
    lowScoreWarning?: string;
    searchCoverage: string;
  };
  disclaimer: string;
}

/** 주제·과목 키워드 → 오개념 뱅크 */
const MISCONCEPTION_BANK: Array<{ test: RegExp; items: string[] }> = [
  {
    test: /분수/,
    items: [
      "분수를 두 자연수의 나열이 아니라 ‘전체–부분’ 관계로 이해하지 못함",
      "분모가 다른 분수 크기 비교 시 분모·분자를 각각 따로 비교",
      "동치분수를 만들지 않고 곧바로 연산",
    ],
  },
  {
    test: /소수|자릿값/,
    items: [
      "자릿값 이해 부족으로 대소 비교·자리 맞추기 오류",
      "소수점 이동과 10배·1/10 관계를 혼동",
    ],
  },
  {
    test: /방정식|함수|일차/,
    items: [
      "문자와 수, 식과 값을 혼동",
      "등식의 성질을 양변에 일관되게 적용하지 못함",
      "그래프와 식을 대응시키지 못함",
    ],
  },
  {
    test: /확률|통계|자료/,
    items: [
      "표본과 모집단을 혼동",
      "상대도수·확률을 절대 횟수로만 이해",
      "평균이 항상 ‘전형적인 값’이라고 오해",
    ],
  },
  {
    test: /광합성|세포|생태계|진화/,
    items: [
      "광합성을 ‘식물이 숨 쉬는 것’과 동일시",
      "인과(원인–결과)와 상관을 혼동",
      "일상 언어와 과학 용어를 구분하지 못함",
    ],
  },
  {
    test: /독해|문학|글쓰기|작문|매체/,
    items: [
      "표면 정보만 찾고 추론·비판을 생략",
      "주장과 근거를 구분하지 못함",
      "장르·매체 특성을 무시하고 동일 전략만 사용",
    ],
  },
  {
    test: /영어|listening|reading|어휘/i,
    items: [
      "단어 대 단어 직역에 의존",
      "문맥 단서 없이 사전 의미만 고수",
      "말하기 유창성과 정확성을 동일시",
    ],
  },
  {
    test: /역사|지리|사회|시민|경제/,
    items: [
      "사건·개념을 연대기 암기만으로 처리",
      "다관점·사료 비판 없이 단일 서사 수용",
      "공간·척도 개념 혼동(지도·그래프)",
    ],
  },
  {
    test: /운동|체육|건강/,
    items: [
      "기능 시범만 보고 원리(힘·균형·호흡)를 놓침",
      "안전 수칙을 ‘형식’으로만 인식",
    ],
  },
  {
    test: /음악|미술|미술과|표현|창작/,
    items: [
      "결과물 완성도만 중시하고 과정·의도 설명을 생략",
      "재료·매체 특성을 고려하지 않은 표현",
    ],
  },
];

type ActivitySeed = {
  phase: "도입" | "전개" | "정리" | "확장";
  title: string;
  teacher: (ctx: ActCtx) => string;
  student: (ctx: ActCtx) => string;
  materials?: string[];
};

type ActCtx = {
  topic: string;
  primary?: Standard & { score: number };
  codes: string[];
  duration: number;
  struggling: boolean;
  advanced: boolean;
};

const ACTIVITY_SEEDS: ActivitySeed[] = [
  {
    phase: "도입",
    title: "배움 연결 · 성취기준 언어 공유",
    teacher: (c) =>
      `오늘 목표를 성취기준 문장으로 짧게 읽어 주고(${c.codes[0] ?? "관련 기준"}), 실생활·선수 학습 연결 질문을 1~2개 던집니다.`,
    student: () =>
      "이전 학습과 오늘의 목표를 자신의 말로 한 문장 말해 봅니다.",
    materials: ["보드/슬라이드", "사전 진단 질문 카드"],
  },
  {
    phase: "전개",
    title: "핵심 탐구 · 과정·기능 드러내기",
    teacher: (c) =>
      `「${c.topic}」 핵심 과제를 제시하고, 성취기준 동사(이해·적용·설명·비교 등)가 드러나는 발문으로 사고 과정을 끌어냅니다.`,
    student: () =>
      "과제를 수행하며 근거·절차를 기록하고 동료와 비교합니다.",
    materials: ["활동지", "조작·실험·텍스트 자료"],
  },
  {
    phase: "전개",
    title: "적용 · 오류 분석",
    teacher: (c) =>
      `의도적 오답·경계 사례를 보여 주고, 왜 틀렸는지 학생이 설명하게 합니다. (${c.codes.slice(0, 2).join(", ") || "성취기준"} 연결)`,
    student: () =>
      "오류 원인을 말하고 올바른 방법으로 다시 수행합니다.",
  },
  {
    phase: "정리",
    title: "형성평가 · 배움 정리",
    teacher: () =>
      "핵심을 3문장 이내로 정리하고 형성평가로 이해 정도를 확인합니다. 미도달 학생 즉시 피드백 포인트를 메모합니다.",
    student: () =>
      "오늘 배운 것을 한 문장으로 쓰고 평가 문항에 답합니다.",
  },
];

function extractVerbs(text: string): string[] {
  const verbs = [
    "이해",
    "설명",
    "적용",
    "비교",
    "분석",
    "탐구",
    "표현",
    "작성",
    "해결",
    "추론",
    "평가",
    "협력",
    "실천",
    "설계",
    "계산",
    "측정",
    "관찰",
    "토론",
    "발표",
    "읽고",
    "쓰고",
    "듣고",
    "말하기",
  ];
  return verbs.filter((v) => text.includes(v));
}

function buildLearningFocus(
  standards: Array<Standard & { score: number }>,
  topic: string,
): LessonPack["learningFocus"] {
  const joined = standards.map((s) => s.text).join(" ");
  const verbs = extractVerbs(joined + topic);
  const knowledge: string[] = [];
  const skills: string[] = [];
  const attitudes: string[] = [];

  for (const s of standards.slice(0, 3)) {
    // knowledge: noun-ish chunks around 개념
    knowledge.push(`${s.code}: ${s.text.replace(/다\.\s*$/, "").slice(0, 80)}`);
  }
  if (verbs.some((v) => /설명|이해|분석|추론|비교/.test(v))) {
    skills.push("개념을 자신의 말로 설명하고 사례에 적용하기");
  }
  if (verbs.some((v) => /해결|계산|측정|작성|표현/.test(v))) {
    skills.push("절차·표현 기능을 단계적으로 수행하기");
  }
  if (verbs.some((v) => /탐구|관찰|토론|협력|실천/.test(v))) {
    skills.push("탐구·협력 과정에서 근거를 들어 의사소통하기");
  }
  if (!skills.length) {
    skills.push("성취기준 동사에 맞는 수행 과제를 완수하기");
  }
  attitudes.push("오류를 학습 기회로 보고 피드백을 반영하기");
  attitudes.push("배움을 실생활·다른 교과와 연결해 보려는 태도");

  return {
    knowledge: knowledge.slice(0, 3),
    skills: skills.slice(0, 3),
    attitudes: attitudes.slice(0, 2),
    fromStandardVerbs: verbs.slice(0, 8),
  };
}

function guessMisconceptions(query: string, standardText: string): string[] {
  const q = `${query} ${standardText}`;
  const list: string[] = [];
  for (const row of MISCONCEPTION_BANK) {
    if (row.test.test(q)) list.push(...row.items);
  }
  if (!list.length) {
    list.push("용어의 정의를 암기만 하고 상황에 적용하지 못함");
    list.push("선수 학습 공백으로 절차만 따라 함");
    list.push("성공 사례만 보고 경계·반례를 놓침");
  }
  return [...new Set(list)].slice(0, 5);
}

function allocateMinutes(
  duration: number,
  phases: number,
): number[] {
  // intro 15%, main share, wrap 20%
  const intro = Math.max(5, Math.round(duration * 0.15));
  const wrap = Math.max(5, Math.round(duration * 0.2));
  const rest = Math.max(10, duration - intro - wrap);
  if (phases <= 3) return [intro, rest, wrap];
  const main1 = Math.round(rest * 0.55);
  const main2 = rest - main1;
  return [intro, main1, main2, wrap];
}

export function buildLessonPack(opts: {
  query: string;
  schoolLevel?: "elementary" | "middle" | "high" | "all";
  subject?: string;
  durationMin?: number;
  includeParentNotice?: boolean;
}): LessonPack {
  const duration =
    opts.durationMin ??
    (() => {
      const m = opts.query.match(/(\d+)\s*분/);
      return m ? Number(m[1]) : 40;
    })();

  const differentiation: string[] = [];
  if (/부진|보충|느린|어려워|미도달/.test(opts.query))
    differentiation.push("부진");
  if (/심화|빠른|영재|도전/.test(opts.query)) differentiation.push("심화");

  const hits = searchStandards({
    query: opts.query,
    schoolLevel: opts.schoolLevel ?? "all",
    subject: opts.subject,
    limit: 8,
  });

  // 잘린 본문은 뒤로, 점수 높은 완전 본문 우선
  const ranked = [...hits].sort((a, b) => {
    const ta = isTruncatedSuspect(a) ? 1 : 0;
    const tb = isTruncatedSuspect(b) ? 1 : 0;
    if (ta !== tb) return ta - tb;
    return b.score - a.score;
  });
  const selected = ranked.slice(0, 3);
  const primary = selected[0];
  const codes = selected.map((s) => s.code);
  const topic = opts.query.replace(/,.*$/, "").trim();
  const struggling = differentiation.includes("부진");
  const advanced = differentiation.includes("심화");

  const mins = allocateMinutes(duration, 4);
  const ctx: ActCtx = {
    topic,
    primary,
    codes,
    duration,
    struggling,
    advanced,
  };

  const seeds = [
    ACTIVITY_SEEDS[0],
    ACTIVITY_SEEDS[1],
    ACTIVITY_SEEDS[2],
    ACTIVITY_SEEDS[3],
  ];
  const activities: LessonPack["activities"] = seeds.map((seed, i) => ({
    min: mins[i] ?? 5,
    phase: seed.phase,
    title: seed.title,
    teacher: seed.teacher(ctx),
    student: seed.student(ctx),
    linkedStandardCodes: codes.slice(0, 2),
    scaffoldForStruggling: struggling
      ? "단계 예시·힌트 카드·짝 활동·필수 문항 우선. 성공 경험을 먼저 확보합니다."
      : undefined,
    extensionForAdvanced: advanced
      ? "경계 사례·설명 과제·동료 튜터링·전이 문제를 추가합니다."
      : i === 1
        ? "여유 있는 학생: 다른 표현·반례 찾기 확장 과제"
        : undefined,
    materials: seed.materials,
  }));

  const misconceptions = guessMisconceptions(
    opts.query,
    primary?.text ?? "",
  );
  const learningFocus = buildLearningFocus(selected, topic);

  const formativeItems: LessonPack["formativeItems"] = [
    {
      type: "진단",
      prompt: primary
        ? `${primary.text.replace(/다\.\s*$/, "")}와 관련된 예시 한 가지를 말해 보세요.`
        : `${topic}에 대해 아는 것을 적어 보세요.`,
      lookFor: "핵심 개념 사용, 오개념 여부",
      linkedStandardCodes: codes.slice(0, 1),
    },
    {
      type: "형성",
      prompt: struggling
        ? "기본 예시 1개를 해결해 보세요. (힌트 사용 가능)"
        : "오늘 배운 개념을 적용한 문제 2개를 해결·설명해 보세요.",
      lookFor: "절차 정확성, 설명 가능성",
      linkedStandardCodes: codes.slice(0, 2),
    },
    {
      type: "성찰",
      prompt: "오늘 가장 헷갈렸던 점과 다음에 연습할 점을 한 줄로 쓰세요.",
      lookFor: "메타인지·다음 학습 연결",
      linkedStandardCodes: codes.slice(0, 1),
    },
  ];

  const truncCount = selected.filter((s) => isTruncatedSuspect(s)).length;
  const lowScore =
    primary && primary.score < 12
      ? "검색 점수가 낮습니다. 과목·학교급·코드를 더 구체적으로 지정해 다시 검색하세요."
      : undefined;

  const citationTexts = selected.map((s) => ({ code: s.code, text: s.text }));

  const pack: LessonPack = {
    query: opts.query,
    parsed: {
      durationMin: duration,
      differentiation,
      schoolLevelHint: primary
        ? schoolLevelLabel(primary.schoolLevel)
        : undefined,
      subjectHint: primary?.subject,
    },
    standards: selected.map((s) => {
      const bad = isTruncatedSuspect(s);
      return {
        code: s.code,
        text: s.text,
        subject: s.subject,
        schoolLevel: schoolLevelLabel(s.schoolLevel),
        score: s.score,
        whySelected:
          s.score >= 20
            ? "질의와 키워드·과목 정합도가 높음"
            : "관련 후보 — 학교 배정표와 재확인",
        quality: bad ? "truncated_suspect" : s.repair ? "repaired" : "ok",
        qualityWarning: bad
          ? "본문이 잘렸을 수 있습니다. curriculum_get으로 재확인하거나 원문 PDF와 대조하세요."
          : undefined,
      };
    }),
    learningFocus,
    misconceptions,
    activities,
    formativeItems,
    handoffs: {
      documentTitle: `${topic} ${duration}분 지도 초안`,
      nextSteps: [
        "한글/문서 초안으로 옮기기",
        "형성평가 결과 기록·미도달 보충 계획",
        ...(opts.includeParentNotice !== false
          ? ["필요 시 가정 안내문 초안 생성"]
          : []),
        truncCount
          ? "잘림 의심 성취기준은 교육부/NCIC 원문과 대조"
          : "학교 교육과정 배정표와 성취기준 대조",
      ],
      myclHints: [
        "문서 라이브러리에 Lesson Pack JSON/마크다운 저장",
        "수업 후 형성평가 메모를 같은 문서에 추가",
      ],
    },
    agentGenerationBrief: {
      role: "한국 초·중·고 교사 수업 설계 보조 (2022 개정 성취기준 cite-only)",
      mustDo: [
        "아래 citationTexts의 code·text만 성취기준으로 인용한다",
        "activities/formativeItems를 학급 맥락에 맞게 구체화한다 (시간·자료·발문)",
        "misconceptions를 활동·평가 발문에 명시적으로 연결한다",
        "learningFocus 동사(fromStandardVerbs)가 학생 수행에 드러나게 한다",
        "마지막에 교사 검토·학교 배정표 대조 면책을 남긴다",
      ],
      mustNot: [
        "인덱스에 없는 성취기준 코드를 만들지 않는다",
        "citationTexts 문장을 사실과 다르게 바꾸지 않는다 (윤문 금지, 인용은 원문)",
        "학생 개인정보·성적 단정을 넣지 않는다",
        "잘림 경고(qualityWarning)가 있는 기준을 확정 인용처럼 단정하지 않는다",
      ],
      refineTargets: [
        "activities[].teacher / student 발문 구체화",
        "formativeItems 문항 문장·채점 포인트",
        "부진·심화 스캐폴드",
        "parentNoticeOptional 문체 다듬기(사실 유지)",
      ],
      citationCodes: codes,
      citationTexts,
      outputChecklist: [
        "모든 성취기준 인용에 code가 붙어 있는가",
        "없는 코드를 쓰지 않았는가 → lesson_pack_validate로 재검사 권장",
        "시수 합이 durationMin과 비슷한가",
        "오개념 대응이 전개 활동에 있는가",
      ],
    },
    quality: {
      selectedCount: selected.length,
      truncatedInSelection: truncCount,
      lowScoreWarning: lowScore,
      searchCoverage:
        hits.length === 0
          ? "검색 결과 없음 — 쿼리·학교급·과목을 바꿔 재시도"
          : `후보 ${hits.length}건 중 상위 ${selected.length}건 선정`,
    },
    disclaimer:
      "성취기준은 검색된 원문 인용입니다. 학교·학년 교육과정 배정과 대조해 사용하세요. 본 도구는 생성 보조이며 최종 수업 책임은 교사에게 있습니다. agentGenerationBrief를 따라 호스트 모델이 구체화할 수 있으나, 코드·원문 창작은 금지입니다.",
  };

  if (opts.includeParentNotice !== false) {
    pack.parentNoticeOptional = {
      title: `${topic} 학습 안내`,
      body: [
        "안녕하세요. 담임(교과) 교사입니다.",
        primary
          ? `이번 시간에 학생들은 「${primary.text}」(${primary.code})와 관련된 학습을 진행합니다.`
          : `이번 시간에 학생들은 「${topic}」와 관련된 학습을 진행합니다.`,
        "가정에서도 짧게 오늘 배운 내용을 물어봐 주시면 학습에 도움이 됩니다.",
        "문의 사항이 있으시면 연락 부탁드립니다.",
      ].join("\n"),
      tone: "학부모 안심 · 사실 우선 · 차분한 학교 문체",
    };
  }

  return pack;
}

/** Lesson Pack 또는 임의 초안의 cite-only 검증 */
export function validateLessonDraft(opts: {
  draft: string;
  allowedCodes?: string[];
  query?: string;
  schoolLevel?: "elementary" | "middle" | "high" | "all";
  subject?: string;
}): ReturnType<typeof validateCitations> & {
  allowed: Array<{ code: string; text: string }>;
  recommendation: string;
} {
  let allowed: Array<{ code: string; text: string }> = [];
  if (opts.allowedCodes?.length) {
    allowed = opts.allowedCodes
      .map((c) => getByCode(c))
      .filter((s): s is Standard => Boolean(s))
      .map((s) => ({ code: s.code, text: s.text }));
  } else if (opts.query) {
    allowed = searchStandards({
      query: opts.query,
      schoolLevel: opts.schoolLevel ?? "all",
      subject: opts.subject,
      limit: 15,
    }).map((s) => ({ code: s.code, text: s.text }));
  }

  const result = validateCitations(opts.draft, allowed);
  return {
    ...result,
    allowed,
    recommendation: result.ok
      ? "인용 코드가 허용 목록과 일치합니다. 교사 검토 후 사용하세요."
      : "unknownCodes를 제거하고 curriculum_search 결과의 코드만 사용하세요. lesson_pack을 다시 호출하는 것이 안전합니다.",
  };
}
