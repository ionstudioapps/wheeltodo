import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const EnvSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof EnvSchema>;

export function getSupabaseEnv(): SupabaseEnv {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  return EnvSchema.parse({ url, anonKey });
}

/**
 * Browser-only singleton. Safe to call from client components and Expo.
 * Do NOT call this from Next.js Server Components, Route Handlers, or
 * middleware — use createSupabaseServerClient() there instead so each
 * request gets its own isolated instance.
 */
let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "getSupabaseClient() was called in a server context. " +
        "Use createSupabaseServerClient() for server-side usage."
    );
  }
  if (browserClient) return browserClient;
  const env = getSupabaseEnv();
  browserClient = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

/**
 * Server-safe factory. Creates a fresh Supabase client per call —
 * safe to use in Next.js Server Components, Route Handlers, and
 * middleware where a shared singleton would leak session state across
 * requests.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const env = getSupabaseEnv();
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

