/**
 * Focus Block Timer
 *
 * A countdown timer that lets you set a work block duration.
 * Fires a 10-minute warning (OS notification + tone) so you can surface
 * without watching the clock, then opens a summarize prompt at the end.
 *
 * Renders into every .focus-timer-widget element on the page so the same
 * timer is visible from both the Today header and Focus mode.
 */
import { STORAGE_PREFIX } from '../constants.js';
import { createNote } from '../domain/notes.js';
import { getTodayLocalYYYYMMDD } from '../domain/tasks.js';

const TIMER_KEY = STORAGE_PREFIX + 'focusTimer';
const WARNING_MS = 10 * 60 * 1000;

/**
 * @param {{ saveState: () => void, showToast: (msg: string) => void, getActiveSession?: () => { id: string, text: string } | null, stopSession?: (id: string, notes?: string|null) => void }} deps
 */
export function createFocusTimer({ saveState, showToast, getActiveSession, stopSession }) {
  let tickInterval = null;
  let inSummarize = false;

  // ── localStorage helpers ──────────────────────────────────────────────

  function loadTs() {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return null;
      const ts = JSON.parse(raw);
      if (!ts || typeof ts.endMs !== 'number') return null;
      return ts;
    } catch { return null; }
  }

  function saveTs(ts) {
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(ts)); } catch { /* */ }
  }

  function clearTs() {
    try { localStorage.removeItem(TIMER_KEY); } catch { /* */ }
  }

  // ── Audio ─────────────────────────────────────────────────────────────

  // Shared AudioContext, created/resumed during a user gesture (start click).
  // A context created outside a gesture starts 'suspended' and plays nothing,
  // which is why timer chimes were silent.
  let audioCtx = null;

  function unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { /* */ });
      return audioCtx;
    } catch { return null; }
  }

  function playTone(type) {
    try {
      const ctx = unlockAudio();
      if (!ctx) return;
      const beep = (freq, t, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur);
      };
      if (type === 'warning') {
        beep(523, ctx.currentTime, 0.3);
        beep(440, ctx.currentTime + 0.38, 0.45);
      } else {
        beep(659, ctx.currentTime, 0.2);
        beep(784, ctx.currentTime + 0.28, 0.2);
        beep(988, ctx.currentTime + 0.56, 0.55);
      }
    } catch { /* */ }
  }

  // ── Notifications ─────────────────────────────────────────────────────

  const NOTIF_OPTS = (body) => ({
    body,
    icon: '/icon-192.png',
    tag: 'focus-timer',
    renotify: true
  });

  async function fireNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Prefer SW notification — fires even when the tab is backgrounded/screen locked.
    // Race against a timeout: serviceWorker.ready never rejects, so without
    // this it can hang forever (e.g. registration failed) and block the
    // fallback below plus everything queued after the await.
    if ('serviceWorker' in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((res) => setTimeout(() => res(null), 3000))
        ]);
        if (reg && reg.showNotification) {
          await reg.showNotification(title, NOTIF_OPTS(body));
          return;
        }
      } catch { /* fall through */ }
    }

    // Fallback: direct tab notification.
    try { new Notification(title, NOTIF_OPTS(body)); } catch { /* */ }
  }

  /**
   * Request permission (must run during a user gesture) and tell the user
   * if alerts can't pop up, instead of failing silently.
   */
  async function ensureNotificationPermission() {
    if (!('Notification' in window)) {
      showToast('🔕 This browser can\'t show timer notifications — keep the app visible');
      return;
    }
    let permission = Notification.permission;
    if (permission === 'default') {
      try { permission = await Notification.requestPermission(); } catch { /* */ }
    }
    if (permission !== 'granted') {
      showToast('🔕 Notifications are blocked — timer alerts won\'t pop up. Enable them for this app in browser site settings and macOS System Settings → Notifications.');
    }
  }

  // ── Summarize modal ───────────────────────────────────────────────────

  function openSummarize(label) {
    inSummarize = true;
    const modal = document.getElementById('focus-summary-modal');
    if (!modal) return;
    const sub = modal.querySelector('.focus-summary-sub');
    if (sub) sub.textContent = label ? `${label} block complete` : 'Block complete';
    const ta = document.getElementById('focus-summary-text');
    if (ta) {
      const activeSession = typeof getActiveSession === 'function' ? getActiveSession() : null;
      ta.value = activeSession ? `Working on: ${activeSession.text}` : '';
    }
    modal.style.display = 'flex';
    if (ta) setTimeout(() => ta.focus(), 60);
  }

  function closeSummarize() {
    inSummarize = false;
    const modal = document.getElementById('focus-summary-modal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * Ending a focus block also stops & records the running task session.
   * The written summary is attached as the session's notes so the task
   * keeps a running tab of what happened in each block.
   */
  function stopActiveTaskSession(summaryText = null) {
    if (typeof getActiveSession !== 'function' || typeof stopSession !== 'function') return;
    const active = getActiveSession();
    if (active) stopSession(active.id, summaryText);
  }

  function saveSummaryAndClose() {
    const ta = document.getElementById('focus-summary-text');
    const text = (ta ? ta.value : '').trim();
    if (text) {
      // Daily archive copy — independent of any task session.
      const note = createNote(text, null, 'focus-block');
      note.date = getTodayLocalYYYYMMDD();
      saveState();
      showToast('Focus summary saved');
    }
    stopActiveTaskSession(text || null);
    clearTs();
    stopInterval();
    renderWidgets();
    closeSummarize();
  }

  function skipSummary() {
    stopActiveTaskSession();
    clearTs();
    stopInterval();
    renderWidgets();
    closeSummarize();
  }

  // ── Timer core ────────────────────────────────────────────────────────

  function stopInterval() {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
  }

  function startInterval() {
    stopInterval();
    tickInterval = setInterval(tick, 1000);
  }

  async function tick() {
    const ts = loadTs();
    if (!ts) { stopInterval(); renderWidgets(); return; }

    const remaining = ts.endMs - Date.now();

    if (!ts.warningSent && remaining <= WARNING_MS && remaining > 0) {
      ts.warningSent = true;
      saveTs(ts);
      playTone('warning');
      await fireNotification('Focus Block — 10 minutes left', 'Start landing. Time to wrap up and summarize.');
    }

    if (!ts.endSent && remaining <= 0) {
      ts.endSent = true;
      saveTs(ts);
      stopInterval();
      playTone('end');
      openSummarize(ts.label);
      await fireNotification('Focus Block complete ✓', 'Nice work. Take a moment to capture what you did.');
    }

    renderWidgets();
  }

  function startBlock(durationMs, label) {
    const ts = { endMs: Date.now() + durationMs, durationMs, label, warningSent: false, endSent: false };
    saveTs(ts);
    startInterval();
    renderWidgets();
    // Both must happen inside the user gesture that started the block:
    unlockAudio();
    ensureNotificationPermission();
  }

  function endBlockEarly() {
    const ts = loadTs();
    openSummarize(ts ? ts.label : null);
    stopInterval();
  }

  // ── Render ────────────────────────────────────────────────────────────

  function formatRemaining(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }

  function idleHtml() {
    return `<button type="button" class="ft-trigger" title="Start a focus block">⏱ Focus</button>`;
  }

  function pickerHtml() {
    return `<div class="ft-picker-overlay" id="ft-picker-overlay" role="dialog" aria-modal="true" aria-label="Start focus block">
      <div class="ft-picker">
        <button type="button" class="ft-picker-close" title="Cancel">✕</button>
        <div class="ft-picker-ring-wrap" aria-hidden="true">
          <svg class="ft-picker-ring" viewBox="0 0 80 80">
            <circle class="ft-ring-track" cx="40" cy="40" r="34"/>
            <circle class="ft-picker-ring-fill" cx="40" cy="40" r="34" id="ft-picker-arc"
              stroke-dasharray="0 213.6" transform="rotate(-90 40 40)"/>
          </svg>
          <span class="ft-picker-ring-label" id="ft-picker-ring-label">?</span>
        </div>
        <p class="ft-picker-heading">How long do you want to focus?</p>
        <div class="ft-picker-presets">
          <button type="button" class="ft-preset" data-min="25">25 min</button>
          <button type="button" class="ft-preset" data-min="45">45 min</button>
          <button type="button" class="ft-preset" data-min="60">60 min</button>
          <button type="button" class="ft-preset" data-min="90">90 min</button>
        </div>
        <div class="ft-picker-custom">
          <input type="number" class="ft-custom-input" id="ft-picker-custom-input" min="5" max="240" placeholder="Custom minutes…" aria-label="Custom duration in minutes">
        </div>
        <button type="button" class="ft-picker-start btn-primary" id="ft-picker-start-btn" disabled>Start focus block</button>
      </div>
    </div>`;
  }

  function runningHtml(ts) {
    const remaining = ts.endMs - Date.now();
    const isWarning = remaining <= WARNING_MS;
    const pct = Math.max(0, Math.min(100, (remaining / ts.durationMs) * 100));
    const r = 18;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    const activeSession = typeof getActiveSession === 'function' ? getActiveSession() : null;
    const taskLine = activeSession
      ? `<span class="ft-active-task" title="Current task: ${activeSession.text}">▶ ${activeSession.text.length > 30 ? activeSession.text.slice(0, 30) + '…' : activeSession.text}</span>`
      : '';
    return `<div class="ft-running${isWarning ? ' ft-warning' : ''}">
      <svg class="ft-ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle class="ft-ring-track" cx="20" cy="20" r="${r}"/>
        <circle class="ft-ring-fill" cx="20" cy="20" r="${r}"
          stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
          transform="rotate(-90 20 20)"/>
      </svg>
      <div class="ft-running-inner">
        <span class="ft-countdown">${formatRemaining(remaining)}</span>
        <span class="ft-running-label">${ts.label}</span>
        ${taskLine}
      </div>
      <button type="button" class="ft-end-btn" title="End block & summarize">✕</button>
    </div>`;
  }

  // ── Picker popover ────────────────────────────────────────────────────

  let pickerSelectedMin = null;

  function openPicker() {
    if (document.getElementById('ft-picker-overlay')) return;
    pickerSelectedMin = null;
    document.body.insertAdjacentHTML('beforeend', pickerHtml());
    const overlay = document.getElementById('ft-picker-overlay');
    bindPicker(overlay);
    requestAnimationFrame(() => overlay.classList.add('ft-picker-overlay--in'));
  }

  function closePicker() {
    const overlay = document.getElementById('ft-picker-overlay');
    if (!overlay) return;
    overlay.classList.remove('ft-picker-overlay--in');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  function updatePickerArc(min) {
    const arc = document.getElementById('ft-picker-arc');
    const label = document.getElementById('ft-picker-ring-label');
    const startBtn = document.getElementById('ft-picker-start-btn');
    const circ = 2 * Math.PI * 34;
    if (arc && min >= 5) {
      const pct = Math.min(min / 120, 1);
      arc.setAttribute('stroke-dasharray', `${(pct * circ).toFixed(2)} ${circ.toFixed(2)}`);
    }
    if (label) label.textContent = min >= 5 ? `${min}m` : '?';
    if (startBtn) startBtn.disabled = !(min >= 5 && min <= 240);
  }

  function bindPicker(overlay) {
    overlay.querySelector('.ft-picker-close')?.addEventListener('click', closePicker);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePicker(); });
    document.addEventListener('keydown', onPickerEsc);

    overlay.querySelectorAll('.ft-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.ft-preset').forEach(b => b.classList.remove('ft-preset--active'));
        btn.classList.add('ft-preset--active');
        pickerSelectedMin = Number(btn.dataset.min);
        const customInput = document.getElementById('ft-picker-custom-input');
        if (customInput) customInput.value = '';
        updatePickerArc(pickerSelectedMin);
      });
    });

    const customInput = document.getElementById('ft-picker-custom-input');
    if (customInput) {
      customInput.addEventListener('input', () => {
        const v = parseInt(customInput.value, 10);
        overlay.querySelectorAll('.ft-preset').forEach(b => b.classList.remove('ft-preset--active'));
        pickerSelectedMin = (v >= 5 && v <= 240) ? v : null;
        updatePickerArc(pickerSelectedMin || 0);
      });
      customInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && pickerSelectedMin) doStart();
      });
    }

    document.getElementById('ft-picker-start-btn')?.addEventListener('click', doStart);
  }

  function doStart() {
    if (!pickerSelectedMin || pickerSelectedMin < 5) return;
    closePicker();
    startBlock(pickerSelectedMin * 60 * 1000, `${pickerSelectedMin} min`);
  }

  function onPickerEsc(e) {
    if (e.key === 'Escape' && document.getElementById('ft-picker-overlay')) {
      closePicker();
      document.removeEventListener('keydown', onPickerEsc);
    }
  }

  // ── Widget render / bind ──────────────────────────────────────────────

  function renderWidget(root, ts) {
    if (!ts || ts.endSent) {
      root.innerHTML = idleHtml();
    } else {
      root.innerHTML = runningHtml(ts);
    }
    bindWidget(root);
  }

  function renderWidgets() {
    const ts = loadTs();
    document.querySelectorAll('.focus-timer-widget').forEach(w => renderWidget(w, ts));
  }

  function bindWidget(root) {
    root.querySelector('.ft-trigger')?.addEventListener('click', openPicker);
    root.querySelector('.ft-end-btn')?.addEventListener('click', endBlockEarly);
  }

  // ── Summary modal bindings ────────────────────────────────────────────

  function bindSummaryModal() {
    const modal = document.getElementById('focus-summary-modal');
    if (!modal) return;
    document.getElementById('focus-summary-save')?.addEventListener('click', saveSummaryAndClose);
    document.getElementById('focus-summary-skip')?.addEventListener('click', skipSummary);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && inSummarize) skipSummary();
    });
    // Ctrl/Cmd+Enter saves
    document.getElementById('focus-summary-text')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveSummaryAndClose();
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────

  function boot() {
    const ts = loadTs();
    if (ts && ts.endMs) {
      const remaining = ts.endMs - Date.now();
      if (remaining > 0 && !ts.endSent) {
        startInterval();
      } else if (!ts.endSent) {
        ts.endSent = true;
        saveTs(ts);
        openSummarize(ts.label);
      }
    }
    renderWidgets();
    bindSummaryModal();
  }

  return { boot, startBlock, endBlockEarly, renderWidgets };
}
