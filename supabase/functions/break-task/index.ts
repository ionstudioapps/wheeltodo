import { callAnthropic, cors, CORS, requireAuth } from "../_shared/anthropic.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  taskName: string;
  taskMinutes: number;
  history?: Turn[];   // previous turns in the conversation
}

type ResponsePayload =
  | { type: "question"; question: string }
  | { type: "subtasks"; subtasks: { name: string; minutes: number }[] };

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM = `You are a productivity coach helping users break a task into concrete subtasks.

Your job:
1. If you don't have enough context to create a good plan, ask ONE clarifying question.
2. Once you have enough context (or on the first try if the task is clear), return the subtask breakdown.

ALWAYS respond with valid JSON in one of these two shapes — no other text:

If you need more context:
{"type":"question","question":"What specifically do you need to prepare for the meeting?"}

If you're ready to plan:
{"type":"subtasks","subtasks":[{"name":"Draft agenda","minutes":10},{"name":"Gather metrics","minutes":15}]}

Rules for subtasks:
- 3 to 6 subtasks
- Each name starts with an action verb
- Minutes are realistic; total should be close to the original estimate
- Be specific, not generic`;

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    await requireAuth(req);
  } catch {
    return cors({ error: "Unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return cors({ error: "Invalid JSON" }, 400);
  }

  const { taskName, taskMinutes, history = [] } = body;
  if (!taskName?.trim()) return cors({ error: "taskName required" }, 400);

  const firstUserMessage = `Task: "${taskName}" (estimated ${taskMinutes ?? "?"} minutes)\n\nHelp me break this down.`;

  const messages: Turn[] =
    history.length > 0
      ? history
      : [{ role: "user", content: firstUserMessage }];

  let text: string;
  try {
    text = await callAnthropic({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM,
      messages,
    });
  } catch (err) {
    return cors({ error: (err as Error).message }, 502);
  }

  try {
    const parsed = JSON.parse(text) as ResponsePayload;
    if (parsed.type !== "question" && parsed.type !== "subtasks") {
      throw new Error("Unexpected response type");
    }
    return cors(parsed);
  } catch {
    return cors({ error: "Unexpected response format", raw: text }, 500);
  }
});
