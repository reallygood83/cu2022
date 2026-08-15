# 성취기준 커넥터 · cu2022-mcp

**2022 개정 교육과정 성취기준을 AI 에이전트에 안전하게 연결하는 MCP 서버**

> AI가 성취기준 **코드를 지어내지 못하게** 하고,  
> **인덱스에 있는 코드·문장만** 검색·인용·수업 골격에 쓰게 합니다.

[![MCP](https://img.shields.io/badge/MCP-stdio-blue)](https://modelcontextprotocol.io)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.0-informational)](package.json)

| | |
|--|--|
| **공식 명칭** | **`cu2022-mcp`** |
| **한글 표기** | **성취기준 커넥터** |
| **의미** | 2022 개정 성취기준을 cite-only로 에이전트에 연결 |
| **CLI** | `cu2022-mcp` (MCP) · **`cu2022-doc`** (터미널 → HWPX) |
| **GitHub 리포** | [`reallygood83/cu2022`](https://github.com/reallygood83/cu2022) (구 `2022CU-kr0-mcp` 는 리다이렉트) |

📖 **활용 매뉴얼:** [docs/MANUAL.md](docs/MANUAL.md)  
📄 **터미널 문서 워크플로:** [docs/WORKFLOW-TERMINAL-DOC.md](docs/WORKFLOW-TERMINAL-DOC.md)

**설치:** Node.js 18+ → 아래 JSON을 Cursor / Claude에 붙여 넣고 재시작. [자세히](#설치-복붙-한-번이면-됩니다)

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

## 설치 (복붙 한 번이면 됩니다)

**클론·빌드 없이** `npx`로 바로 붙입니다. Node.js 18+만 있으면 됩니다.

```bash
node -v   # v18 이상이면 OK. 없으면 https://nodejs.org 에서 LTS 설치
```

아래 JSON을 쓰는 앱에 붙여 넣고, **앱을 한 번 재시작**하세요.

```json
{
  "mcpServers": {
    "cu2022-mcp": {
      "command": "npx",
      "args": ["-y", "github:reallygood83/cu2022"]
    }
  }
}
```

> GitHub 리포 이름은 **`cu2022`** 입니다. MCP 설정 키·패키지 이름은 **`cu2022-mcp`** 입니다. 옛 주소 `2022CU-kr0-mcp` 도 리다이렉트됩니다.

### Cursor

1. **Settings → MCP → New MCP Server** (또는 `~/.cursor/mcp.json` 을 직접 엽니다)
2. 위 JSON을 그대로 붙여 넣습니다. 이미 `mcpServers`가 있으면 `cu2022-mcp` 블록만 추가합니다.
3. Cursor를 재시작한 뒤 MCP 목록에서 `cu2022-mcp`가 초록(연결됨)인지 확인합니다.

예제: [`examples/cursor_mcp.json`](examples/cursor_mcp.json)

### Claude Desktop

1. 설정 파일을 엽니다.
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
2. 위 JSON을 붙여 넣습니다 (`mcpServers`에 합치기).
3. Claude Desktop을 **완전히 종료했다가** 다시 켭니다.

예제: [`examples/claude_desktop_config.json`](examples/claude_desktop_config.json)

### Claude Code

프로젝트 폴더에서 한 줄이면 됩니다.

```bash
claude mcp add cu2022-mcp -- npx -y github:reallygood83/cu2022
```

또는 프로젝트 `.mcp.json`에 같은 JSON을 넣습니다. 예제: [`examples/claude_code_mcp.json`](examples/claude_code_mcp.json)

### 설치됐는지 확인

에이전트에게 이렇게 물어보세요.

```text
cu2022-mcp의 curriculum_stats를 호출해서 성취기준 건수를 보여 줘.
```

초·중·고 건수가 나오면 성공입니다. 이어서:

```text
curriculum_search로 "5학년 분수" 성취기준을 찾아 줘.
```

### 안 될 때

| 증상 | 해결 |
|------|------|
| `node` 명령을 찾을 수 없음 | [Node.js LTS](https://nodejs.org) 설치 후 터미널·앱을 재시작 |
| MCP가 회색/오류 | 앱 완전 재시작. 첫 `npx`는 다운로드라 **1~2분** 걸릴 수 있음 |
| `npx` / GitHub 404 | args를 `["-y", "github:reallygood83/cu2022"]` 로 확인하세요 (옛 이름 `2022CU-kr0-mcp` 도 동작) |
| 도구가 안 보임 | 설정 JSON 문법(쉼표·중괄호) 확인 후 다시 저장 |

개발용으로 소스를 받아 돌리려면 [아래 로컬 클론](#로컬-클론-개발용)을 보세요.

---

## 도구 (11)

| Tool | 용도 |
|------|------|
| `curriculum_search` | 자연어·키워드·코드 검색 (**핵심**) — 고교 선택과목명(미적분Ⅰ, 확률과 통계 등) 인식, `course` 필터 지원 |
| `curriculum_get` | 코드 단건 조회 |
| `curriculum_list_subjects` | 학교급별 과목·건수 |
| `curriculum_list_courses` | **고교 과목 목록** (공통·일반선택·진로선택·융합선택·전문계열) |
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

## 품질 (v1.3.0 요약)

**v1.3.0 — 고교 선택과목 매칭 고도화:**
- 코드 접두(예: `12미적Ⅰ`, `12확통`, `12현윤`) → 2022 개정 과목 정식 명칭 복원 (`course`/`courseType` 필드, 일반교과 84% 커버)
- "미적분", "확률과 통계", "화법과 언어", "현대사회와 윤리" 같은 **선택과목명 검색** 지원 (별칭 포함: 확통, 미적, 윤사 등)
- 접두 기반 **교과 오분류 교정** 약 1,650건 (예: 현대사회와 윤리 `기타`→`도덕`, 독서와 작문 `제2외국어`→`국어`, 영어 독해와 작문 `국어`→`영어`)
- `curriculum_list_courses` 도구·`curriculum_search`의 `course` 필터 추가
- 초·중 검색 회귀 방지: 학교급 힌트(예: "중2", "5학년")가 있으면 고교 과목 추론을 생략

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

## 로컬 클론 (개발용)

소스 수정·QA가 필요할 때만 클론합니다. 일반 사용은 [위 npx 설치](#설치-복붙-한-번이면-됩니다)면 충분합니다.

```bash
git clone https://github.com/reallygood83/cu2022.git
cd cu2022
npm install
npm run build
```

```json
{
  "mcpServers": {
    "cu2022-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/cu2022/dist/index.js"]
    }
  }
}
```

```bash
# Claude Code (로컬 빌드)
claude mcp add cu2022-mcp -- node /absolute/path/to/cu2022/dist/index.js
```

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
| `cu2022` | GitHub 리포지토리 이름 (패키지·MCP 키는 `cu2022-mcp`. 구 `2022CU-kr0-mcp` 는 리다이렉트) |

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

- Repository: https://github.com/reallygood83/cu2022  
- Manual: [docs/MANUAL.md](docs/MANUAL.md)  
- MCP 사양: https://modelcontextprotocol.io  
