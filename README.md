# 성취기준 커넥터 · cu2022-mcp

**2022 개정 교육과정 성취기준을 AI 에이전트에 안전하게 연결하는 MCP 서버**

> AI가 성취기준 **코드를 지어내지 못하게** 하고,  
> **인덱스에 있는 코드·문장만** 검색·인용·수업 골격에 쓰게 합니다.

[![MCP](https://img.shields.io/badge/MCP-stdio-blue)](https://modelcontextprotocol.io)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.0-informational)](package.json)

| | |
|--|--|
| **공식 명칭** | **`cu2022-mcp`** |
| **한글 표기** | **성취기준 커넥터** |
| **의미** | 2022 개정 성취기준을 cite-only로 에이전트에 연결 |
| **CLI** | `cu2022-mcp` (MCP) · **`cu2022-doc`** (터미널 → HWPX) |
| **GitHub 리포** | `cu2022-mcp` (구 `2022CU-kr0-mcp` URL은 자동 리다이렉트) |

📖 **활용 매뉴얼:** [docs/MANUAL.md](docs/MANUAL.md)  
📄 **터미널 문서 워크플로:** [docs/WORKFLOW-TERMINAL-DOC.md](docs/WORKFLOW-TERMINAL-DOC.md)

---

## 한 줄 요약

| 문제 | 성취기준 커넥터 (`cu2022-mcp`) |
|------|--------|
| 모델이 `6수01-99` 같은 **가짜 코드**를 씀 | 검색·조회 결과의 **code/text만** 인용 |
| 수업안이 기준과 따로 놀음 | `lesson_pack` → 인용 → 오개념 → 활동 → 형성평가 |
| 안내문·평가 톤이 들쑥날쑥 | `parent_notice_draft` / `assessment_scaffold` 골격 |
| “이 초안 코드 맞나?” | `lesson_pack_validate` **cite-only 검증** |

**번들 데이터(대략):** 초등 ~600 · 중등 ~580 · 고등 4만+ 코드 (일반·전문 포함)  
**품질 힌트:** 초·중 본문 안정 · 고등 일반교과 우선 · 전문교과는 검색 감점·품질 플래그

---

## 빠른 설치

**요구:** Node.js 18+

### A. npx (권장)

```json
{
  "mcpServers": {
    "cu2022-mcp": {
      "command": "npx",
      "args": ["-y", "github:reallygood83/cu2022-mcp"]
    }
  }
}
```

### B. 로컬 클론

```bash
git clone https://github.com/reallygood83/cu2022-mcp.git
cd cu2022-mcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "cu2022-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/cu2022-mcp/dist/index.js"]
    }
  }
}
```

### 클라이언트별 설정

| 클라이언트 | 설정 위치 / 방법 |
|------------|------------------|
| Claude Desktop | `claude_desktop_config.json` → `mcpServers` |
| Claude Code | `.mcp.json` 또는 `claude mcp add cu2022-mcp -- …` |
| Cursor | Settings → MCP |
| Codex / Gemini / 기타 | stdio MCP `command` + `args` 지원 시 동일 |

예 (Claude Code, 로컬):

```bash
claude mcp add cu2022-mcp -- node /absolute/path/to/cu2022-mcp/dist/index.js
```

예제 JSON: [`examples/`](examples/)

---

## 도구 (10)

| Tool | 용도 |
|------|------|
| `curriculum_search` | 자연어·키워드·코드 검색 (**핵심**) |
| `curriculum_get` | 코드 단건 조회 |
| `curriculum_list_subjects` | 학교급별 과목·건수 |
| `curriculum_stats` | 데이터셋 통계 |
| `curriculum_quality` | 품질·잘림 의심·완화 정책 리포트 |
| `lesson_pack` | 수업 패키지 + `agentGenerationBrief` |
| `lesson_pack_validate` | 초안 속 코드 **cite-only** 검증 |
| `assessment_scaffold` | 형성·총괄 평가 골격 |
| `parent_notice_draft` | 학부모 안내문 초안 (안심 문체) |
| `unit_map` | 영역 클러스터 단원 지도 |

**Resource:** `curriculum://meta`  
**Prompts:** `teacher_lesson_design`, `teacher_parent_notice`

---

## 터미널에서 지도안·가정통신문 → 한컴 파일

MCP 없이 **로컬 한 줄**로 과정안/가정통신문을 만들고 **`.hwpx`로 저장**할 수 있습니다.

```bash
npm install
npm install kordoc    # HWPX 생성 (optionalDependencies)
npm run build

# 지도안 → ~/Downloads/*.hwpx (+ .md)
npx cu2022-doc lesson "분수 나눗셈 개념, 부진 학생 기초 강화 40분" \
  --level elementary --min 40 --open

# 가정통신문
npx cu2022-doc notice "현장체험학습 준비물 안내" --school 한빛초 -o ~/Downloads
```

| 형식 | 지원 | 비고 |
|------|------|------|
| **`.hwpx`** | ✅ | kordoc `markdownToHwpx` — **권장** (한컴 네이티브) |
| **`.md`** | ✅ | 중간 산출·검수용 |
| **`.hwp` 바이너리 신규 생성** | ⚠️ | kordoc/rhwp 오픈 경로 **미지원** (파싱·패치만). 한컴에서 HWPX → HWP 재저장 |
| 뷰어 | 선택 | `mohwp studio` / rhwp / 한컴 |

상세·한계·rhwp 역할: [docs/WORKFLOW-TERMINAL-DOC.md](docs/WORKFLOW-TERMINAL-DOC.md)

---

## 30초로 써 보기

에이전트에게:

```text
cu2022-mcp의 lesson_pack으로 "5학년 분수, 부진 포함 45분" 수업 골격을 만들고,
citationTexts의 코드·문장만 인용한 뒤 lesson_pack_validate로 검사해 줘.
```

```text
curriculum_search로 중2 일차함수 성취기준을 찾고
assessment_scaffold로 형성평가 3문항 골격을 만들어 줘.
```

더 많은 시나리오 → [docs/MANUAL.md](docs/MANUAL.md)

---

## 설계 원칙

1. **Cite-only** — 성취기준 코드·문장은 도구 결과만. 창작 금지.  
2. **검색 우선** — 생성 전에 `curriculum_search` / `lesson_pack`.  
3. **품질 투명** — `truncated_suspect` 플래그·검색 감점·`curriculum_quality`.  
4. **교사 최종 책임** — 보조 도구. 학교 배정표·고시 원문과 대조.  
5. **개인정보 금지** — 학생 실명·성적·상담 내용을 넣지 말 것.

서버 자체는 **LLM을 호출하지 않습니다.** 검색·템플릿·검증은 결정론적입니다.  
호스트 모델이 `agentGenerationBrief`를 보고 문장만 구체화하면 됩니다.

---

## 품질 (v1.1.1 요약)

| 한계 | 완화 |
|------|------|
| PDF 추출 잘림 | 멀티소스 복구, 노이즈 제거, `quality` 플래그 |
| 전문교과 노이즈 | 검색 감점, 일반교과 우선 |
| 규칙형 Lesson Pack | 오개념·활동 뱅크 + 호스트 모델 구체화 지시 |
| 코드 환각 | `lesson_pack_validate` + `citationRule` |

상세는 `curriculum_quality` 도구 또는 `data/quality-report.json` 참고.

---

## 환경 변수

| 변수 | 설명 |
|------|------|
| `CU2022_DATA_PATH` | 커스텀 `standards.json` 경로 |
| `CU2022_SOURCE_ROOT` | `npm run build:data` 시 원문 마크다운 루트 (**재인덱싱 시에만**) |
| `CU2022_INCLUDE_PRO` | `0`이면 전문교과 제외 재빌드 |

일반 사용자는 **번들된 `data/standards.json`**만으로 동작합니다. 재빌드가 필요 없습니다.

---

## 개발 · QA

```bash
npm install
npm run build
npm start          # stdio MCP
npm run qa:smoke   # 툴 스모크 (cite-only 포함)
```

```bash
# 원문 마크다운이 있을 때만 인덱스 재생성
export CU2022_SOURCE_ROOT=/path/to/curriculum-md-root
npm run build:data
npm run build
```

---

## 명칭

| 부르는 말 | 설명 |
|-----------|------|
| **`cu2022-mcp`** | **공식 명칭** — 패키지·CLI·MCP 설정 키 |
| **성취기준 커넥터** | 한글 제품 표기 (소개·매뉴얼·발표) |
| `cu2022-mcp` | GitHub 리포지토리 이름 (구 `2022CU-kr0-mcp` 링크는 자동 리다이렉트) |

---

## 면책

- 성취기준 원문의 **법적 근거는 교육부 고시 및 공식 교육과정 문서**입니다.  
- 본 소프트웨어는 수업·평가·행정 **보조**이며, 최종 판단·공문 책임은 교사·학교에 있습니다.  
- 교육과정 텍스트는 **공공 교육과정 인용·연구·수업 준비** 목적입니다.  
- **학생 개인정보·성적을 도구/모델에 입력하지 마세요.**

## 라이선스

- **코드:** MIT  
- **교육과정 문구:** 공공 교육과정 출처 표기 하에 인용. 재배포 시 고시·원문 정책을 확인하세요.

## 링크

- Repository: https://github.com/reallygood83/cu2022-mcp  
- Manual: [docs/MANUAL.md](docs/MANUAL.md)  
- MCP 사양: https://modelcontextprotocol.io  
