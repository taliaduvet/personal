/**
 * Daily journal storage: legacy string per day, or v2 { v: 2, entries: [{ id, html, updatedAt }] }.
 */

export const JOURNAL_DAY_VERSION = 2;

function newEntryId() {
  return 'je_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/** Escape plain text for safe insertion as HTML (paragraphs). */
export function legacyPlainTextToJournalHtml(text) {
  const t = ( text || '').trim();
  if (!t) return '';
  return t
    .split(/\n{2,}/)
    .map((p) => '<p>' + escapeHtmlChars(p).replace(/\n/g, '<br>') + '</p>')
    .join('');
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
