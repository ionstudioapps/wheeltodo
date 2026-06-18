import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export { buildGcalEvent, type GcalEvent } from "./gcal-events.ts";

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarConnection {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string;
  last_synced_at: string | null;
}

// ─── Token management ─────────────────────────────────────────────────────────

export async function getValidAccessToken(conn: CalendarConnection): Promise<string> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  const nowMs     = Date.now();
  const bufferMs  = 5 * 60 * 1000; // refresh 5 min before expiry

  if (expiresAt - nowMs > bufferMs) return conn.access_token;
  if (!conn.refresh_token) throw new Error("No refresh token — user must reconnect Google Calendar");

  const clientId     = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: conn.refresh_token,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed: ${body}`);
  }

  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  // Persist the new token so we don't re-refresh on every request
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const expiresAtNew = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await sb.from("calendar_connections").update({
    access_token:     data.access_token,
    token_expires_at: expiresAtNew,
    updated_at:       new Date().toISOString(),
  }).eq("user_id", conn.user_id).eq("provider", conn.provider);

  return data.access_token;
}

// ─── API helper ───────────────────────────────────────────────────────────────

export async function gcalRequest(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${GCAL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// ─── Load connection ──────────────────────────────────────────────────────────

export async function loadConnection(userId: string): Promise<CalendarConnection> {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data)  throw new Error("Google Calendar not connected");
  return data as CalendarConnection;
}

