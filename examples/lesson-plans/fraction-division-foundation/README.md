# 예시: 분수 나눗셈 기초 강화 (40분)

부진·보충 학생을 위한 **개념 기초** 집중 차시 예시입니다.

| 파일 | 설명 |
|------|------|
| [01-교수학습과정안.md](./01-교수학습과정안.md) | 한국형 표 형식 과정안 (40분) |
| [02-학습지.md](./02-학습지.md) | 학생용 학습지 (진단·탐구·형성평가) |

## 생성 워크플로 (재현)

```text
cu2022-mcp
  curriculum_search("분수 나눗셈", elementary, 수학)
  lesson_pack(..., durationMin=40, 부진 기초 강화)
  lesson_pack_validate → ok
→ 과정안 표 + 학습지 문서화
```

## 인용 성취기준

- **6수01-10** (주) 나눗셈 몫을 분수로  
- **6수01-11** (연결) 분수 나눗셈 원리 입문  
- **4수01-09** (선수) 등분할·분수 의미  

## 다음 단계 (HWP 제출)

1. 본 MD 표를 학교 양식에 맞게 옮기기  
2. (선택) kordoc `markdownToHwpx` 또는 rhwp 템플릿 채우기  
3. 한컴에서 열어 1~2장 분량·서식 확인  

면책: 수업 보조 자료. 최종 책임은 교사·학교. 배정표 대조 필수.

## HWPX 스파이크 결과

| 파일 | 설명 |
|------|------|
| `03-과정안-1장-compact.md` | 1장용 압축 MD |
| **`03-과정안-1장.hwpx`** | kordoc `markdownToHwpx` 생성물 |
| `03-과정안-1장.roundtrip.md` | HWPX 재파싱 검증용 |
| `04-학습지.hwpx` | 학습지 HWPX |

```bash
# 재생성 (저장소 루트에서 kordoc 설치 후)
npm i kordoc
node examples/lesson-plans/fraction-division-foundation/export-hwpx.mjs
```

검증: `validateHwpx` ok, roundtrip parse success, ZIP 구조(mimetype, Contents/section0.xml) 정상.
