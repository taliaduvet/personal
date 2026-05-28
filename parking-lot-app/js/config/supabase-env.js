/**
 * Supabase client URL configured from classic config.js (globalThis) or legacy global.
 * Does not import state.
 */
export function hasSupabaseConfig() {
  let u = globalThis.SUPABASE_URL;
  if (typeof u !== 'string' || !u.length) {
    u = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
  }
  return typeof u === 'string' && u.length > 0 && u !== 'https://your-project-id.supabase.co';
}
