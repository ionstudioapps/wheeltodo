import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, CORS, requireAuth } from "../_shared/anthropic.ts";
import { loadConnection, getValidAccessToken, gcalRequest } from "../_shared/google-calendar.ts";

// GET /calendar-pull
// Fetches Google Calendar events changed since last_synced_at (or the last
// 7 days if this is the first pull).  Returns them as a list of PulledEvent
// objects — the frontend decides whether to create/update tasks.
//
// After a successful pull the connection's last_synced_at is updated.

export interface PulledEvent {
  eventId:      string;
  title:        string;
  start:        string; // ISO datetime or date
  end:          string;
  allDay:       boolean;
  durationMin:  number | null; // null for all-day events
  wheeltodoId:  string | null; // set when this event was originally pushed from WheelTodo
  status:       "confirmed" | "cancelled"; // cancelled = deleted in GCal
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return cors({ error: "Method not allowed" }, 405);

  let userId: string;
  try { userId = await requireAuth(req); } catch {
    return cors({ error: "Unauthorized" }, 401);
  }

  let conn, token: string;
  try {
    conn  = await loadConnection(userId);
    token = await getValidAccessToken(conn);
  } catch (err) {
    return cors({ error: (err as Error).message }, 400);
  }

  // Sync window: since last pull, or last 7 days
  const since = conn.last_synced_at
    ? new Date(conn.last_synced_at).toISOString()
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const calendarId = encodeURIComponent(conn.calendar_id);
  const params = new URLSearchParams({
    updatedMin:    since,
    singleEvents:  "true",
    showDeleted:   "true",  // include cancelled events so we can remove tasks
    orderBy:       "updated",
    maxResults:    "250",
  });

  const gcalRes = await gcalRequest(token, `/calendars/${calendarId}/events?${params}`);

  if (!gcalRes.ok) {
    const text = await gcalRes.text();
    return cors({ error: `Google Calendar error: ${text}` }, 502);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await gcalRes.json() as { items: any[] };
  const items = data.items ?? [];

  const events: PulledEvent[] = items.map((item) => {
    const allDay  = !item.start?.dateTime;
    const startRaw = item.start?.dateTime ?? item.start?.date ?? "";
    const endRaw   = item.end?.dateTime   ?? item.end?.date   ?? "";

    let durationMin: number | null = null;
    if (!allDay && startRaw && endRaw) {
      durationMin = Math.round(
        (new Date(endRaw).getTime() - new Date(startRaw).getTime()) / 60_000,
      );
    }

    const wheeltodoId: string | null =
      item.extendedProperties?.private?.wheeltodo_task_id ?? null;

    return {
      eventId:     item.id,
      title:       item.summary ?? "(no title)",
      start:       startRaw,
      end:         endRaw,
      allDay,
      durationMin,
      wheeltodoId,
      status:      item.status === "cancelled" ? "cancelled" : "confirmed",
    } satisfies PulledEvent;
  });

  // Update last_synced_at
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await sb.from("calendar_connections").update({
    last_synced_at: new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }).eq("user_id", userId).eq("provider", "google");

  return cors({ events, syncedAt: new Date().toISOString() });
});
