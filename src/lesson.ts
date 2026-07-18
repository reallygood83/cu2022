import type { Standard } from "./types.js";
import { searchStandards, schoolLevelLabel } from "./data.js";

export interface LessonPack {
  query: string;
  parsed: {
    durationMin?: number;
    differentiation: string[];
    schoolLevelHint?: string;
  };
  standards: Array<{
    code: string;
    text: string;
    subject: string;
    schoolLevel: string;
    score: number;
    whySelected: string;
  }>;
  misconceptions: string[];
  activities: Array<{
    min: number;
    title: string;
    teacher: string;
    student: string;
    scaffoldForStruggling?: string;
  }>;
  formativeItems: Array<{ type: string; prompt: string; lookFor: string }>;
  parentNoticeOptional?: {
    title: string;
    body: string;
    tone: string;
  };
  handoffs: {
    documentTitle: string;
    nextSteps: string[];
  };
  disclaimer: string;
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
  if (/부진|보충|느린|어려워/.test(opts.query)) differentiation.push("부진");
  if (/심화|빠른|영재/.test(opts.query)) differentiation.push("심화");

  const hits = searchStandards({
    query: opts.query,
    schoolLevel: opts.schoolLevel ?? "all",
    subject: opts.subject,
    limit: 5,
  });

  const selected = hits.slice(0, 3);
  const primary = selected[0];

  const intro = Math.max(5, Math.round(duration * 0.15));
  const wrap = Math.max(5, Math.round(duration * 0.2));
  const main = Math.max(10, duration - intro - wrap);

  const topic = opts.query.replace(/,.*$/, "").trim();
  const struggling = differentiation.includes("부진");

  const activities: LessonPack["activities"] = [
    {
      min: intro,
      title: "도입 · 배움 연결",
      teacher: `오늘 배울 핵심을 성취기준 언어로 안내하고, 학생 사전 지식을 질문으로 확인합니다. (${primary ? primary.code : "관련 성취기준"})`,
      student: "이전 학습과 오늘의 목표를 자신의 말로 말해 봅니다.",
    },
    {
      min: main,
      title: "전개 · 탐구·연습",
      teacher: `${topic} 관련 핵심 활동을 안내하고, 과정·기능을 드러내는 발문을 합니다.`,
      student: "활동·연습 과제를 수행하며 동료와 생각을 나눕니다.",
      scaffoldForStruggling: struggling
        ? "단계 예시·힌트 카드·짝 활동을 제공하고, 필수 문항만 먼저 완수하도록 지원합니다."
        : undefined,
    },
    {
      min: wrap,
      title: "정리 · 형성평가",
      teacher: "핵심을 정리하고 형성평가로 이해 정도를 확인합니다.",
      student: "오늘 배운 것을 한 문장으로 정리하고 평가 문항에 답합니다.",
    },
  ];

  const misconceptions = guessMisconceptions(opts.query, primary?.text ?? "");

  const formativeItems = [
    {
      type: "진단",
      prompt: primary
        ? `${primary.text.replace(/다\.\s*$/, "")}는 내용을 예시로 설명해 보세요.`
        : `${topic}에 대해 아는 것을 적어 보세요.`,
      lookFor: "핵심 개념 사용 여부, 오개념 여부",
    },
    {
      type: "형성",
      prompt: struggling
        ? "기본 예시 1개를 해결해 보세요. (힌트 사용 가능)"
        : "오늘 배운 개념을 적용한 문제 2개를 해결해 보세요.",
      lookFor: "절차 정확성, 설명 가능성",
    },
  ];

  const pack: LessonPack = {
    query: opts.query,
    parsed: {
      durationMin: duration,
      differentiation,
      schoolLevelHint: primary
        ? schoolLevelLabel(primary.schoolLevel)
        : undefined,
    },
    standards: selected.map((s) => ({
      code: s.code,
      text: s.text,
      subject: s.subject,
      schoolLevel: schoolLevelLabel(s.schoolLevel),
      score: s.score,
      whySelected:
        s.score >= 20 ? "질의와 키워드·과목 정합도가 높음" : "관련 후보",
    })),
    misconceptions,
    activities,
    formativeItems,
    handoffs: {
      documentTitle: `${topic} ${duration}분 지도 초안`,
      nextSteps: [
        "한글 문서 초안으로 옮기기",
        "형성평가 결과 기록",
        ...(opts.includeParentNotice !== false
          ? ["필요 시 가정 안내문 초안 생성"]
          : []),
      ],
    },
    disclaimer:
      "성취기준은 검색된 원문 인용입니다. 학교·학년 교육과정 배정과 대조해 사용하세요. 본 도구는 생성 보조이며 최종 수업 책임은 교사에게 있습니다.",
  };

  if (opts.includeParentNotice !== false) {
    pack.parentNoticeOptional = {
      title: `${topic} 학습 안내`,
      body: [
        "안녕하세요. 담임(교과) 교사입니다.",
        `이번 시간에 학생들은 「${primary?.text ?? topic}」와 관련된 학습을 진행합니다.`,
        "가정에서도 짧게 오늘 배운 내용을 물어봐 주시면 학습에 도움이 됩니다.",
        "문의 사항이 있으시면 연락 부탁드립니다.",
      ].join("\n"),
      tone: "학부모 안심 · 사실 우선 · 차분한 학교 문체",
    };
  }

  return pack;
}

function guessMisconceptions(query: string, standardText: string): string[] {
  const q = query + standardText;
  const list: string[] = [];
  if (q.includes("분수")) {
    list.push(
      "분수를 두 자연수의 나열이 아니라 ‘전체-부분’ 관계로 이해하지 못함",
    );
    list.push("분모가 다른 분수 크기 비교 시 분모·분자 각각 비교");
  }
  if (q.includes("방정식") || q.includes("함수")) {
    list.push("문자와 수, 식과 값을 혼동");
  }
  if (q.includes("소수")) {
    list.push("자릿값 이해 부족으로 대소 비교 오류");
  }
  if (!list.length) {
    list.push("용어의 정의를 암기만 하고 상황에 적용하지 못함");
    list.push("선수 학습 공백으로 절차만 따라 함");
  }
  return list.slice(0, 4);
}
