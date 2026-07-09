export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once the live Supabase project keys are in .env.local. */
export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Local pre-deploy: skip login redirect. Set SKIP_AUTH=true in .env.local — remove before production. */
export const skipAuth = process.env.SKIP_AUTH === "true";
