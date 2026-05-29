/**
 * Session timer feature.
 * Manages start/stop, timer display, session history in modal.
 */
import { escapeHtml } from '../utils/dom.js';

export function createSessionController(deps) {
  const { state, saveState, showToast, getRenderColumns, getRenderTodayList } = deps;
  let timerInterval = null;
  let activeTaskId = null;

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatSessionDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getElapsedSeconds(startIso) {
    return Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  }

  /** @returns {boolean} whether another task was auto-paused */
  function autoPauseOtherSession(incomingTaskId) {
    const other = state.items.find(i => i.id !== incomingTaskId && i.activeSessionStart);
    if (!other) return false;
    const start = other.activeSessionStart;
    const end = new Date().toISOString();
    const durationSeconds = getElapsedSeconds(start);
    if (!other.sessions) other.sessions = [];
    other.sessions.push({
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      start,
      end,
      durationSeconds,
      notes: 'auto-paused',
      paused: true,
      aiPickup: null
    });
    other.activeSessionStart = null;
    other.totalTimeSeconds = (other.totalTimeSeconds || 0) + durationSeconds;
    return true;
  }

  function openSessionModal(taskId) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return;

    if (autoPauseOtherSession(taskId)) {
      saveState();
      getRenderColumns()?.();
      getRenderTodayList()?.();
    }

    activeTaskId = taskId;

    if (!item.activeSessionStart) {
      item.activeSessionStart = new Date().toISOString();
      saveState();
      getRenderColumns()?.();
    }

    const taskNameEl = document.getElementById('session-task-name');
    const notesInput = document.getElementById('session-notes-input');
    if (taskNameEl) taskNameEl.textContent = item.text;
    if (notesInput) notesInput.value = '';

    renderSessionHistory(item);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const current = state.items.find(i => i.id === activeTaskId);
      if (!current || !current.activeSessionStart) {
        clearInterval(timerInterval);
        return;
      }
      const el = document.getElementById('session-timer');
      if (el) el.textContent = formatDuration(getElapsedSeconds(current.activeSessionStart));
    }, 1000);

    const timerEl = document.getElementById('session-timer');
    if (timerEl && item.activeSessionStart) {
      timerEl.textContent = formatDuration(getElapsedSeconds(item.activeSessionStart));
    }

    const modal = document.getElementById('session-modal');
    if (modal) modal.style.display = 'flex';
    if (notesInput) notesInput.focus();
  }

  function renderSessionHistory(item) {
    const sessions = (item.sessions || []).slice().reverse();
    const section = document.getElementById('session-history-section');
    const list = document.getElementById('session-history-list');
    if (!section || !list) return;

    if (!sessions.length) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    list.innerHTML = sessions.map(s => `
      <div class="session-history-item${s.paused ? ' session-history-paused' : ''}">
        <div class="session-history-meta">
          <span class="session-history-date">${formatSessionDate(s.start)}</span>
          <span class="session-history-duration">${formatDuration(s.durationSeconds)}</span>
        </div>
        ${s.notes ? `<div class="session-history-notes">${escapeHtml(s.notes)}</div>` : ''}
        ${s.aiPickup ? `<div class="session-ai-pickup">✦ ${escapeHtml(s.aiPickup)}</div>` : ''}
      </div>
    `).join('');
  }

  function stopSession() {
    clearInterval(timerInterval);
    const item = state.items.find(i => i.id === activeTaskId);
    if (!item || !item.activeSessionStart) {
      closeSessionModal();
      return;
    }
    const start = item.activeSessionStart;
    const end = new Date().toISOString();
    const durationSeconds = getElapsedSeconds(start);
    const notes = (document.getElementById('session-notes-input')?.value || '').trim();

    const session = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      start,
      end,
      durationSeconds,
      notes: notes || null,
      paused: false,
      aiPickup: null
    };

    if (!item.sessions) item.sessions = [];
    item.sessions.push(session);
    item.activeSessionStart = null;
    item.totalTimeSeconds = (item.totalTimeSeconds || 0) + durationSeconds;

    saveState();
    closeSessionModal();
    getRenderColumns()?.();
    getRenderTodayList()?.();
    showToast('Session saved — ' + formatDuration(durationSeconds));
  }

  function cancelSession() {
    clearInterval(timerInterval);
    closeSessionModal();
  }

  function closeSessionModal() {
    clearInterval(timerInterval);
    activeTaskId = null;
    const modal = document.getElementById('session-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindEvents() {
    const stopBtn = document.getElementById('session-stop-btn');
    const cancelBtn = document.getElementById('session-cancel-btn');
    if (stopBtn) stopBtn.addEventListener('click', stopSession);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelSession);

    const modal = document.getElementById('session-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) cancelSession();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('session-modal')?.style.display === 'flex') {
        cancelSession();
      }
    });
  }

  return { openSessionModal, stopSession, cancelSession, closeSessionModal, bindEvents };
}
