# ChatGPT 앱에서 성취기준 검색하기

`cu2022-mcp`는 ChatGPT 커넥터 규격의 **`search` / `fetch`** 도구를 제공합니다.  
ChatGPT 웹·모바일 앱은 로컬 `npx`를 실행하지 않으므로, **공개 HTTPS 주소의 `/mcp`** 에 연결합니다.

## 1. HTTP 서버 실행

```bash
git clone https://github.com/reallygood83/cu2022.git
cd cu2022
npm install
npm run build
export CU2022_PUBLIC_URL=https://your-host.example   # 인용 URL에 쓰임
npm run start:http
```

- MCP 엔드포인트: `http://localhost:8787/mcp`
- 헬스: `http://localhost:8787/health`
- 성취기준 페이지: `http://localhost:8787/s/6수01-06`

## 2. HTTPS로 노출

로컬 시험:

```bash
npx --yes cloudflared tunnel --url http://localhost:8787
```

나온 `https://….trycloudflare.com/mcp` 를 ChatGPT에 넣습니다.

상시 배포는 리포 루트 [`Dockerfile`](../Dockerfile)을 Railway / Fly / Render에 올리면 됩니다.  
배포 후 `CU2022_PUBLIC_URL=https://실제도메인` 을 환경 변수로 넣으세요.

## 3. ChatGPT에 커넥터 추가

필요: Plus / Pro / Business / Enterprise 등 **Developer mode(또는 Apps 만들기)** 가 열리는 요금제.

1. ChatGPT 웹 → **Settings → Apps → Create**  
   (또는 **Settings → Connectors → Advanced → Developer mode**)
2. 이름: `cu2022-mcp` (또는 `성취기준 커넥터`)
3. MCP URL: `https://YOUR-HOST/mcp`
4. 인증: 없음
5. **Scan tools** → `search`, `fetch` 및 수업 도구가 보이면 Create

## 4. 검색해 보기

새 대화를 열고 앱/커넥터를 켠 뒤:

```text
5학년 분수 성취기준 찾아줘
```

```text
고등 확률과 통계 조건부확률 성취기준 본문을 가져와 줘
```

ChatGPT는 `search`로 목록을 받고 `fetch`로 코드를 인용합니다.  
없는 코드는 만들지 말고, 도구 결과의 code/text만 쓰라고 서버가 지시합니다.

## 5. ChatGPT 데스크톱 + Codex (로컬)

웹 앱 없이 쓰려면:

```bash
codex mcp add cu2022-mcp -- npx -y github:reallygood83/cu2022
```

설정 파일: [`examples/codex_config.toml`](../examples/codex_config.toml)

## 한계

- ChatGPT **스토어에 공개 등록**하려면 OpenAI 심사·플러그인 디렉터리가 필요합니다. 이 저장소는 커넥터 URL을 붙이는 방식까지 지원합니다.
- Agent 모드는 커스텀 앱을 쓰지 않을 수 있습니다. Deep Research는 읽기(`search`/`fetch`)만 사용합니다.
- 성취기준 원문의 법적 근거는 교육부 고시입니다.
