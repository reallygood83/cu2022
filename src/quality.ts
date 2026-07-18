/**
 * 성취기준 본문 완전성·인용 검증 유틸.
 * PDF 잘림·전문교과 노이즈를 런타임에서 완화한다.
 */

/** 문장이 한국어 성취기준답게 끝나는지 (잘림 휴리스틱) */
export function isCompleteText(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 8) return false;
  // "있다 ." 같은 공백 허용
  if (/(다|요|음|함|임|됨)\s*\.?\s*$/.test(t)) return true;
  if (
    /(수 있다|할 수 있다|한다|된다|보인다|설명한다|비교한다|구한다|작성한다|표현한다|참여한다|실천한다)\s*\.?\s*$/.test(
      t,
    )
  )
    return true;
  // 조사·연결로 끊기면 잘림
  if (
    /(의|을|를|이|가|은|는|와|과|로|으로|한|할|하는|하며|하고|하여|설|여)\s*$/.test(
      t,
    )
  )
    return false;
  if (/(그|이|저|및|등|또|또한|또는)\s*$/.test(t)) return false;
  return t.length >= 40 && /[다요]\s*\.?\s*$/.test(t);
}

export function isTruncatedSuspect(s: {
  text: string;
  quality?: string;
}): boolean {
  if (s.quality === "truncated_suspect") return true;
  return !isCompleteText(s.text);
}

/** 본문 정규화 (공백·마침표) */
export function normalizeStandardText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([.。,])/g, "$1")
    .replace(/(다|요)\s+\./g, "$1.")
    .trim();
}

/**
 * 생성 텍스트에 등장하는 성취기준 코드가 허용 목록에 있는지 검사.
 * cite-only 가드.
 */
export function validateCitations(
  draft: string,
  allowed: Array<{ code: string; text: string }>,
): {
  ok: boolean;
  citedCodes: string[];
  unknownCodes: string[];
  textMismatches: Array<{ code: string; reason: string }>;
  warnings: string[];
} {
  const codeRe =
    /\[?([0-9]{1,2}[가-힣A-Za-z0-9ⅠⅡ·\-]{2,40}|[가-힣]{1,4}\s?[0-9]{2}-[0-9]{2}-[0-9]{2})\]?/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(draft))) {
    found.add(m[1].replace(/\s+/g, ""));
  }
  // also bare codes like 6수01-06
  const bare =
    draft.match(
      /(?:^|[\s(（「])([0-9]{1,2}[가-힣][가-힣A-Za-z0-9ⅠⅡ·\-]{2,30})(?=[\s)）」.,]|$)/g,
    ) ?? [];
  for (const b of bare) {
    const c = b.trim().replace(/^[(\s(（「]+/, "");
    if (c.length >= 5) found.add(c);
  }

  const allowMap = new Map(
    allowed.map((a) => [a.code.replace(/\s+/g, ""), a]),
  );
  const citedCodes = [...found];
  const unknownCodes: string[] = [];
  const textMismatches: Array<{ code: string; reason: string }> = [];
  const warnings: string[] = [];

  for (const code of citedCodes) {
    const hit = allowMap.get(code) || allowMap.get(code.replace(/·/g, ""));
    if (!hit) {
      // filter false positives (years, pure numbers)
      if (/^\d{4}$/.test(code) || code.length < 5) continue;
      if (!/[가-힣]/.test(code)) continue;
      unknownCodes.push(code);
      continue;
    }
    // if draft quotes a long phrase claiming to be the standard, rough check
    const snippet = hit.text.slice(0, 20);
    if (snippet.length >= 12 && draft.includes(hit.code) && !draft.includes(snippet.slice(0, 10))) {
      // soft warning only — model may paraphrase activities without full text
      warnings.push(
        `${code}: 성취기준 원문 앞부분이 초안에 없음. 인용 시 원문을 붙여 주세요.`,
      );
    }
  }

  if (unknownCodes.length) {
    warnings.push(
      `인덱스에 없는 코드 ${unknownCodes.length}개 — 창작 코드 의심. curriculum_search 결과만 쓰세요.`,
    );
  }

  return {
    ok: unknownCodes.length === 0,
    citedCodes,
    unknownCodes,
    textMismatches,
    warnings,
  };
}
