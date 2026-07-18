// Lesson Pack → 교수학습과정안 / 가정통신문 Markdown
// 형식: 샘플 과정안(메타 표 + 교사/학생 과정 + 평가 3단) 정렬

const scrub = (v) => String(v ?? "").replace(/\|/g, "·").replace(/\r\n/g, "\n").trim();
const cell = (v) => scrub(v).replace(/\n+/g, " ") || "-";
const cellOr = (...vals) => {
  for (const v of vals) {
    const s = scrub(v).replace(/\n+/g, " ");
    if (s) return s;
  }
  return "-";
};
const brCell = (v) => scrub(v).replace(/\n+/g, "<br>") || "-";

function standardsTable(standards) {
  const rows = (standards || []).map(
    (s) => `| [${cell(s.code)}] | ${cell(s.text)} | ${cell(s.subject)} · ${cell(s.schoolLevel)} |`
  );
  return ["| 성취기준 코드 | 성취기준 | 교과·학교급 |", "| --- | --- | --- |", ...rows].join("\n");
}

function metaHtmlTable(pack, opts = {}) {
  const subject = cellOr(pack.standards?.[0]?.subject, opts.subject, "교과");
  const grade =
    opts.grade ||
    (pack.parsed?.schoolLevel === "elementary"
      ? "초등"
      : pack.parsed?.schoolLevel === "middle"
        ? "중등"
        : pack.parsed?.schoolLevel === "high"
          ? "고등"
          : "초등");
  const audience = cellOr(opts.audience, `${grade} 학급`);
  const unit = cellOr(opts.unit, pack.query);
  const period = cellOr(opts.period, "1/1");
  const topic = cellOr(opts.topic, pack.query);
  const model = cellOr(opts.model, "원리 탐구 학습 모형");
  const goal = cellOr(
    opts.goal,
    pack.standards?.[0]?.text,
    pack.learningFocus?.knowledge?.[0],
    "학습 목표를 성취기준과 연결해 진술한다."
  );
  const materials = cellOr(
    opts.materials,
    [...new Set((pack.activities || []).flatMap((a) => a.materials || []))].join(", "),
    "학습지, 교과서, 조작 교구"
  );
  const durationMin = pack.parsed?.durationMin || opts.durationMin || 40;
  return [
    "<table>",
    `<tr><th>교과</th><th>${subject}</th><th>지도 일시</th><th>${cellOr(opts.when, "월 일 교시")}</th><th>대상</th><th>${audience}</th><th>지도 교사</th><th>${cellOr(opts.teacher, "")}</th></tr>`,
    `<tr><td rowspan="2">단원</td><td colspan="3" rowspan="2">${unit}</td><td rowspan="2">차시</td><td rowspan="2">${period}</td><td>교과서</td><td>${cellOr(opts.textbook, "-")}</td></tr>`,
    `<tr><td>익힘책</td><td>${cellOr(opts.workbook, "-")}</td></tr>`,
    `<tr><td>학습 주제</td><td colspan="5">${topic}</td><td>수업 모형</td><td>${model}</td></tr>`,
    `<tr><td>학습 목표</td><td colspan="5">${goal} (${durationMin}분)</td><td>준비물</td><td>${materials}</td></tr>`,
    "</table>"
  ].join("\n");
}

function processTable(pack) {
  const header = [
    "| 학습<br>단계 | 학습<br>과정 | 교수‧학습 활동 |  | 시간<br>(분) | 자료(∙) 및 유의점(※) |",
    "| --- | --- | --- | --- | --- | --- |",
    "|  |  | 교사 | 학생 |  |  |"
  ];
  const rows = (pack.activities || []).map((a, i) => {
    const teacherBits = [];
    if (a.title) teacherBits.push(`○${a.title}`);
    if (a.teacher) teacherBits.push(String(a.teacher).trim());
    if (a.scaffoldForStruggling) teacherBits.push(`※보충: ${a.scaffoldForStruggling}`);
    const studentBits = [];
    if (a.student) {
      studentBits.push(
        ...String(a.student)
          .split(/\n|·/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => (s.startsWith("-") ? s : `-${s}`))
      );
    }
    const materials = (a.materials || []).map((m) => `∙${m}`).join("<br>");
    const notes = [];
    if (materials) notes.push(materials);
    if (pack.misconceptions?.[i]) notes.push(`※오개념 주의: ${pack.misconceptions[i]}`);
    return `| ${brCell(a.phase)} | ${brCell(a.title)} | ${brCell(teacherBits.join("\n"))} | ${brCell(studentBits.join("\n") || "-")} | ${a.min ?? "-"}′ | ${brCell(notes.join("\n") || "-")} |`;
  });
  return [...header, ...rows].join("\n");
}

