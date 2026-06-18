// Pure, Deno-free logic for the break-task function.
// Deno.serve wiring lives in index.ts; this file is Vitest-testable.

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface RequestBody {
  taskName: string;
  taskMinutes: number;
  context?: string;  // background captured from voice input
  history?: Turn[];
}

export type ResponsePayload =
  | { type: "question"; question: string }
  | { type: "subtasks"; subtasks: { name: string; minutes: number }[] };

export interface Deps {
  requireAuth: (req: Request) => Promise<string>;
  callAnthropic: (payload: {
    model: string;
    max_tokens: number;
    system: string;
    messages: Turn[];
  }) => Promise<string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SYSTEM = `You are a productivity coach helping users break a task into concrete subtasks.

Your job:
1. If a "Context:" section is present in the message, you already have what you need — return subtasks directly.
2. If the task is self-explanatory (e.g. "Write a thank-you email"), return subtasks directly.
3. Only ask a clarifying question if the task is genuinely ambiguous AND no context was provided.
   Ask at most ONE question.

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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

export function buildMessages(
  taskName: string,
  taskMinutes: number | undefined,
  history: Turn[],
  context?: string,
): Turn[] {
  if (history.length > 0) return history;
  const contextLine = context?.trim() ? `\nContext: ${context.trim()}` : "";
  return [{
    role: "user",
    content: `Task: "${taskName}" (estimated ${taskMinutes ?? "?"} minutes)${contextLine}\n\nHelp me break this down.`,
  }];
}

export function parseResponse(text: string): ResponsePayload {
  const parsed = JSON.parse(text) as ResponsePayload;
  if (parsed.type !== "question" && parsed.type !== "subtasks") {
    throw new Error(`Unexpected response type: ${(parsed as { type: string }).type}`);
  }
  return parsed;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    await deps.requireAuth(req);
  } catch {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { taskName, taskMinutes, context, history = [] } = body;
  if (!taskName?.trim()) return jsonResponse({ error: "taskName required" }, 400);

  const messages = buildMessages(taskName, taskMinutes, history, context);

  let text: string;
  try {
    text = await deps.callAnthropic({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM,
      messages,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 502);
  }

  try {
    return jsonResponse(parseResponse(text));
  } catch {
    return jsonResponse({ error: "Unexpected response format", raw: text }, 500);
  }
}
