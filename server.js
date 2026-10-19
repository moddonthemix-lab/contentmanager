import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { getTool, publicTools } from "./src/tools.js";
import { SYSTEM_PROMPT, buildContext } from "./src/prompts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.CONTENT_MODEL || "claude-opus-5-5";
const EFFORT = process.env.CONTENT_EFFORT || "high";
const MAX_CONTINUATIONS = 5;

const client = new Anthropic();
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(here, "public")));
app.use("/vendor/marked.esm.js", express.static(path.join(here, "node_modules/marked/lib/marked.esm.js")));
app.use("/vendor/purify.es.mjs", express.static(path.join(here, "node_modules/dompurify/dist/purify.es.mjs")));

app.get("/api/tools", (_req, res) => {
  res.json({ tools: publicTools(), model: MODEL });
});

// Runs a tool (or a follow-up on a previous result) and streams progress as
// server-sent events: status, source, text, done, error.
app.post("/api/generate", async (req, res) => {
  const { toolId, values = {}, profile, notes, timezone, today, turns = [] } = req.body || {};
  const tool = getTool(toolId);
  if (!tool) return res.status(400).json({ error: `Unknown tool: ${toolId}` });

  const missing = tool.fields.filter((f) => f.required && isEmpty(values[f.id])).map((f) => f.label);
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

  const context = buildContext({ profile, notes, today: today || new Date().toISOString().slice(0, 10), timezone });
  const messages = [{ role: "user", content: `${context}\n\n<task>\n${tool.build(values)}\n</task>` }];
  for (const t of turns) {
    if ((t.role === "user" || t.role === "assistant") && typeof t.text === "string" && t.text.trim()) {
      messages.push({ role: t.role, content: t.text });
    }
  }
  if (messages.at(-1).role !== "user") {
    return res.status(400).json({ error: "The last turn must be a user message." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  let current;
  let closed = false;
  res.on("close", () => {
    closed = true;
    current?.abort();
  });

  try {
    const seenUrls = new Set();
    let searches = 0;
    let finished = false;

    for (let attempt = 0; attempt <= MAX_CONTINUATIONS && !closed; attempt++) {
      current = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 64000,
        system: SYSTEM_PROMPT,
        thinking: { type: "adaptive" },
        output_config: { effort: EFFORT },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 10 },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 },
        ],
        messages,
      });

      const toolInputs = new Map(); // block index -> { name, json }
      for await (const event of current) {
        if (event.type === "content_block_start") {
          const block = event.content_block;
          if (block.type === "server_tool_use") {
            toolInputs.set(event.index, { name: block.name, json: "" });
          } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
            for (const r of block.content) {
              if (r.url && !seenUrls.has(r.url)) {
                seenUrls.add(r.url);
                send("source", { url: r.url, title: r.title || r.url, age: r.page_age || null });
              }
            }
          } else if (block.type === "thinking") {
            send("status", { kind: "thinking", text: "Thinking it through" });
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            send("text", { text: event.delta.text });
          } else if (event.delta.type === "input_json_delta" && toolInputs.has(event.index)) {
            toolInputs.get(event.index).json += event.delta.partial_json;
          }
        } else if (event.type === "content_block_stop" && toolInputs.has(event.index)) {
          const { name, json } = toolInputs.get(event.index);
          const input = safeParse(json);
          if (name === "web_search") {
            searches++;
            send("status", { kind: "search", text: input.query ? `Searching: ${input.query}` : "Searching the web" });
          } else if (name === "web_fetch") {
            send("status", { kind: "fetch", text: input.url ? `Reading: ${input.url}` : "Reading a page" });
          }
        }
      }

      const final = await current.finalMessage();
      if (final.stop_reason === "pause_turn") {
        // Server-side research loop hit its iteration cap; resend to resume.
        messages.push({ role: "assistant", content: final.content });
        continue;
      }
      if (final.stop_reason === "refusal") {
        finished = true;
        send("error", { message: "Claude declined this request. Try rephrasing the topic." });
      } else {
        finished = true;
        send("done", { stopReason: final.stop_reason, model: final.model, searches, sources: seenUrls.size, usage: final.usage });
      }
      break;
    }
    if (!finished && !closed) {
      send("error", { message: "Research ran too long without finishing. Try a narrower request." });
    }
  } catch (err) {
    if (!closed) {
      const message = err instanceof Anthropic.APIError ? `${err.status ?? ""} ${err.message}`.trim() : String(err?.message || err);
      console.error("generate failed:", message);
      send("error", { message });
    }
  } finally {
    res.end();
  }
});

function isEmpty(v) {
  return v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);
}

function safeParse(json) {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

app.listen(PORT, () => {
  console.log(`Content Studio running at http://localhost:${PORT} (model: ${MODEL})`);
});
