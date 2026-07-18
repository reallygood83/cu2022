#!/usr/bin/env node
/**
 * MCP stdio smoke: list tools + critical tool calls.
 * Usage: npm run qa:smoke
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const transport = new StdioClientTransport({
  command: "node",
  args: [join(root, "dist/index.js")],
  cwd: root,
});
const client = new Client({ name: "mcp-qa-smoke", version: "1.0.0" });
await client.connect(transport);

async function call(name, args = {}) {
  const t0 = Date.now();
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.map((c) => c.text || "").join("\n") || "";
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  if (res.isError) throw new Error(`${name} error: ${text.slice(0, 300)}`);
  return { ms: Date.now() - t0, data };
}

const checks = [];
const pass = (name, cond, detail = "") => {
  checks.push({ name, pass: !!cond, detail });
  if (!cond) console.error("FAIL", name, detail);
  else console.log("PASS", name, detail);
};

const tools = await client.listTools();
const names = tools.tools.map((t) => t.name);
pass("tool_count_10", names.length === 10, names.join(","));

const stats = await call("curriculum_stats");
pass("stats_total", (stats.data.total ?? 0) >= 40000, String(stats.data.total));

const search = await call("curriculum_search", {
  query: "5학년 분수",
  schoolLevel: "elementary",
  limit: 5,
});
pass("search_hits", (search.data.results?.length ?? 0) >= 1);
pass("citationRule", !!search.data.citationRule);

const code = search.data.results?.[0]?.code || "6수01-06";
const got = await call("curriculum_get", { code });
pass("get_found", got.data.found === true, code);

const pack = await call("lesson_pack", {
  query: "5학년 분수, 부진 포함 45분",
  schoolLevel: "elementary",
  durationMin: 45,
});
pass("pack_standards", (pack.data.standards?.length ?? 0) >= 1);
pass("pack_brief", !!pack.data.agentGenerationBrief?.citationCodes?.length);

const real = pack.data.standards?.[0]?.code || code;
const bad = await call("lesson_pack_validate", {
  draft: `성취기준 6수01-99 와 ${real}`,
  query: "분수",
  schoolLevel: "elementary",
});
pass("validate_rejects_fake", bad.data.ok === false && (bad.data.unknownCodes || []).includes("6수01-99"), JSON.stringify(bad.data.unknownCodes));

const good = await call("lesson_pack_validate", {
  draft: `성취기준 ${real}`,
  allowedCodes: [real],
});
pass("validate_ok", good.data.ok === true);

const quality = await call("curriculum_quality", { sampleLimit: 3 });
const genPct =
  quality.data.meta?.highGeneralCompletePct ??
  quality.data.counts?.highGeneralCompletePct;
pass("high_general_complete", Number(genPct) >= 99, String(genPct));

await call("assessment_scaffold", { query: "중2 일차함수", schoolLevel: "middle", itemCount: 3 });
pass("assessment", true, "called");
await call("parent_notice_draft", { query: "현장체험학습", schoolLevel: "elementary" });
pass("parent_notice", true, "called");
await call("unit_map", { query: "분수", schoolLevel: "elementary", limit: 6 });
pass("unit_map", true, "called");

await client.close();

const passed = checks.filter((c) => c.pass).length;
const report = {
  generatedAt: new Date().toISOString(),
  version: "1.1.1",
  score: passed / checks.length,
  pass: passed === checks.length,
  passed,
  total: checks.length,
  checks,
  tools: names,
};
mkdirSync(join(root, "qa"), { recursive: true });
writeFileSync(join(root, "qa/mcp-tool-matrix.json"), JSON.stringify(report, null, 2));
writeFileSync(
  join(root, "qa/mcp-qa-artifact.md"),
  `# cu2022-mcp QA (성취기준 커넥터)\n\npass: **${report.pass}** (${passed}/${checks.length})\n\n` +
    checks.map((c) => `- [${c.pass ? "PASS" : "FAIL"}] ${c.name} ${c.detail || ""}`).join("\n") +
    "\n",
);

if (!report.pass) {
  console.error("QA FAILED", report);
  process.exit(1);
}
console.log("QA OK", report.score);
