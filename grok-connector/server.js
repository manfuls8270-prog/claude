#!/usr/bin/env node
// 그록(xAI Grok) MCP 커넥터
// Claude가 필요할 때 그록에게 질문하거나, 그록의 X(트위터)·웹 실시간 검색을 쓰게 해줍니다.
//
// 필요한 설정 (환경 변수):
//   XAI_API_KEY   : xAI 콘솔(https://console.x.ai)에서 발급한 API 키  [필수]
//   GROK_MODEL    : 사용할 그록 모델 이름 (기본값: grok-4)            [선택]
//   GROK_BASE_URL : API 주소 (기본값: https://api.x.ai/v1)            [선택]

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.XAI_API_KEY;
const MODEL = process.env.GROK_MODEL || "grok-4";
const BASE_URL = (process.env.GROK_BASE_URL || "https://api.x.ai/v1").replace(/\/$/, "");
const TIMEOUT_MS = 120_000;

function textResult(text, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

async function callXai(path, body) {
  if (!API_KEY) {
    throw new Error(
      "XAI_API_KEY가 설정되지 않았습니다. Claude 설정 파일의 grok 항목에 xAI API 키를 넣어주세요."
    );
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const raw = await res.text();
  if (!res.ok) {
    let hint = "";
    if (res.status === 401 || res.status === 403) hint = " (API 키가 잘못되었거나 권한이 없습니다)";
    else if (res.status === 429) hint = " (사용량 한도 초과 또는 크레딧 부족)";
    else if (res.status === 404) hint = ` (모델 이름 '${body.model}'을 확인하세요)`;
    throw new Error(`xAI API 오류 ${res.status}${hint}: ${raw.slice(0, 500)}`);
  }
  return JSON.parse(raw);
}

// Responses API 결과에서 본문 글과 출처 링크를 뽑아냅니다.
function extractResponsesText(data) {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text;
  const parts = [];
  const links = new Set();
  for (const item of data.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) {
      if (c.text) parts.push(c.text);
      for (const a of c.annotations || []) if (a.url) links.add(a.url);
    }
  }
  for (const u of data.citations || []) if (typeof u === "string") links.add(u);
  let text = parts.join("\n").trim();
  if (links.size) text += "\n\n출처:\n" + [...links].map((u) => `- ${u}`).join("\n");
  return text;
}

const server = new McpServer({ name: "grok-connector", version: "1.0.0" });

server.registerTool(
  "ask_grok",
  {
    title: "그록에게 질문하기",
    description:
      "xAI의 그록(Grok)에게 질문하고 답을 받아옵니다. 다른 AI의 의견이 필요하거나, 사용자가 '그록한테 물어봐'라고 할 때 사용하세요. 실시간 검색은 하지 않습니다(최신 정보는 grok_live_search 사용).",
    inputSchema: {
      question: z.string().min(1).describe("그록에게 보낼 질문"),
      system_prompt: z.string().optional().describe("그록의 역할·말투 지정 (선택)"),
    },
  },
  async ({ question, system_prompt }) => {
    try {
      const messages = [];
      if (system_prompt) messages.push({ role: "system", content: system_prompt });
      messages.push({ role: "user", content: question });
      const data = await callXai("/chat/completions", { model: MODEL, messages });
      const answer = data.choices?.[0]?.message?.content?.trim();
      return textResult(answer || "그록이 빈 답변을 보냈습니다.");
    } catch (e) {
      return textResult(String(e.message || e), true);
    }
  }
);

server.registerTool(
  "grok_live_search",
  {
    title: "그록 실시간 검색 (X·웹)",
    description:
      "그록이 X(트위터) 게시물과 웹을 실시간으로 검색해 요약합니다. 최신 여론, 실시간 반응, 오늘의 뉴스처럼 최신 정보가 필요할 때 사용하세요.",
    inputSchema: {
      query: z.string().min(1).describe("검색하고 요약할 내용 (예: '오늘 삼성전자에 대한 X 반응')"),
      sources: z
        .enum(["x", "web", "both"])
        .default("both")
        .describe("검색 범위: x(트위터만), web(웹만), both(둘 다)"),
    },
  },
  async ({ query, sources }) => {
    try {
      const tools = [];
      if (sources === "x" || sources === "both") tools.push({ type: "x_search" });
      if (sources === "web" || sources === "both") tools.push({ type: "web_search" });
      const data = await callXai("/responses", {
        model: MODEL,
        input: [
          {
            role: "user",
            content: `${query}\n\n검색 결과를 한국어로 요약하고, 근거가 된 출처 링크를 함께 알려주세요.`,
          },
        ],
        tools,
      });
      const text = extractResponsesText(data);
      return textResult(text || "그록이 검색 결과를 돌려주지 않았습니다.");
    } catch (e) {
      return textResult(String(e.message || e), true);
    }
  }
);

await server.connect(new StdioServerTransport());
console.error(`grok-connector 실행 중 (모델: ${MODEL})`);
