import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, CORS, requireAuth } from "../_shared/anthropic.ts";
import { loadConnection, getValidAccessToken, gcalRequest, buildGcalEvent } from "../_shared/google-calendar.ts";

// POST /calendar-push
// Body: { taskId, taskName, taskMinutes, scheduledAt?, calendarEventId? }
//
// If calendarEventId is provided → PATCH (update) the existing event.
// Otherwise → POST (create) a new event and return its id.
//
// DELETE /calendar-push
// Body: { calendarEventId }  — deletes the event from Google Calendar.

interface PushBody {
  taskId:          string;
  taskName:        string;
  taskMinutes:     number;
  scheduledAt?:    string; // ISO datetime for timed events; omit for all-day
  calendarEventId?: string;
}

interface DeleteBody {
  calendarEventId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let userId: string;
  try { userId = await requireAuth(req); } catch {
    return cors({ error: "Unauthorized" }, 401);
  }

  // ── DELETE — remove event from calendar ───────────────────────────────────
  if (req.method === "DELETE") {
    let body: DeleteBody;
    try { body = await req.json(); } catch {
      return cors({ error: "Invalid JSON" }, 400);
    }
    if (!body.calendarEventId) return cors({ error: "calendarEventId required" }, 400);

    let conn, token: string;
    try {
      conn  = await loadConnection(userId);
      token = await getValidAccessToken(conn);
    } catch (err) {
      return cors({ error: (err as Error).message }, 400);
    }

    const res = await gcalRequest(
      token,
      `/calendars/${encodeURIComponent(conn.calendar_id)}/events/${body.calendarEventId}`,
      { method: "DELETE" },
    );

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      return cors({ error: `Google Calendar error: ${text}` }, 502);
    }

    return cors({ deleted: true });
  }

  // ── POST / PATCH — create or update event ─────────────────────────────────
  if (req.method !== "POST") return cors({ error: "Method not allowed" }, 405);

  let body: PushBody;
  try { body = await req.json(); } catch {
    return cors({ error: "Invalid JSON" }, 400);
  }
  if (!body.taskId || !body.taskName) return cors({ error: "taskId and taskName required" }, 400);

  let conn, token: string;
  try {
    conn  = await loadConnection(userId);
    token = await getValidAccessToken(conn);
  } catch (err) {
    return cors({ error: (err as Error).message }, 400);
  }

  const event = buildGcalEvent({
    id:          body.taskId,
    name:        body.taskName,
    minutes:     body.taskMinutes ?? 30,
    scheduledAt: body.scheduledAt,
  });

  const calendarId = encodeURIComponent(conn.calendar_id);
  let gcalRes: Response;

  if (body.calendarEventId) {
    // Update existing event
    gcalRes = await gcalRequest(
      token,
      `/calendars/${calendarId}/events/${body.calendarEventId}`,
      { method: "PATCH", body: JSON.stringify(event) },
    );
  } else {
    // Create new event
    gcalRes = await gcalRequest(
      token,
      `/calendars/${calendarId}/events`,
      { method: "POST", body: JSON.stringify(event) },
    );
  }

  if (!gcalRes.ok) {
    const text = await gcalRes.text();
    return cors({ error: `Google Calendar error: ${text}` }, 502);
  }

  const created = await gcalRes.json() as { id: string; htmlLink: string };

  // Write the event id back onto the task so future updates use PATCH
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await sb.from("tasks")
    .update({ calendar_event_id: created.id })
    .eq("id", body.taskId)
    .eq("user_id", userId);

  return cors({ eventId: created.id, htmlLink: created.htmlLink });
});
