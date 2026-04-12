/**
 * Shared API error helpers for api.js and the Ledger UI.
 */

export function apiErrorMessage(err) {
  if (err === null || err === undefined) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.error_description || String(err);
}

/**
 * Wraps a Supabase result and logs errors consistently.
 * @param {string} context
 * @param {{ data: unknown, error: unknown }} result
 * @returns {{ data: unknown, error: unknown }}
 */
export function handleSupaResult(context, result) {
  if (result.error) {
    console.error(`[api] ${context}:`, result.error.message || result.error);
  }
  return result;
}
