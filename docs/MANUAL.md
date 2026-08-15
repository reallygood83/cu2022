# 성취기준 커넥터 활용 매뉴얼

**공식 명칭:** `cu2022-mcp`  
**대상:** 초·중·고 교사, 교육 연구자, 에듀테크 개발자, AI 에이전트 사용자  
**전제:** MCP 클라이언트에 `cu2022-mcp` 서버가 연결되어 있음  
**설치:** [README 설치 안내](../README.md#설치-복붙-한-번이면-됩니다) — JSON 복붙 + 앱 재시작. 클론 불필요.  
**관련:** [README.md](../README.md)

---

## 1. 이 도구로 할 수 있는 일 / 없는 일

### 할 수 있는 일

| 목적 | 권장 도구 | 결과물 |
|------|-----------|--------|
| 성취기준 찾기 | `curriculum_search`, `curriculum_get` | 코드 + 원문 |
| 한 차시 수업 골격 | `lesson_pack` | 기준·오개념·활동·형성평가 |
| 수업안 코드 검증 | `lesson_pack_validate` | 창작 코드 여부 |
| 형성·총괄 평가 틀 | `assessment_scaffold` | 문항 유형·채점 포인트 골격 |
| 학부모 안내 초안 | `parent_notice_draft` | 안심 문체 초안 |
| 단원·영역 묶기 | `unit_map` | 영역 클러스터 |
| 데이터 품질 확인 | `curriculum_stats`, `curriculum_quality` | 건수·잘림 의심 비율 |

### 하지 않는 일 (의도적)

- 학생 개인정보·성적·생활기록 처리  
- 학교 공문 결재·문서 영속 저장  
- 교육부 고시를 “대체”하는 법적 해석  
- 서버 내부 LLM 호출 (호스트 모델이 구체화)

---

## 2. 기본 사용 규칙 (꼭 지키기)

1. **성취기준은 도구 결과만 인용**한다. 코드를 추측·생성하지 않는다.  
2. 수업·평가 문장을 다듬은 뒤에는 **`lesson_pack_validate`**로 코드를 재검사한다.  
3. `quality=truncated_suspect` 또는 품질 경고가 있으면 **원문(고시·교과서 지도서)과 대조**한다.  
4. 출력 맨 아래에 **「학교 교육과정 배정표와 대조 · 교사 검토 필수」**를 남긴다.  
5. **실명·학번·성적·민감 상담** 내용은 프롬프트에 넣지 않는다.

---

## 3. 역할별 시나리오

### 3.1 담임·교과 교사 — 내일 수업 준비 (약 5분)

**목표:** 45분 차시 골격 + 형성평가 + (선택) 가정 안내 한 줄.

**프롬프트 예시**

```text
cu2022-mcp의 lesson_pack 도구로 다음 수업을 준비해 줘.
- 학교급: 초등
- 주제: 분수 크기 비교
- 시수: 45분
- 조건: 부진 학생 스캐폴드 포함

절차:
1) lesson_pack 호출
2) citationTexts의 코드·문장만 성취기준으로 사용
3) agentGenerationBrief에 따라 발문·활동을 학급 맥락에 맞게 구체화
4) lesson_pack_validate로 최종 초안 검증
5) 학교 배정표 대조 면책 문구 추가
```

**기대 흐름**

```
curriculum 검색(내장) → standards 선정
→ misconceptions / activities / formativeItems
→ (호스트) 문장 구체화
→ validate → 문서/메모장으로 복사
```

---

### 3.2 교과 교사 — 형성평가 3문항

```text
curriculum_search로 "중2 일차함수" 성취기준을 찾은 뒤,
assessment_scaffold로 형성평가 3문항 골격을 만들어 줘.
각 문항에 연결할 성취기준 코드를 도구 결과에서만 붙여 줘.
```

**활용 팁**

- `itemCount` 1~10  
- 실제 수치·선택지는 교사가 단원 진도에 맞게 채움  
- 고등·학점제 맥락이면 응답의 최소 성취·보충 안내 노트를 참고

---

### 3.3 담임 — 학부모 안내문 초안

```text
parent_notice_draft로 "현장체험학습 준비물 안내" 초안을 만들어 줘.
관련 성취기준이 있으면 검색해 사실 문장에만 인용하고,
개인 학생 이름·성적은 넣지 마.
발송 전 체크리스트를 함께 출력해 줘.
```

**톤 규칙 (도구가 안내하는 것과 동일)**

- 사실 우선 · 비난·과장 금지 · 짧은 문장 · 정중 요청  
- 발송 전: 날짜·대상·사실관계·개인정보 미포함·학교 공식 톤

---

### 3.4 연구·교육과정 담당 — 단원 맵

```text
unit_map으로 "초등 수학 분수" 관련 성취기준을 영역별로 묶어 줘.
limit 12, schoolLevel elementary.
지도 순서 제안은 학교 배정표와 맞추라는 주의도 포함해 줘.
```

---

### 3.5 AI·에듀테크 개발자 — 환각 방지 파이프라인

```text
1) curriculum_search(query)
2) 생성(호스트 LLM) 시 code/text 화이트리스트만 사용
3) lesson_pack_validate(draft, allowedCodes)
4) ok=false 이면 unknownCodes 제거 후 재생성
```

**API 관점 (호스트 앱에 붙일 때)**

- 런타임: MCP stdio 또는 동일 로직을 HTTP로 감싼 브리지  
- 응답 envelope에 `citationRule` / `quality` 를 그대로 전달  
- UI: 코드 칩 + 잘림 경고 뱃지 + 검증 배너

---

### 3.6 예비 교사·연수 — 기준 언어 익히기

```text
curriculum_search로 "광합성" 초·중 성취기준을 비교해 줘.
코드와 원문만 표로 정리하고, 임의 해석은 붙이지 마.
```

---

## 4. 도구 레퍼런스 (입출력 핵심)

### `curriculum_search`

| 인자 | 설명 |
|------|------|
| `query` | 예: `5학년 분수`, `9수02-15`, `중2 일차함수` |
| `schoolLevel` | `elementary` \| `middle` \| `high` \| `all` |
| `subject` | 선택. 예: `수학`, `국어` |
| `limit` | 1~50, 기본 10 |

**응답 포인트:** `code`, `text`, `score`, `quality`, `citationRule`

### `lesson_pack`

| 인자 | 설명 |
|------|------|
| `query` | 주제 + 조건 자연어 |
| `durationMin` | 10~120 |
| `includeParentNotice` | 기본 true |

**응답 포인트:** `standards`, `learningFocus`, `misconceptions`, `activities`, `formativeItems`, `agentGenerationBrief`, `quality`, `disclaimer`

`agentGenerationBrief`는 **호스트 모델용 지시**입니다. 사용자 UI에는 접어 두고, “활동을 구체화하라”는 용도로 쓰면 됩니다.

### `lesson_pack_validate`

| 인자 | 설명 |
|------|------|
| `draft` | 검증할 수업안·안내문 전체 텍스트 |
| `allowedCodes` | 허용 코드 목록 (있으면 우선) |
| `query` | allowedCodes 없을 때 검색 후보 생성용 |

**판정:** `ok`, `unknownCodes`, `warnings`, `recommendation`

### 기타

- `curriculum_get(code)` — 단건  
- `assessment_scaffold` — 평가 골격  
- `parent_notice_draft` — 가정 안내  
- `unit_map` — 영역 클러스터  
- `curriculum_quality` — 데이터 품질 투명 공개  

---

## 5. 추천 워크플로

```text
[교사 요청]
    │
    ▼
curriculum_search  ──►  후보 코드·원문
    │
    ▼
lesson_pack / assessment / parent_notice
    │
    ▼
호스트 모델이 agentGenerationBrief로 문장 구체화
    │
    ▼
lesson_pack_validate
    │
    ├─ ok=false → 창작 코드 제거 후 재작성
    └─ ok=true  → 교사 검토 → 수업/발송/저장
```

---

## 6. 프롬프트 치트시트

| 상황 | 한 줄 |
|------|--------|
| 수업 | `lesson_pack으로 「…」 45분, 초등, 부진 포함. cite-only + validate.` |
| 평가 | `「…」 assessment_scaffold 3문항. 코드는 search 결과만.` |
| 안내 | `parent_notice_draft 「…」. 개인정보 금지, 체크리스트 포함.` |
| 검증 | `다음 초안을 lesson_pack_validate 해 줘: …` |
| 품질 | `curriculum_quality로 인덱스 상태를 요약해 줘.` |
| 탐색 | `curriculum_search 「…」 schoolLevel=middle limit=10` |

---

## 7. 품질 플래그 읽는 법

| 값 | 의미 | 사용자 안내 카피 예 |
|----|------|---------------------|
| `ok` | 본문 완전성 휴리스틱 통과 | 확인됨 |
| `repaired` | 복구 파이프라인 적용됨 | 복구됨 (원문 대조 권장) |
| `truncated_suspect` | 잘림·노이즈 의심 | **원문 확인 필요** |

전문교과·특수 코드는 일반 수업 검색에서 점수가 낮게 나올 수 있습니다.  
시연·연수 기본 예시는 **초등·중등 일반교과**를 권장합니다.

---

## 8. 클라이언트별 팁

| 클라이언트 | 팁 |
|------------|-----|
| Claude Desktop / Code | 프롬프트에 “반드시 cu2022-mcp 도구 먼저”를 시스템·프로젝트 규칙에 고정 |
| Cursor | 리포 규칙에 cite-only 워크플로 명시 |
| Codex CLI / ChatGPT 데스크톱 | `codex mcp add cu2022-mcp -- npx -y github:reallygood83/cu2022` |
| ChatGPT 웹·앱 | HTTP `/mcp` 커넥터 + `search`/`fetch`. [docs/CHATGPT.md](CHATGPT.md) |
| 자체 앱 | stdio 대신 동일 함수를 HTTP로 감싸도 스키마 유지 |

---

## 9. FAQ

**Q. 인터넷이 필요한가?**  
A. 런타임은 로컬 인덱스만 사용합니다. `npx github:…` 최초 설치 시에만 네트워크가 필요합니다.

**Q. 설치가 복잡한가?**  
A. 아닙니다. Node.js 18+가 있으면 JSON을 한 번 붙여 넣고 앱을 재시작하면 됩니다. 클론·빌드는 개발할 때만 필요합니다. 자세한 단계는 [README 설치](../README.md#설치-복붙-한-번이면-됩니다)를 보세요.

**Q. 우리 학교 배정 성취기준과 다르면?**  
A. 정상입니다. 국정·고시 문장과 학교 배정표는 다를 수 있습니다. **배정표를 우선**하고, 본 도구는 고시 언어 참고용입니다.

**Q. 고등 전문교과 코드가 이상하다.**  
A. `curriculum_quality`와 검색 품질 플래그를 확인하세요. 전문 트랙은 추출 난이도가 높아 감점·경고됩니다.

**Q. 데이터를 우리 방식으로 바꾸고 싶다.**  
A. `CU2022_DATA_PATH`로 커스텀 `standards.json`을 지정하거나, 원문 마크다운 루트를 `CU2022_SOURCE_ROOT`로 두고 `npm run build:data`를 실행하세요.

**Q. 학생 이름을 넣어도 되나?**  
A. **안 됩니다.** 안내문·상담 예시도 가명·역할만 사용하세요.

**Q. 공식 이름이 뭐야?**  
A. 패키지·설정·CLI는 **`cu2022-mcp`**, 한글 표기는 **성취기준 커넥터**입니다.

---

## 10. 면책

- 교육과정 원문 권위는 **교육부 고시 및 공식 문서**에 있습니다.  
- 본 MCP는 수업·평가·행정 **보조**이며 최종 책임은 사용자(교사·기관)에게 있습니다.  
- 코드(MIT)와 교육과정 문구(공공 인용)의 이용 범위를 구분해 주세요.

---

## 11. 변경·지원

- 이슈: 리포 Issues  
- 버전: `package.json` / `curriculum_stats`  
- 스모크: `npm run qa:smoke`

---

## 12. 터미널에서 지도안·가정통신문 파일 저장 (cu2022-doc)

MCP 클라이언트 없이 터미널만으로 과정안/가정통신문을 **한컴 호환 HWPX**로 저장합니다.

```bash
npm install kordoc
npm run build
npx cu2022-doc lesson "분수 나눗셈 기초 40분" --level elementary --min 40 -o ~/Downloads --open
npx cu2022-doc notice "현장체험학습 준비물 안내" --school ○○초 -o ~/Downloads
```

- 출력: `.md` + **`.hwpx`** (권장). 레거시 `.hwp` 바이너리 **신규 생성은 미지원** → 한컴에서 재저장.
- kordoc = 생성/파싱, rhwp/master-of-hwp = 뷰어·편집(선택).
- 상세: [WORKFLOW-TERMINAL-DOC.md](./WORKFLOW-TERMINAL-DOC.md)
