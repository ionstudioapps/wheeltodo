import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function cors(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

export async function requireAuth(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth token");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (error || !user) throw new Error("Invalid auth token");
  return user.id;
}

interface AnthropicMessage {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function callAnthropic(payload: AnthropicMessage): Promise<string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body}`);
  }
  const data = await res.json();
  return (data.content[0] as { text: string }).text;
}