function evaluationPlanTable(pack) {
  const content = cellOr(
    pack.formativeItems?.[0]?.lookFor,
    pack.learningFocus?.knowledge?.[0],
    pack.standards?.[0]?.text,
    "학습 목표 달성 여부"
  );
  const method = cellOr(
    [...new Set((pack.formativeItems || []).map((f) => f.type).filter(Boolean))].join(", "),
    "관찰, 지필평가"
  );
  const good = cellOr(
    pack.formativeItems?.[0]?.lookFor,
    "성취기준의 핵심 원리를 이해하고 정확하게 수행·설명한다."
  );
  return [
    "※ 평가 계획",
    "",
    "<table>",
    "<tr><th>평가 내용</th><th>구분</th><th>평가 기준</th><th>평가 방법</th></tr>",
    `<tr><td rowspan="3">${content}</td><td>잘함</td><td>${good}</td><td rowspan="3">${method}</td></tr>`,
    "<tr><td>보통</td><td>성취기준의 핵심을 어느 정도 이해하고 도움을 받아 수행한다.</td></tr>",
    "<tr><td>노력요함</td><td>성취기준의 핵심 용어·절차를 알아본다.</td></tr>",
    "</table>",
    "",
    "### 과정중심 평가 과제 (형성)",
    "",
    "| 평가 방법 | 평가 과제 | 관찰 포인트 | 관련 성취기준 |",
    "| --- | --- | --- | --- |",
    ...(pack.formativeItems || []).map(
      (f) =>
        `| ${cell(f.type)} | ${cell(f.prompt)} | ${cell(f.lookFor)} | ${cell((f.linkedStandardCodes || []).map((c) => `[${c}]`).join(" "))} |`
    )
  ].join("\n");
}

export function lessonPlanMarkdown(pack, opts = {}) {
  const title = cell(pack.handoffs?.documentTitle || pack.query || "교수·학습과정안");
  const misconceptions =
    (pack.misconceptions || []).map((m) => `- ${cell(m)}`).join("\n") || "- (해당 없음)";
  return [
    `# ${title}`,
    "",
    "※ 본 과정안은 성취기준 커넥터(cu2022-mcp) 인용 골격 초안입니다. 학교·학년 교육과정 배정과 대조 후 사용하세요.",
    "",
    metaHtmlTable(pack, opts),
    "",
    processTable(pack),
    "",
    evaluationPlanTable(pack),
    "",
    "## 관련 성취기준 (2022 개정 교육과정 · cite-only)",
    "",
    standardsTable(pack.standards || []),
    "",
    "## 학습 요소",
    "",
    `- **지식·이해**: ${cell((pack.learningFocus?.knowledge || []).join(" / "))}`,
    `- **과정·기능**: ${cell((pack.learningFocus?.skills || []).join(" / "))}`,
    `- **가치·태도**: ${cell((pack.learningFocus?.attitudes || []).join(" / "))}`,
    "",
    "## 예상 오개념과 지도 유의점",
    "",
    misconceptions,
    "",
    `> ${cell(pack.disclaimer)}`,
    ""
  ].join("\n");
}

export function parentNoticeMarkdown(pack, opts = {}) {
  const notice = pack.parentNoticeOptional;
  if (!notice) throw new Error("Lesson Pack에 가정통신문 초안이 없습니다 (includeParentNotice 필요).");
  const paragraphs = notice.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const parts = [
    `# ${cell(notice.title)}`,
    "",
    `**${cellOr(opts.school, "○○초등학교")}** · ${cellOr(opts.date, new Date().toISOString().slice(0, 10))}`,
    "",
    "학부모님께,",
    "",
    ...paragraphs.map((p) => `${p}\n`)
  ];
  if (opts.citeStandards !== false && pack.standards?.length) {
    parts.push("", "## 이번 학습과 연계된 성취기준", "", standardsTable(pack.standards));
  }
  parts.push("", `> ${cell(pack.disclaimer)}`, "");
  return parts.join("\n");
}
