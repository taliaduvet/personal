/**
 * Session timer feature.
 * Manages start/stop, timer display, session history in modal.
 */
import { escapeHtml } from '../utils/dom.js';
import { renderSessionHistoryItemHtml } from '../domain/task-activity.js';

export function createSessionController(deps) {
  const { state, saveState, showToast, getRenderColumns, getRenderTodayList } = deps;
  let timerInterval = null;
  let activeTaskId = null;
  let historyOnlyMode = false;

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

  function setSessionModalMode(historyOnly) {
    historyOnlyMode = historyOnly;
    const modal = document.getElementById('session-modal');
    const nowSection = document.querySelector('.session-now-section');
    const timerEl = document.getElementById('session-timer');
    const stopBtn = document.getElementById('session-stop-btn');
    const startBtn = document.getElementById('session-start-timer-btn');
    const cancelBtn = document.getElementById('session-cancel-btn');

    if (modal) modal.dataset.mode = historyOnly ? 'history' : 'timer';
    if (nowSection) nowSection.style.display = historyOnly ? 'none' : '';
    if (timerEl) timerEl.style.display = historyOnly ? 'none' : '';
    if (stopBtn) stopBtn.style.display = historyOnly ? 'none' : '';
    if (startBtn) startBtn.style.display = historyOnly ? '' : 'none';
    if (cancelBtn) cancelBtn.textContent = historyOnly ? 'Close' : 'Cancel';
  }

  function renderSessionHistory(item, opts = {}) {
    const showWhenEmpty = !!opts.showWhenEmpty;
    const sessions = (item.sessions || []).slice().reverse();
    const section = document.getElementById('session-history-section');
    const list = document.getElementById('session-history-list');
    if (!section || !list) return;

    const divider = section.querySelector('.session-history-divider');
    if (divider) divider.textContent = 'History on this task';

    if (!sessions.length) {
      if (showWhenEmpty) {
        section.style.display = 'block';
        list.innerHTML =
          '<p class="settings-hint session-history-empty">No history yet — use ▶ to time work or ⚡ to queue research.</p>';
      } else {
        section.style.display = 'none';
        list.innerHTML = '';
      }
      return;
    }
    section.style.display = 'block';
    list.innerHTML = sessions.map((s) => renderSessionHistoryItemHtml(s)).join('');
  }

  function beginTimerForTask(taskId) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return;

    if (autoPauseOtherSession(taskId)) {
      saveState();
      getRenderColumns()?.();
      getRenderTodayList()?.();
    }

    if (!item.activeSessionStart) {
      item.activeSessionStart = new Date().toISOString();
      saveState();
      getRenderColumns()?.();
    }

    historyOnlyMode = false;
    setSessionModalMode(false);
    activeTaskId = taskId;

    const notesInput = document.getElementById('session-notes-input');
    if (notesInput) notesInput.value = '';

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
    if (notesInput) notesInput.focus();
  }

  /**
   * @param {string} taskId
   * @param {{ historyOnly?: boolean }} [opts]
   */
  function openSessionModal(taskId, opts = {}) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return;

    const historyOnly = !!opts.historyOnly && !item.activeSessionStart;
    activeTaskId = taskId;

    const taskNameEl = document.getElementById('session-task-name');
    if (taskNameEl) taskNameEl.textContent = item.text;

    if (historyOnly) {
      setSessionModalMode(true);
      renderSessionHistory(item, { showWhenEmpty: true });
      const modal = document.getElementById('session-modal');
      if (modal) modal.style.display = 'flex';
      return;
    }

    setSessionModalMode(false);
    beginTimerForTask(taskId);
    renderSessionHistory(item);
    const modal = document.getElementById('session-modal');
    if (modal) modal.style.display = 'flex';
  }

  /** View history without starting a timer (▶ still starts timer if one is already running). */
  function openTaskHistory(taskId) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return;
    if (item.activeSessionStart) {
      openSessionModal(taskId);
      return;
    }
    openSessionModal(taskId, { historyOnly: true });
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
    historyOnlyMode = false;
    const modal = document.getElementById('session-modal');
    if (modal) {
      modal.style.display = 'none';
      delete modal.dataset.mode;
    }
  }

  function bindEvents() {
    const stopBtn = document.getElementById('session-stop-btn');
    const cancelBtn = document.getElementById('session-cancel-btn');
    const startTimerBtn = document.getElementById('session-start-timer-btn');
    if (stopBtn) stopBtn.addEventListener('click', stopSession);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelSession);
    if (startTimerBtn) {
      startTimerBtn.addEventListener('click', () => {
        if (!activeTaskId) return;
        beginTimerForTask(activeTaskId);
        const item = state.items.find(i => i.id === activeTaskId);
        if (item) renderSessionHistory(item);
      });
    }

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

  return {
    openSessionModal,
    openTaskHistory,
    stopSession,
    cancelSession,
    closeSessionModal,
    bindEvents
  };
}
