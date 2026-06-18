// Pure, Deno-free logic for the voice-tasks function.
// Deno.serve wiring lives in index.ts; this file is Vitest-testable.

export interface VoiceTask {
  name: string;
  minutes: number;
  category?: string;
  context?: string;
}

export interface VoiceResponse {
  tasks: VoiceTask[];
}

export interface Deps {
  requireAuth: (req: Request) => Promise<string>;
  callAnthropic: (payload: {
    model: string;
    max_tokens: number;
    system: string;
    messages: { role: "user" | "assistant"; content: string }[];
  }) => Promise<string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SYSTEM = `Extract tasks from a voice note. Return ONLY valid JSON — no other text:
{"tasks":[{"name":"Prepare Q2 presentation","minutes":60,"category":"Work","context":"For the product team on Friday. Must include last month's metrics, roadmap, and a live demo."}]}

Rules:
- Extract every distinct task the user mentioned
- Start each task name with an action verb (Write, Review, Prepare, Email, etc.)
- Estimate realistic durations based on the task type
- category: only set if clearly implied — Work | Personal | Learning | Health. Omit otherwise.
- context: capture any requirements, constraints, stakeholders, deadlines, or specific details
  the user mentioned that would help someone plan HOW to execute the task.
  Keep it to 1–2 sentences. Omit entirely if the task name already says everything.
- Do not invent tasks or details that were not mentioned`;

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

export function parseVoiceResponse(text: string): VoiceResponse {
  const parsed = JSON.parse(text) as VoiceResponse;
  if (!Array.isArray(parsed.tasks)) throw new Error("missing tasks array");
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

  let body: { transcript?: string };
  try { body = await req.json(); } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { transcript } = body;
  if (!transcript?.trim()) return jsonResponse({ error: "transcript is required" }, 400);

  let text: string;
  try {
    text = await deps.callAnthropic({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: `Voice note: "${transcript}"\n\nExtract the tasks.` }],
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 502);
  }

  try {
    return jsonResponse(parseVoiceResponse(text));
  } catch {
    return jsonResponse({ error: "Unexpected response format", raw: text }, 500);
  }
}
