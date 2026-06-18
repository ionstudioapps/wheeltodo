import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, CORS, requireAuth } from "../_shared/anthropic.ts";

// ─── GET /calendar-connect/url ─────────────────────────────────────────────
// Returns the Google OAuth URL the frontend should redirect the user to.
//
// ─── GET /calendar-connect/callback?code=…&state=… ────────────────────────
// OAuth redirect target. Exchanges code for tokens, stores them, then
// redirects the browser back to APP_URL.
//
// ─── DELETE /calendar-connect ─────────────────────────────────────────────
// Disconnects Google Calendar (removes tokens).

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

const TOKEN_URL  = "https://oauth2.googleapis.com/token";
const AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth";

function clientId()     { return Deno.env.get("GOOGLE_CLIENT_ID")!; }
function clientSecret() { return Deno.env.get("GOOGLE_CLIENT_SECRET")!; }
function redirectUri()  {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/calendar-connect/callback`;
}
function appUrl()       { return Deno.env.get("APP_URL") ?? "http://localhost:3000"; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);

  // ── /url — generate OAuth URL ──────────────────────────────────────────────
  if (url.pathname.endsWith("/url")) {
    let userId: string;
    try { userId = await requireAuth(req); } catch {
      return cors({ error: "Unauthorized" }, 401);
    }

    // state = base64(userId) for CSRF check in callback
    const state = btoa(userId);
    const oauthUrl = new URL(AUTH_URL);
    oauthUrl.searchParams.set("client_id",     clientId());
    oauthUrl.searchParams.set("redirect_uri",  redirectUri());
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("scope",         SCOPES);
    oauthUrl.searchParams.set("access_type",   "offline");
    oauthUrl.searchParams.set("prompt",        "consent"); // always get refresh_token
    oauthUrl.searchParams.set("state",         state);

    return cors({ url: oauthUrl.toString() });
  }

  // ── /callback — exchange code, store tokens, redirect ─────────────────────
  if (url.pathname.endsWith("/callback")) {
    const code  = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error || !code || !state) {
      return Response.redirect(`${appUrl()}?calendar_error=${error ?? "missing_params"}`);
    }

    let userId: string;
    try { userId = atob(state); } catch {
      return Response.redirect(`${appUrl()}?calendar_error=invalid_state`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId(),
        client_secret: clientSecret(),
        redirect_uri:  redirectUri(),
        grant_type:    "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return Response.redirect(`${appUrl()}?calendar_error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json() as {
      access_token:  string;
      refresh_token?: string;
      expires_in:    number;
      token_type:    string;
    };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Store using service role (callback has no user JWT)
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertError } = await sb.from("calendar_connections").upsert({
      user_id:          userId,
      provider:         "google",
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      calendar_id:      "primary",
      updated_at:       new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    if (upsertError) {
      return Response.redirect(`${appUrl()}?calendar_error=db_error`);
    }

    return Response.redirect(`${appUrl()}?calendar_connected=true`);
  }

  // ── DELETE — disconnect ────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    let userId: string;
    try { userId = await requireAuth(req); } catch {
      return cors({ error: "Unauthorized" }, 401);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await sb.from("calendar_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", "google");

    return cors({ disconnected: true });
  }

  // ── GET (root) — check connection status ───────────────────────────────────
  if (req.method === "GET") {
    let userId: string;
    try { userId = await requireAuth(req); } catch {
      return cors({ error: "Unauthorized" }, 401);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await sb
      .from("calendar_connections")
      .select("provider, calendar_id, last_synced_at, created_at")
      .eq("user_id", userId)
      .eq("provider", "google")
      .maybeSingle();

    return cors({ connected: !!data, connection: data ?? null });
  }

  return cors({ error: "Not found" }, 404);
});
