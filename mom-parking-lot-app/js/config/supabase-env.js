/**
 * Supabase client URL configured from classic config.js (globalThis) or legacy global.
 * Does not import state.
 */
/** Old solo Parking Lot project (paused) — must use Talia Duvet Hub instead. */
const DEPRECATED_SUPABASE_REFS = ['csvumbaxopiolwvyevum'];

export function hasSupabaseConfig() {
  let u = globalThis.SUPABASE_URL;
  if (typeof u !== 'string' || !u.length) {
    u = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
  }
  if (typeof u !== 'string' || !u.length || u === 'https://your-project-id.supabase.co') return false;
  if (DEPRECATED_SUPABASE_REFS.some((ref) => u.includes(ref))) return false;
  return true;
}
