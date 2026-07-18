# 터미널 워크플로: 지도안·가정통신문 → 한컴 문서

## 결론 (가능성)

| 단계 | 도구 | 가능? | 비고 |
|------|------|-------|------|
| 성취기준 검색·Lesson Pack | **cu2022-mcp** | ✅ | cite-only, 가짜 코드 차단 |
| 과정안/가정통신문 MD 조립 | `cu2022-doc` + compose | ✅ | 샘플 과정안 표 형식 |
| **한글로 바로 쓰기 (생성)** | **kordoc** `markdownToHwpx` | ✅ **`.hwpx`** | macOS/Windows 한컴 호환 |
| 레거시 **`.hwp` 바이너리 신규 생성** | kordoc / rhwp | ⚠️ **미지원** | 파싱·패치는 가능, MD→HWP5 생성 경로 없음 |
| 뷰어·편집 | **rhwp** / **master-of-hwp** | ✅ 선택 | HWPX 열기·편집 후 재저장 |
| 터미널 한 줄 다운로드 | `cu2022-doc` | ✅ | 기본 저장: `~/Downloads/*.hwpx` |

**실무 권장:** 납품·공유 형식을 **`.hwpx`** 로 통일.  
학교 시스템이 `.hwp`만 받을 때는 한컴에서 **다른 이름으로 저장 → HWP**.

```
query
  → cu2022-mcp lesson_pack (codes + skeleton)
  → Markdown (메타 표 · 교사/학생 과정 · 평가 3단 · 성취기준 cite)
  → kordoc markdownToHwpx
  → ~/Downloads/….hwpx   (+ .md)
  → (선택) 한컴 / mohwp studio / rhwp 뷰어
  → (필요 시) 한컴에서 .hwp 재저장
```

## 설치

```bash
git clone https://github.com/reallygood83/2022CU-kr0-mcp.git
cd 2022CU-kr0-mcp
npm install
npm install kordoc          # HWPX 생성용 (optional peer)
npm run build
npm link                    # cu2022-doc, cu2022-mcp PATH 등록
```

또는 로컬 실행:

```bash
node scripts/export-teacher-doc.mjs lesson "분수 나눗셈 기초 40분" --level elementary --min 40
```

## 사용

### 지도안 (과정안)

```bash
cu2022-doc lesson "분수 나눗셈 개념, 부진 학생 기초 강화 40분" \
  --level elementary --min 40 --subject 수학 \
  -o ~/Downloads --open
```

### 가정통신문

```bash
cu2022-doc notice "현장체험학습 준비물 안내" \
  --school 한빛초등학교 -o ~/Downloads
```

### Markdown만

```bash
cu2022-doc lesson "소수÷자연수 계산 원리" --md-only -o ./out
```

## Claude / MCP와 함께

1. **에이전트:** Claude Desktop/Code에 `cu2022-mcp` 설치 → `lesson_pack`으로 골격  
2. **문서 파일:** 같은 머신에서 `cu2022-doc`으로 HWPX 저장  
3. **MYCL 로컬 시연:** `curriculum-bridge` (포트 4174) + UI 4173 — 브라우저 뷰어·Claude CLI 옵션

## kordoc · rhwp 역할 분담

| 라이브러리 | 역할 |
|------------|------|
| **kordoc** | MD↔HWPX 생성, HWP/HWPX **파싱**, 패치, SVG 미리보기 |
| **rhwp** (edwardkim) | HWP 바이너리 엔진·알고리즘 (kordoc 하위에 포팅·참조) |
| **master-of-hwp** | 데스크톱 스튜디오 뷰어/편집 실험 |

**오해 방지:** “rhwp로 .hwp 파일을 새로 만든다” ≠ 현재 안정 경로.  
생성의 정석은 **kordoc → HWPX**.

## 왜 .hwp 생성이 안 되나

- HWP 5.x는 OLE/CFB 바이너리 스펙이 폐쇄적이고 조판 캐시가 복잡함  
- 오픈소스(kordoc/rhwp)는 **읽기·일부 패치·export round-trip**에 강하고  
- **마크다운에서 표·문단을 새로 쌓는 생성**은 **HWPX(ZIP+XML)** 쪽이 표준화되어 있음  
- 한컴 최신 제품은 HWPX를 1급 형식으로 취급

## 검증 체크리스트

- [ ] `npm run build` 후 `cu2022-doc lesson "분수 나눗셈" -o /tmp/cu-out`
- [ ] `/tmp/cu-out/*.hwpx` 생성, 용량 > 1KB
- [ ] 한컴 또는 `npx kordoc /tmp/cu-out/*.hwpx` 파싱 시 성취기준 코드 보존
- [ ] `lesson_pack_validate` / cite-only 경고 없음 (실코드만)

## 관련 파일

- CLI: [`scripts/export-teacher-doc.mjs`](../scripts/export-teacher-doc.mjs)
- 조립: [`scripts/lib/compose.mjs`](../scripts/lib/compose.mjs)
- 예제 spike: [`examples/lesson-plans/fraction-division-foundation/`](../examples/lesson-plans/fraction-division-foundation/)
