import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/** Service-role client for trusted server routes (bypasses RLS). */
export function createServiceRoleClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function captureEnvConfigured(): boolean {
  return Boolean(
    process.env.CAPTURE_TOKEN?.trim() &&
      process.env.CAPTURE_USER_ID?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      SUPABASE_URL
  );
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
