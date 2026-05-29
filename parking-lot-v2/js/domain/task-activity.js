/**
 * Research entries stored on task.sessions (same timeline as ▶ timer notes).
 */
import { escapeHtml } from '../utils/dom.js';

/**
 * @param {string} prompt
 * @param {import('../types.js').AiResult} result
 * @returns {string}
 */
export function formatResearchNoteText(prompt, result) {
  const lines = ['⚡ Research completed'];
  const p = (prompt || '').trim();
  if (p) lines.push(`Request: ${p}`);
  const summary = (result?.summary || '').trim();
  if (summary) {
    lines.push('');
    lines.push(summary);
  }
  const links = Array.isArray(result?.links) ? result.links : [];
  if (links.length) {
    lines.push('');
    lines.push('Links:');
    links.forEach((l) => {
      const title = (l.title || l.url || 'Link').trim();
      const url = (l.url || '').trim();
      lines.push(url ? `• ${title} — ${url}` : `• ${title}`);
    });
  }
  return lines.join('\n');
}

/**
 * @param {string} prompt
 * @returns {string}
 */
export function formatResearchQueuedNoteText(prompt) {
  return `⏳ Research queued\nRequest: ${(prompt || '').trim()}`;
}

/**
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {import('../types.js').AiResult} [opts.result]
 * @param {boolean} opts.queued
 * @param {string} [opts.existingId]
 * @param {string} [opts.existingStart]
 * @returns {import('../types.js').TaskSession}
 */
export function createResearchSessionEntry(opts) {
  const now = new Date().toISOString();
  const { prompt, result, queued, existingId, existingStart } = opts;
  return {
    id: existingId || 'research_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    start: existingStart || now,
    end: now,
    durationSeconds: 0,
    notes: queued ? formatResearchQueuedNoteText(prompt) : formatResearchNoteText(prompt, result),
    paused: false,
    aiPickup: null,
    sessionType: queued ? 'research_queued' : 'research'
  };
}

/**
 * @param {import('../types.js').Task} item
 * @param {string} prompt
 */
export function appendResearchQueuedSession(item, prompt) {
  if (!item.sessions) item.sessions = [];
  item.sessions = item.sessions.filter((s) => s.sessionType !== 'research_queued');
  item.sessions.push(createResearchSessionEntry({ prompt, queued: true }));
}

/**
 * @param {import('../types.js').Task} item
 * @param {string} prompt
 * @param {import('../types.js').AiResult} result
 */
export function completeResearchSession(item, prompt, result) {
  if (!item.sessions) item.sessions = [];
  const idx = item.sessions.findIndex((s) => s.sessionType === 'research_queued');
  const entry = createResearchSessionEntry({
    prompt,
    result,
    queued: false,
    existingId: idx >= 0 ? item.sessions[idx].id : undefined,
    existingStart: idx >= 0 ? item.sessions[idx].start : undefined
  });
  if (idx >= 0) item.sessions[idx] = entry;
  else item.sessions.push(entry);
}

function formatSessionDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * One row in the session modal history list (work session or research).
 * @param {import('../types.js').TaskSession} s
 * @returns {string}
 */
/**
 * Read-only history block (edit modal + shared copy of session list).
 * @param {import('../types.js').Task} item
 * @returns {string}
 */
export function buildTaskSessionHistoryHtml(item) {
  const sessions = (item.sessions || []).slice().reverse();
  if (!sessions.length) {
    return '<p class="settings-hint task-history-empty">No history yet — use ▶ to time work or ⚡ to queue research.</p>';
  }
  return `<div class="task-history-list">${sessions.map((s) => renderSessionHistoryItemHtml(s)).join('')}</div>`;
}

export function renderSessionHistoryItemHtml(s) {
  if (s.sessionType === 'research' || s.sessionType === 'research_queued') {
    const queued = s.sessionType === 'research_queued';
    return `
      <div class="session-history-item session-history-research${queued ? ' session-history-research-queued' : ''}">
        <div class="session-history-meta">
          <span class="session-history-date">${escapeHtml(formatSessionDate(s.end || s.start))}</span>
          <span class="session-history-duration">${queued ? 'Queued' : 'Research'}</span>
        </div>
        ${s.notes ? `<div class="session-history-notes">${escapeHtml(s.notes)}</div>` : ''}
      </div>`;
  }
  return `
    <div class="session-history-item${s.paused ? ' session-history-paused' : ''}">
      <div class="session-history-meta">
        <span class="session-history-date">${escapeHtml(formatSessionDate(s.start))}</span>
        <span class="session-history-duration">${escapeHtml(formatDuration(s.durationSeconds))}</span>
      </div>
      ${s.notes ? `<div class="session-history-notes">${escapeHtml(s.notes)}</div>` : ''}
      ${s.aiPickup ? `<div class="session-ai-pickup">✦ ${escapeHtml(s.aiPickup)}</div>` : ''}
    </div>`;
}
