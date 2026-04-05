/**
 * Daily journal storage: legacy string per day, or v2 { v: 2, entries: [{ id, html, updatedAt }] }.
 */

export const JOURNAL_DAY_VERSION = 2;

/** Default HTML for a new daily entry: title line (H1) + body paragraph. */
export const JOURNAL_EMPTY_ENTRY_HTML =
  '<h1 class="journal-entry-h1"><br></h1><p><br></p>';

/**
 * Use structured empty scaffold, or upgrade legacy blank single &lt;p&gt; to it.
 * Substantive legacy content is unchanged.
 */
export function coerceJournalEntryDisplayHtml(html) {
  const raw = String(html || '');
  const h = raw.trim();
  if (!h) return JOURNAL_EMPTY_ENTRY_HTML;
  if (/^<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>$/i.test(h)) return JOURNAL_EMPTY_ENTRY_HTML;
  return raw;
}

function newEntryId() {
  return 'je_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/** Escape plain text for safe insertion as HTML (first block = H1, rest = paragraphs). */
export function legacyPlainTextToJournalHtml(text) {
  const t = (text || '').trim();
  if (!t) return '';
  const parts = t.split(/\n{2,}/);
  const first = escapeHtmlChars(parts[0]).replace(/\n/g, '<br>');
  const h1 = '<h1 class="journal-entry-h1">' + first + '</h1>';
  const rest = parts
    .slice(1)
    .map((p) => '<p>' + escapeHtmlChars(p).replace(/\n/g, '<br>') + '</p>')
    .join('');
  return h1 + (rest || '<p><br></p>');
}

function escapeHtmlChars(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip risky tags/attributes from pasted rich text (best-effort). */
export function sanitizeJournalHtml(html) {
  if (!html || typeof html !== 'string') return '';
  let out = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/\s(on\w+|javascript:)\s*=/gi, ' data-removed=');
  return out;
}

export function normalizeJournalDayValue(val) {
  if (val == null) return { v: JOURNAL_DAY_VERSION, entries: [] };
  if (typeof val === 'string') {
    const inner = legacyPlainTextToJournalHtml(val);
    return {
      v: JOURNAL_DAY_VERSION,
      entries: inner
        ? [{ id: newEntryId(), html: sanitizeJournalHtml(inner), updatedAt: Date.now() }]
        : []
    };
  }
  if (typeof val === 'object' && val.v === JOURNAL_DAY_VERSION && Array.isArray(val.entries)) {
    return {
      v: JOURNAL_DAY_VERSION,
      entries: val.entries
        .filter((e) => e && e.id && typeof e.html === 'string')
        .map((e) => ({
          id: String(e.id),
          html: sanitizeJournalHtml(e.html),
          updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now()
        }))
    };
  }
  return { v: JOURNAL_DAY_VERSION, entries: [] };
}

export function journalDayHasContent(day) {
  const d = normalizeJournalDayValue(day);
  return d.entries.some((e) => (e.html || '').replace(/<[^>]+>/g, '').trim().length > 0);
}

export function mergeJournalDayRemote(localRaw, remoteRaw) {
  const a = normalizeJournalDayValue(localRaw);
  const b = normalizeJournalDayValue(remoteRaw);
  const byId = new Map();
  [...a.entries, ...b.entries].forEach((e) => {
    const prev = byId.get(e.id);
    if (!prev || (e.updatedAt || 0) >= (prev.updatedAt || 0)) byId.set(e.id, e);
  });
  const merged = Array.from(byId.values()).sort((x, y) => (x.updatedAt || 0) - (y.updatedAt || 0));
  return { v: JOURNAL_DAY_VERSION, entries: merged };
}

export { newEntryId };
