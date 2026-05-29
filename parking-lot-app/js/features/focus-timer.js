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
 * @param {{ saveState: () => void, showToast: (msg: string) => void }} deps
 */
export function createFocusTimer({ saveState, showToast }) {
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

  function playTone(type) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
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

  async function fireNotification(title, body) {
    if (!('Notification' in window)) return;
    const send = () => {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          tag: 'focus-timer',
          renotify: true
        });
      } catch { /* */ }
    };
    if (Notification.permission === 'granted') {
      send();
    } else if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') send();
    }
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    await Notification.requestPermission();
  }

  // ── Summarize modal ───────────────────────────────────────────────────

  function openSummarize(label) {
    inSummarize = true;
    const modal = document.getElementById('focus-summary-modal');
    if (!modal) return;
    const sub = modal.querySelector('.focus-summary-sub');
    if (sub) sub.textContent = label ? `${label} block complete` : 'Block complete';
    const ta = document.getElementById('focus-summary-text');
    if (ta) { ta.value = ''; }
    modal.style.display = 'flex';
    if (ta) setTimeout(() => ta.focus(), 60);
  }

  function closeSummarize() {
    inSummarize = false;
    const modal = document.getElementById('focus-summary-modal');
    if (modal) modal.style.display = 'none';
  }

  function saveSummaryAndClose() {
    const ta = document.getElementById('focus-summary-text');
    const text = (ta ? ta.value : '').trim();
    if (text) {
      const note = createNote(text, null, 'focus-block');
      note.date = getTodayLocalYYYYMMDD();
      saveState();
      showToast('Focus summary saved');
    }
    clearTs();
    stopInterval();
    renderWidgets();
    closeSummarize();
  }

  function skipSummary() {
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
      await fireNotification('Focus Block — 10 minutes left', 'Start landing. Time to wrap up and summarize.');
      playTone('warning');
    }

    if (!ts.endSent && remaining <= 0) {
      ts.endSent = true;
      saveTs(ts);
      stopInterval();
      await fireNotification('Focus Block complete ✓', 'Nice work. Take a moment to capture what you did.');
      playTone('end');
      openSummarize(ts.label);
    }

    renderWidgets();
  }

  function startBlock(durationMs, label) {
    const ts = { endMs: Date.now() + durationMs, durationMs, label, warningSent: false, endSent: false };
    saveTs(ts);
    startInterval();
    renderWidgets();
    requestNotificationPermission();
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
    return `<div class="ft-idle">
      <span class="ft-icon">⏱</span>
      <div class="ft-presets">
        <button type="button" class="ft-preset" data-min="25">25m</button>
        <button type="button" class="ft-preset" data-min="45">45m</button>
        <button type="button" class="ft-preset" data-min="60">60m</button>
        <button type="button" class="ft-preset" data-min="90">90m</button>
        <span class="ft-custom-wrap">
          <input type="number" class="ft-custom-input" min="5" max="240" placeholder="?" title="Custom minutes">
          <button type="button" class="ft-custom-go">▶</button>
        </span>
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
      </div>
      <button type="button" class="ft-end-btn" title="End block & summarize">✕</button>
    </div>`;
  }

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
    root.querySelectorAll('.ft-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const min = Number(btn.dataset.min);
        startBlock(min * 60 * 1000, `${min} min`);
      });
    });
    const customGo = root.querySelector('.ft-custom-go');
    const customInput = root.querySelector('.ft-custom-input');
    if (customGo && customInput) {
      const go = () => {
        const min = parseInt(customInput.value, 10);
        if (min >= 5 && min <= 240) startBlock(min * 60 * 1000, `${min} min`);
      };
      customGo.addEventListener('click', go);
      customInput.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }
    const endBtn = root.querySelector('.ft-end-btn');
    if (endBtn) endBtn.addEventListener('click', endBlockEarly);
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
