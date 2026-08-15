#!/usr/bin/env node
/**
 * ChatGPT 앱용 Streamable HTTP MCP.
 * 커넥터 URL: https://YOUR-HOST/mcp
 */
import { createServer, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createCu2022Server } from "./index.js";
import { parseFetchId, publicBaseUrl, standardHtmlPage } from "./chatgpt.js";
import { loadDataset } from "./data.js";

function cors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, mcp-session-id, Last-Event-ID, MCP-Protocol-Version",
  );
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

function send(res: ServerResponse, status: number, body: string, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

export async function startHttpServer() {
  try {
    loadDataset();
  } catch (e) {
    console.error("[cu2022-mcp] dataset load failed:", e);
    process.exit(1);
  }

  const port = Number(process.env.PORT || process.env.CU2022_HTTP_PORT || 8787);
  const host = process.env.CU2022_HTTP_HOST || "0.0.0.0";

  const http = createServer(async (req, res) => {
    cors(res);
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      send(
        res,
        200,
        JSON.stringify({
          name: "cu2022-mcp",
          ok: true,
          mcp: "/mcp",
          hint: "ChatGPT 커넥터 URL은 이 호스트의 /mcp 입니다.",
        }),
        "application/json; charset=utf-8",
      );
      return;
    }

    const doc = url.pathname.match(/^\/s\/([^/]+)$/);
    if (req.method === "GET" && doc) {
      const page = standardHtmlPage(parseFetchId(decodeURIComponent(doc[1])));
      send(res, page.status, page.html, "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/mcp") {
      const server = createCu2022Server();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    send(res, 404, "not found");
  });

  await new Promise<void>((resolve) => {
    http.listen(port, host, () => resolve());
  });

  const base = publicBaseUrl();
  console.error(`[cu2022-mcp] HTTP ${host}:${port}`);
  console.error(`[cu2022-mcp] ChatGPT connector: ${base}/mcp`);
}

function isDirectRun() {
  const entry = process.argv[1] || "";
  return entry.endsWith("http.js") || entry.endsWith("http.ts");
}

if (isDirectRun()) {
  startHttpServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
