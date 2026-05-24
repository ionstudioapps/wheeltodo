import { callAnthropic, cors, CORS, requireAuth } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    await requireAuth(req);
  } catch {
    return cors({ error: "Unauthorized" }, 401);
  }

  const { transcript } = await req.json();
  if (!transcript?.trim()) return cors({ error: "transcript is required" }, 400);

  const text = await callAnthropic({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `Extract tasks from a voice note. Return ONLY valid JSON — no other text:
{"tasks":[{"name":"task name","minutes":25,"category":"Work"}]}
Rules:
- Extract every distinct task the user mentioned
- Start each task name with an action verb (e.g. "Write", "Review", "Prepare")
- Estimate realistic durations based on the task type
- Assign category only if clearly implied (Work, Personal, Learning, Health) — otherwise omit the field
- Do not invent tasks that weren't mentioned`,
    messages: [
      { role: "user", content: `Voice note: "${transcript}"\n\nExtract the tasks.` },
    ],
  });

  try {
    return cors(JSON.parse(text));
  } catch {
    return cors({ error: "Unexpected response format" }, 500);
  }
});
