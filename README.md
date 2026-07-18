# 2022CU-kr0-mcp

**2022 개정 교육과정 성취기준 MCP 서버**  
초·중·고 성취기준 검색 · Lesson Pack · 평가/가정안내 골격  
→ *Claude for Teachers* 스타일의 **한국형 커리큘럼 커넥터**를 모든 MCP 클라이언트에서 사용

[![MCP](https://img.shields.io/badge/MCP-stdio-blue)](https://modelcontextprotocol.io)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

## 왜 쓰나요?

| 문제 | 이 MCP |
|------|--------|
| AI가 성취기준 코드를 지어냄 | **인덱스에 있는 코드·문장만** 검색·인용 |
| 툴 진열만 있고 수업 흐름이 없음 | `lesson_pack`으로 **인용→오개념→활동→평가** |
| 학부모 안내 톤이 불안정 | `parent_notice_draft` 안심 문체 골격 |

**데이터:** 초등 611 · 중등 580 · 고등 44,000+ (일반+전문 포함, 빌드 시 로컬 원문 기준)

## 설치 (30초)

### 요구 사항
- Node.js **18+**
- 네트워크 (최초 `npx`/`npm` 시)

### 방법 A — npx (권장, 클로드/커서/코덱스 설정에 그대로)

```json
{
  "mcpServers": {
    "2022cu-kr0": {
      "command": "npx",
      "args": ["-y", "github:reallygood83/2022CU-kr0-mcp"]
    }
  }
}
```

> 패키지가 npm에 배포되기 전에는 `github:reallygood83/2022CU-kr0-mcp` 사용.  
> 로컬 클론 시 아래 B 방법.

### 방법 B — 로컬 클론

```bash
git clone https://github.com/reallygood83/2022CU-kr0-mcp.git
cd 2022CU-kr0-mcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "2022cu-kr0": {
      "command": "node",
      "args": ["/절대경로/2022CU-kr0-mcp/dist/index.js"]
    }
  }
}
```

### 클라이언트별 설정 위치

| 클라이언트 | 설정 파일 / 방법 |
|------------|------------------|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| **Claude Code** | `.mcp.json` 또는 `claude mcp add` |
| **Cursor** | Settings → MCP → 위 JSON |
| **Codex CLI** | MCP 설정에 stdio 서버 등록 (문서의 mcpServers) |
| **Gemini CLI** | MCP 확장/설정에 command+args 등록 |
| **Hermes / 기타** | MCP stdio 지원 시 `node dist/index.js` |

예: Claude Code

```bash
claude mcp add 2022cu-kr0 -- node /절대경로/2022CU-kr0-mcp/dist/index.js
```

## 도구 (Tools)

| Tool | 설명 |
|------|------|
| `curriculum_stats` | 데이터셋 통계 |
| `curriculum_list_subjects` | 학교급별 과목·건수 |
| `curriculum_search` | 자연어/키워드/코드 검색 (**핵심**, 품질 플래그 포함) |
| `curriculum_get` | 코드 단건 조회 |
| `curriculum_quality` | 잘림·복구·과목별 노이즈 리포트 |
| `lesson_pack` | 수업 패키지 + **agentGenerationBrief** (호스트 모델 구체화 지시) |
| `lesson_pack_validate` | 초안 속 성취기준 코드 **cite-only** 검증 |
| `assessment_scaffold` | 형성·총괄 평가 골격 |
| `parent_notice_draft` | 학부모 안내문 초안 |
| `unit_map` | 영역 클러스터 단원 지도 (Marble light) |

## 리소스 / 프롬프트

- Resource: `curriculum://meta`
- Prompt: `teacher_lesson_design`, `teacher_parent_notice`

## 품질 한계를 어떻게 넘나? (v1.1)

| 한계 | 보완 |
|------|------|
| PDF 추출 잘림 | 멀티소스 복구(wiki 완전문 · PDF multiline · 탐구/해설 노이즈 제거), `quality=truncated_suspect` 플래그 |
| 전문교과 노이즈 | 검색 시 전문교과 기본 감점, 일반교과 우선, `curriculum_quality`로 투명 공개 |
| Lesson Pack이 규칙+검색만 | **오개념/활동 뱅크**, 학습초점(지식·기능·태도·동사), 시수 배분, **`agentGenerationBrief`**로 호스트 LLM이 cite-only 구체화 |
| 모델이 코드 창작 | **`lesson_pack_validate`** + search 결과의 `citationRule` |

현재 인덱스 품질 대략치 (v1.1.1, `curriculum_quality`로 확인):

- 초·중: 사실상 완전 문장
- 고등 **일반교과** 완성도 ~**100%** (오분류 전문코드 재분류 + 잔여 복구)
- 전문교과: 검색 감점·`truncated_suspect` 플래그로 격리 (노이즈 잔존 가능)

## 교사 사용 예시

에이전트에게:

```text
lesson_pack 도구로 "5학년 분수, 부진 포함 45분" 수업안을 만들고,
agentGenerationBrief를 따라 활동을 구체화해.
성취기준은 citationTexts만 인용하고, 끝난 뒤 lesson_pack_validate로 검사해.
```

```text
curriculum_search로 중2 일차함수 성취기준 찾고
assessment_scaffold로 형성평가 3문항 골격 만들어줘.
```

```text
curriculum_quality로 데이터 품질 상태를 보고해줘.
```

## mycl Next (SaaS 데모) 연동 방향

로컬 `http://127.0.0.1:4173/` mycl Next:

1. **지금:** 에이전트(Claude 등)가 이 MCP로 성취기준·Lesson Pack 생성  
2. **다음:** mycl 백엔드가 동일 검색 API를 HTTP로 래핑  
3. **SaaS:** 교사 로그인 → 채팅에서 Lesson Pack 카드 → 문서함 이어달리기  

MCP는 **에이전트 레이어 토대**, mycl은 **교사 UI·업무 완주** 레이어입니다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `CU2022_DATA_PATH` | 커스텀 `standards.json` 경로 |
| `CU2022_SOURCE_ROOT` | `build:data` 시 md 원본 루트 (기본 LearningMaster PublicDocu) |
| `CU2022_INCLUDE_PRO` | `0`이면 전문교과 제외하고 인덱스 재빌드 |

데이터 재빌드:

```bash
npm run build:data
npm run build
```

## 개발

```bash
npm install
npm run build:data
npm run build
npm start   # stdio MCP
```

## 면책

- 성취기준 원문의 **법적 근거는 교육부 고시·NCIC PDF**입니다.
- 본 도구는 수업·평가 **보조**이며 최종 책임은 교사·학교에 있습니다.
- 학생 개인정보·성적을 MCP/모델에 넣지 마세요.

## 라이선스

MIT (코드). 교육과정 텍스트는 공공 교육과정 인용 목적.

## 관련

- 기획: mycl `docs/SERVICE-PLAN-KOREA-CLAUDE-FOR-TEACHERS.md`
- 원문 데이터: LearningMaster `001-PublicDocu/{초등,중등,고등}교육과정`

## QA

```bash
npm run build
npm run qa:smoke   # stdio로 툴 10종 스모크 (cite-only validate 포함)
```

결과는 `qa/mcp-qa-artifact.md`에 기록됩니다.
