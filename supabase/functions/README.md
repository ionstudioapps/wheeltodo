# Edge Functions

All functions are Deno-based Supabase Edge Functions. Each requires a `Authorization: Bearer <user-jwt>` header unless noted.

**Base URL:** `https://zcandnsadkibuenvypdu.supabase.co/functions/v1`

---

## `break-task`

Conversational AI subtask generator. Multi-turn: Claude may ask one clarifying question before returning the plan. If `context` (from voice input) is provided, Claude skips straight to subtasks.

**POST** `/break-task`

```json
// Request
{
  "taskName": "Prepare Q2 presentation",
  "taskMinutes": 60,
  "context": "For the product team on Friday. Needs metrics and a live demo.",  // optional
  "history": []  // omit on first call; pass back on subsequent turns
}

// Response — first call with vague task (no context)
{ "type": "question", "question": "Is this for an internal or external audience?" }

// Response — ready to plan
{
  "type": "subtasks",
  "subtasks": [
    { "name": "Outline slide structure", "minutes": 10 },
    { "name": "Pull last month's metrics", "minutes": 15 },
    { "name": "Build demo flow", "minutes": 20 },
    { "name": "Rehearse and time the run", "minutes": 15 }
  ]
}
```

**Multi-turn flow:** when the response is `{type:"question"}`, append the question as an `assistant` turn and the user's answer as a `user` turn, then re-call with the full `history` array.

---

## `voice-tasks`

Transcribes a voice note into a structured task list. Captures `context` per task — the background the user mentioned — which is stored on the task and later threaded into `break-task` to skip the clarifying question step.

**POST** `/voice-tasks`

```json
// Request
{ "transcript": "I need to prepare a board deck for Thursday. It needs last quarter's metrics and the new roadmap. Also email Jake about the design review." }

// Response
{
  "tasks": [
    {
      "name": "Prepare board deck",
      "minutes": 90,
      "category": "Work",
      "context": "For Thursday. Needs last quarter's metrics and the new roadmap."
    },
    {
      "name": "Email Jake about design review",
      "minutes": 10,
      "category": "Work"
    }
  ]
}
```

---

## `suggest-category`

Suggests a task category as the user types. Two-tier: uses a keyword lookup first (free), falls back to Claude Haiku only when needed.

**POST** `/suggest-category`

```json
// Request
{ "taskName": "Go for a morning run" }

// Response
{ "category": "Health" }
```

---

## `calendar-connect`

Handles the full Google Calendar OAuth flow. Deployed with `--no-verify-jwt` because the `/callback` path receives the redirect from Google (no user JWT).

### `GET /calendar-connect`
Returns connection status.
```json
{ "connected": true, "connection": { "provider": "google", "calendar_id": "primary", "last_synced_at": "..." } }
```

### `GET /calendar-connect/url` _(requires auth)_
Returns the Google OAuth URL the frontend should redirect to.
```json
{ "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

### `GET /calendar-connect/callback?code=…&state=…` _(no auth — OAuth redirect)_
Exchanges code for tokens, stores in `calendar_connections`, redirects browser to `APP_URL?calendar_connected=true`.

### `DELETE /calendar-connect` _(requires auth)_
Removes tokens and disconnects.
```json
{ "disconnected": true }
```

---

## `calendar-push`

Pushes a task to Google Calendar. Creates a new event or updates an existing one. Writes the `calendar_event_id` back to the task row.

**POST** `/calendar-push`
```json
// Request
{
  "taskId": "task-123",
  "taskName": "Prepare board deck",
  "taskMinutes": 90,
  "scheduledAt": "2026-05-30T14:00:00Z",  // optional — omit for all-day event
  "calendarEventId": "abc123"             // optional — omit to create, provide to update
}

// Response
{ "eventId": "google_event_id", "htmlLink": "https://calendar.google.com/event?eid=..." }
```

**DELETE** `/calendar-push`
```json
// Request
{ "calendarEventId": "google_event_id" }

// Response
{ "deleted": true }
```

---

## `calendar-pull`

Fetches Google Calendar events changed since the last sync (or the past 7 days on first pull). Returns events for the frontend to reconcile against the task list. Updates `last_synced_at` on success.

**GET** `/calendar-pull`

```json
// Response
{
  "syncedAt": "2026-05-26T15:00:00Z",
  "events": [
    {
      "eventId": "google_event_id",
      "title": "Prepare board deck",
      "start": "2026-05-30T14:00:00Z",
      "end": "2026-05-30T15:30:00Z",
      "allDay": false,
      "durationMin": 90,
      "wheeltodoId": "task-123",  // set if this event was originally pushed from WheelTodo
      "status": "confirmed"       // "cancelled" = deleted in Google Calendar
    }
  ]
}
```

---

## Shared helpers

| File | Exports |
|------|---------|
| `_shared/anthropic.ts` | `callAnthropic`, `requireAuth`, `cors`, `CORS` |
| `_shared/google-calendar.ts` | `loadConnection`, `getValidAccessToken`, `gcalRequest` (re-exports `buildGcalEvent`) |
| `_shared/gcal-events.ts` | `buildGcalEvent` — pure, no Deno deps, Vitest-testable |

---

## Testing

Unit tests live alongside each function in `logic.test.ts` files and run with Vitest (not Deno). The handler is dependency-injected so `requireAuth` and `callAnthropic` can be mocked without network calls.

```bash
# From monorepo root
npm test
```

For live end-to-end testing against the deployed function:

```bash
cd supabase/functions/break-task
./test.sh sua@bagelcode.com YOUR_PASSWORD
```
