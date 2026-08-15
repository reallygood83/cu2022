/**
 * ChatGPT 앱·커넥터 호환 search / fetch.
 * https://platform.openai.com/docs/mcp
 */
import { getByCode, searchStandards, schoolLevelLabel } from "./data.js";

export function publicBaseUrl(): string {
  const env = process.env.CU2022_PUBLIC_URL?.replace(/\/+$/, "");
  if (env) return env;
  const port = process.env.PORT || process.env.CU2022_HTTP_PORT || "8787";
  return `http://127.0.0.1:${port}`;
}

export function standardUrl(code: string): string {
  return `${publicBaseUrl()}/s/${encodeURIComponent(code)}`;
}

export function parseFetchId(id: string): string {
  const raw = id.trim();
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/\/s\/([^/]+)$/);
    if (m) return decodeURIComponent(m[1]);
  } catch {
    /* not a URL */
  }
  const hash = raw.match(/#(?:code=)?([^#]+)$/);
  if (hash && /[0-9]/.test(hash[1])) return decodeURIComponent(hash[1]);
  return raw;
}

export function chatgptSearch(query: string) {
  const hits = searchStandards({ query, limit: 10 });
  return {
    results: hits.map((h) => ({
      id: h.code,
      title: `${h.code} · ${h.course || h.subject} · ${schoolLevelLabel(h.schoolLevel)}`,
      url: standardUrl(h.code),
    })),
  };
}

export function chatgptFetch(id: string) {
  const code = parseFetchId(id);
  const hit = getByCode(code);
  if (!hit) {
    return {
      id: code,
      title: `${code} (없음)`,
      text: `인덱스에 없는 코드입니다: ${code}. search 도구로 다시 찾으세요. 코드를 창작하지 마세요.`,
      url: standardUrl(code),
      metadata: { found: false },
    };
  }
  const course = hit.course ? ` / ${hit.course}` : "";
  return {
    id: hit.code,
    title: `${hit.code} · ${hit.subject}${course}`,
    text: [
      `코드: ${hit.code}`,
      `학교급: ${schoolLevelLabel(hit.schoolLevel)}`,
      `교과: ${hit.subject}`,
      hit.course ? `과목: ${hit.course} (${hit.courseType ?? ""})` : "",
      hit.domain ? `영역: ${hit.domain}` : "",
      "",
      hit.text,
      "",
      "cite-only: 이 코드·문장만 성취기준으로 인용하세요. 없는 코드를 만들지 마세요.",
    ]
      .filter((line) => line !== "")
      .join("\n"),
    url: standardUrl(hit.code),
    metadata: {
      found: true,
      schoolLevel: hit.schoolLevel,
      subject: hit.subject,
      course: hit.course,
      courseType: hit.courseType,
      sourceFile: hit.sourceFile,
    },
  };
}

export function standardHtmlPage(code: string): { status: number; html: string } {
  const hit = getByCode(code);
  const title = hit
    ? `${hit.code} · ${hit.course || hit.subject}`
    : `${code} · 없음`;
  const body = hit
    ? `<p class="meta">${schoolLevelLabel(hit.schoolLevel)} · ${hit.subject}${
        hit.course ? ` · ${hit.course}` : ""
      }</p><p class="text">${escapeHtml(hit.text)}</p>`
    : `<p>인덱스에 없는 코드입니다.</p>`;
  return {
    status: hit ? 200 : 404,
    html: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.6}
.meta{color:#555;font-size:.9rem} code{background:#f4f4f4;padding:.1rem .3rem}</style>
</head><body>
<h1><code>${escapeHtml(hit?.code ?? code)}</code></h1>
${body}
<p><small>cu2022-mcp · 2022 개정 교육과정 성취기준. 원문 근거는 교육부 고시.</small></p>
</body></html>`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
