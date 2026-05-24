import { callAnthropic, cors, CORS, requireAuth } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    await requireAuth(req);
  } catch {
    return cors({ error: "Unauthorized" }, 401);
  }

  const { taskName, categories, examples } = await req.json();
  if (!taskName?.trim() || !categories?.length) return cors({ category: null });

  const examplesBlock = examples?.length
    ? `\nPast assignments to learn from:\n${
        examples.slice(-20).map((e: { task: string; category: string }) =>
          `"${e.task}" → ${e.category}`
        ).join("\n")
      }`
    : "";

  const text = await callAnthropic({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 32,
    system: `Classify a task into exactly one of these categories: ${categories.join(", ")}.
Reply with ONLY the category name. If nothing fits, reply with "none".${examplesBlock}`,
    messages: [{ role: "user", content: `Task: "${taskName.trim()}"` }],
  });

  const matched = categories.find(
    (c: string) => c.toLowerCase() === text.trim().toLowerCase(),
  );
  return cors({ category: matched ?? null });
});
