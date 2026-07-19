"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";
import { hasSupabaseEnv } from "./env";

let client: SupabaseClient | null = null;

/**
 * Shared browser Supabase client. Null when the project keys aren't
 * configured — callers treat that as "cloud sync off".
 */
export function getSupabase(): SupabaseClient | null {
  if (!hasSupabaseEnv) return null;
  if (typeof window === "undefined") return null;
  if (!client) client = createClient();
  return client;
}

/** Resolve the signed-in user id, or null when signed out / unconfigured. */
export async function getCloudUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
