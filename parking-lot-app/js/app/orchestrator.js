import {
  CATEGORY_PRESETS,
  PRESET_MIGRATION,
  PRIORITIES,
  PRIORITY_ORDER,
  MONTHS,
  STORAGE_PREFIX,
  HAS_CHOSEN_SOLO_KEY,
  DEFAULT_COLUMN_COLORS
} from '../constants.js';
import { state } from '../state.js';
import { hasSupabaseConfig } from '../config/supabase-env.js';
import { escapeHtml } from '../utils/dom.js';
import { wirePersist } from '../core/persist.js';
import {
  loadPairState,
  savePairState,
  hasChosenSolo,
  setChosenSolo,
  loadDeviceSyncState,
  saveDeviceSyncState
} from '../storage/pair-device.js';
import {
  loadState,
  saveState,
  setStorageNotify,
  setCloudSyncHook,
  getTallyDate,
  getTallyDateYYYYMMDD,
} from '../storage/local.js';
import { getCategories, getOrderedCategoryIds, getCategoryLabel } from '../domain/categories.js';
import {
  detectCategory,
  extractDeadline,
  extractDoingDate,
  extractFriction,
  extractRecurrence,
  extractPriority,
  stripAutoExtractedFromText,
  createItem,
  formatDuration,
  parseLocalDate,
  getSortReferenceDate,
  formatDeadline,
  getTodayLocalYYYYMMDD,
  getTimeBand,
  sortByTimeBandsAndFriction,
  sortItems,
  archivePastDoingDatesIfNeeded,
  getActiveItems,
  getItemsByCategory,
  getColumnColor,
  getActiveColumnColors
} from '../domain/tasks.js';
import {
  getPiles,
  getPileName,
  getPeopleGroups,
  addPeopleGroup,
  renamePeopleGroup,
  deletePeopleGroup,
  getPeople,
  getPerson,
  getPersonName,
  addPerson,
  updatePerson,
  appendPersonHistory,
  deletePerson,
  getReconnectIntervalMs,
  isOverdueToReconnect,
  addPile,
  updatePile,
  deletePile
} from '../domain/piles-people.js';
import {
  mergeJournalDayRemote,
  normalizeJournalDayValue,
  sanitizeJournalHtml,
  newEntryId,
  journalDayHasContent,
  coerceJournalEntryDisplayHtml,
  JOURNAL_EMPTY_ENTRY_HTML
} from '../domain/journal-daily.js';
import {
  getHabits,
  recordCompletion,
  removeCompletionsForTask,
  computeWeightedPct,
  compute7DayRolling,
  getZoneLabel,
  addHabit,
  updateHabit,
  deleteHabit
} from '../domain/habits.js';
import { applyThemeColors } from '../ui/theme.js';
import { showToast } from '../features/toast.js';
import { updateOfflineBanner } from '../features/offline-banner.js';
import { buildBackupPayload } from '../domain/backup-export.js';
import {
  normalizeWeekPlan,
  pruneWeekPlan,
  removeTaskIdFromAllDays,
  getMondayYYYYMMDD,
  insertTaskInDayOrder
} from '../domain/weekly-planning.js';
import { createBoardRenderer } from '../render/board.js';
import { createTodayFocusRenderer } from '../render/today-focus.js';
import { createUnifiedTodayRenderer } from '../render/unified-today.js';
import { createWeekPlanningUI } from '../features/week-planning-ui.js';
import { attachMainAppRealtime, attachDevicePreferencesRealtime } from '../sync/realtime.js';
import { createTalkAboutUI } from '../features/talk-about.js';
import { createEmailTriageUI } from '../features/email-triage.js';

wirePersist(() => saveState());

/** Last focused journal body (for shared Stoic toolbar). */
let journalStoicLastBody = null;

let tfApi;
let unifiedApi;
let weekPlanningApi;
let renderWeekStrip;
/** @type {(ids: string[]) => void} */
let processAddToTodayQueue;
let talkApi;
let emailTriageApi;
let renderColumns;
let updateColumnNoteTurnPopover;
let renderTodayList;
let renderFocusList;
let renderConsistencySmall;
let updateTally;
let updateAddToSuggestionsBtn;
let addToSuggestions;
let clearAddToSuggestionsSelection;
let removeFromSuggestions;
let suggestNext;
let showSuggestNextStrip;
let hideSuggestNextStrip;
let renderTalkAbout;
let renderEmailTriage;
let closeAddFromTalkModal;
let submitAddFromTalk;

function wireComposer() {
  const board = createBoardRenderer({
    state,
    saveState,
    showToast,
    saveDevicePreferencesToSupabase,
    openAddModal,
    openEditModal,
    deleteItem,
    markDone,
    updateAddToSuggestionsBtn: () => tfApi.updateAddToSuggestionsBtn()
  });
  renderColumns = board.renderColumns;
  updateColumnNoteTurnPopover = board.updateColumnNoteTurnPopover;

  tfApi = createTodayFocusRenderer({
    state,
    saveState,
    markDone,
    renderColumns,
    saveDevicePreferencesToSupabase
  });
  const {
    renderConsistencySmall,
    updateTally,
    updateAddToSuggestionsBtn: tfUpdateAddToSuggestionsBtn,
    clearAddToSuggestionsSelection,
    removeFromSuggestions,
    suggestNext,
    showSuggestNextStrip,
    hideSuggestNextStrip
  } = tfApi;

  weekPlanningApi = createWeekPlanningUI({
    state,
    saveState,
    saveDevicePreferencesToSupabase,
    onCommitted: () => {
      unifiedApi.renderTodayList();
      unifiedApi.renderFocusUnified();
      renderWeekStrip();
      renderColumns();
    }
  });

  unifiedApi = createUnifiedTodayRenderer({
    state,
    saveState,
    markDone,
    renderColumns,
    renderConsistencySmall,
    saveDevicePreferencesToSupabase,
    openPlanningEntry: (opts) => weekPlanningApi.openPlanningEntry(opts)
  });

  renderTodayList = () => unifiedApi.renderTodayList();
  renderFocusList = () => unifiedApi.renderFocusUnified();
  renderWeekStrip = () => weekPlanningApi.renderWeekStrip(document.getElementById('week-strip-row'));

  processAddToTodayQueue = function processAddToTodayQueueInner(ids) {
    if (!ids.length) {
      tfUpdateAddToSuggestionsBtn();
      renderColumns();
      return;
    }
    const id = ids[0];
    const rest = ids.slice(1);
    const item = state.items.find(i => i.id === id);
    if (!item) {
      processAddToTodayQueueInner(rest);
      return;
    }
    const todayStr = getTodayLocalYYYYMMDD();
    const mon = getMondayYYYYMMDD();
    let wp = normalizeWeekPlan(state.weekPlan);
    if (!wp.anchorWeekStart || wp.anchorWeekStart !== mon) {
      if (!state.todaySuggestionIds.includes(id)) state.todaySuggestionIds.push(id);
      saveState();
      renderTodayList();
      renderFocusList();
      renderColumns();
      processAddToTodayQueueInner(rest);
      return;
    }
    const day = wp.days[todayStr];
    const plannedPile = day && day.pileId;
    const itemPile = item.pileId || null;
    if (plannedPile && itemPile === plannedPile) {
      weekPlanningApi.askTopOrBottom((pos) => {
        state.weekPlan = insertTaskInDayOrder(state.weekPlan, todayStr, id, pos);
        state.weekPlan = pruneWeekPlan(state.items, state.weekPlan);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
        processAddToTodayQueueInner(rest);
      });
      return;
    }
    if (!state.todaySuggestionIds.includes(id)) state.todaySuggestionIds.push(id);
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();
    processAddToTodayQueueInner(rest);
  };

  updateAddToSuggestionsBtn = tfUpdateAddToSuggestionsBtn;
  addToSuggestions = () => {
    const ids = [...state.selectedIds];
    state.selectedIds.clear();
    processAddToTodayQueue(ids);
  };

  talkApi = createTalkAboutUI({
    state,
    showToast,
    saveState,
    renderColumns,
    updatePileSelectOptions
  });
  renderTalkAbout = () => talkApi.renderTalkAbout();
  closeAddFromTalkModal = () => talkApi.closeAddFromTalkModal();
  submitAddFromTalk = () => talkApi.submitAddFromTalk();

  emailTriageApi = createEmailTriageUI({
    state,
    showToast,
    saveState,
    renderColumns
  });
  renderEmailTriage = (showPanel) => emailTriageApi.renderEmailTriage(showPanel);
}

  function getColumnNoteFocusSnapshot() {
    const el = document.activeElement;
    if (!el || !el.classList || !el.classList.contains('column-note-textarea')) return null;
    return {
      category: el.dataset.category,
      start: el.selectionStart,
      end: el.selectionEnd,
      scrollTop: el.scrollTop
    };
  }

  function restoreColumnNoteFocus(snap) {
    if (!snap) return;
    requestAnimationFrame(() => {
      const el = document.querySelector('.column-note-textarea[data-category="' + snap.category + '"]');
      if (!el) return;
      el.focus();
      try {
        const max = el.value.length;
        el.setSelectionRange(Math.min(snap.start, max), Math.min(snap.end, max));
      } catch (e) { /* selection may be invalid on first paint */ }
      el.scrollTop = snap.scrollTop;
    });
  }

  function refreshUIAfterRemotePrefs() {
    const noteSnap = getColumnNoteFocusSnapshot();
    applyThemeColors();
    updateCategorySelectOptions();
    renderColumns();
    restoreColumnNoteFocus(noteSnap);
    renderTodayList();
    renderWeekStrip();
    updateTally();
    updateAddToSuggestionsBtn();
  }

  function respawnRecurring(item) {
    const now = new Date();
    let nextDeadline = null;
    if (item.recurrence === 'daily') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      nextDeadline = d.toISOString().slice(0, 10);
    } else if (item.recurrence === 'weekly') {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      nextDeadline = d.toISOString().slice(0, 10);
    } else if (item.recurrence === 'monthly') {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      nextDeadline = d.toISOString().slice(0, 10);
    }
    const newItem = createItem(item.text, item.category, nextDeadline, item.priority, item.recurrence, null, item.doingDate, item.pileId, item.friction, item.personId || null);
    state.items.push(newItem);
    return newItem.id;
  }


  function markDone(id) {
    if (state.processingIds.has(id)) return;
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.processingIds.add(id);
    const wasInSuggestions = state.todaySuggestionIds.includes(id);
    const prevArchived = item.archived;
    const prevArchivedAt = item.archivedAt;
    const prevCompletedAt = item.completedAt;
    item.archived = true;
    item.archivedAt = item.archivedAt || Date.now();
    item.completedAt = Date.now();
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    state.weekPlan = removeTaskIdFromAllDays(state.weekPlan, id);
    const respawnedId = item.recurrence ? respawnRecurring(item) : null;
    const todayStr = getTodayLocalYYYYMMDD();
    (state.habits || []).forEach(h => {
      if (h.linkedCategoryId === item.category || h.linkedPileId === item.pileId) recordCompletion(h.id, todayStr, 'task', item.id);
    });
    saveState();
    updateTally();
    renderTodayList();
    renderFocusList();
    renderColumns();

    state.processingIds.delete(id);
    showToast('Done', () => {
      item.archived = prevArchived;
      item.archivedAt = prevArchivedAt;
      item.completedAt = prevCompletedAt;
      if (wasInSuggestions) state.todaySuggestionIds.push(id);
      if (respawnedId) state.items = state.items.filter(i => i.id !== respawnedId);
      removeCompletionsForTask(id, todayStr);
      saveState();
      updateTally();
      renderTodayList();
      renderFocusList();
      renderColumns();
    });
    if (state.undoDoneTimeout) clearTimeout(state.undoDoneTimeout);
    state.undoDoneTimeout = setTimeout(() => { /* toast hides */ }, 5000);

    if (state.showSuggestNext) {
      const nextTask = suggestNext(item);
      if (nextTask) showSuggestNextStrip(nextTask, item);
    }
    renderConsistencySmall();
  }

  function deleteItem(id, showUndo = true) {
    if (state.processingIds.has(id)) return;
    const idx = state.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    state.processingIds.add(id);
    const item = state.items[idx];
    state.items.splice(idx, 1);
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    state.weekPlan = removeTaskIdFromAllDays(state.weekPlan, id);
    state.selectedIds.delete(id);
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();

    state.processingIds.delete(id);
    if (showUndo) {
      const restoreIndex = idx;
      const restoreItem = item;
      showToast('Removed', () => {
        const safeIndex = Math.max(0, Math.min(restoreIndex, state.items.length));
        state.items.splice(safeIndex, 0, restoreItem);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
      });
    }
  }

  function updateCategorySelectOptions() {
    const sel = document.getElementById('category-select');
    if (!sel) return;
    sel.innerHTML = getCategories().map(c =>
      `<option value="${c.id}">${escapeHtml(getCategoryLabel(c.id))}</option>`
    ).join('');
  }

  function updatePileSelectOptions(selectIdOrEl, selectedPileId) {
    const el = typeof selectIdOrEl === 'string' ? document.getElementById(selectIdOrEl) : selectIdOrEl;
    if (!el) return;
    const piles = getPiles();
    el.innerHTML = '<option value="">None</option>' + piles.map(p =>
      `<option value="${p.id}" ${p.id === selectedPileId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('');
  }

  function updatePersonSelectOptions(selectIdOrEl, selectedPersonId) {
    const el = typeof selectIdOrEl === 'string' ? document.getElementById(selectIdOrEl) : selectIdOrEl;
    if (!el) return;
    const people = getPeople().slice().sort(function(a, b) {
      const groups = getPeopleGroups();
      var ai = groups.findIndex(function(g) { return g.id === a.group; });
      var bi = groups.findIndex(function(g) { return g.id === b.group; });
      if (ai !== bi) return ai - bi;
      return (a.name || '').localeCompare(b.name || '');
    });
    el.innerHTML = '<option value="">None</option>' + people.map(function(p) {
      return '<option value="' + p.id + '"' + (p.id === selectedPersonId ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
    }).join('');
  }

  function openAddModal(presetCategory, presetPileId) {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'flex';
    updateCategorySelectOptions();
    updatePileSelectOptions('pile-select', presetPileId != null ? presetPileId : '');
    updatePersonSelectOptions('person-select', '');
    const submitVoice = document.getElementById('submit-voice');
    if (submitVoice) submitVoice.disabled = true;
    const tabSingle = document.getElementById('tab-single');
    const tabQuick = document.getElementById('tab-quick');
    const tabVoice = document.getElementById('tab-voice');
    const singleAdd = document.getElementById('single-add');
    const quickAdd = document.getElementById('quick-add');
    const voiceAdd = document.getElementById('voice-add');
    if (tabSingle) tabSingle.classList.add('active');
    if (tabQuick) tabQuick.classList.remove('active');
    if (tabVoice) tabVoice.classList.remove('active');
    if (singleAdd) singleAdd.style.display = 'block';
    if (quickAdd) quickAdd.style.display = 'none';
    if (voiceAdd) voiceAdd.style.display = 'none';
    const transcriptEl = document.getElementById('voice-transcript');
    if (transcriptEl) transcriptEl.textContent = '';
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.value = '';
      taskInput.focus();
    }
    const quickInput = document.getElementById('quick-input');
    if (quickInput) quickInput.value = '';
    const deadlineInput = document.getElementById('deadline-input');
    if (deadlineInput) deadlineInput.value = '';
    const doingDateInput = document.getElementById('doing-date-input');
    if (doingDateInput) doingDateInput.value = '';
    const recurrenceSelect = document.getElementById('recurrence-select');
    if (recurrenceSelect) recurrenceSelect.value = '';
    const prioritySelect = document.getElementById('priority-select');
    if (prioritySelect) prioritySelect.value = 'medium';
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) categorySelect.value = presetCategory || state.lastCategory;
    if (presetCategory) state.lastCategory = presetCategory;
    if (presetPileId == null) updatePileSelectOptions('pile-select', '');
    const frictionSelect = document.getElementById('friction-select');
    if (frictionSelect) frictionSelect.value = '';
    const firstStepInput = document.getElementById('first-step-input');
    if (firstStepInput) firstStepInput.value = '';
  }

  function closeAddModal() {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'none';
  }

  function addQuick() {
    const submitBtn = document.getElementById('submit-quick');
    if (submitBtn?.disabled) return;
    const el = document.getElementById('quick-input');
    const lines = (el && el.value) ? el.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
    if (!lines.length) return;
    if (submitBtn) submitBtn.disabled = true;
    lines.forEach(line => {
      const cat = detectCategory(line) || state.lastCategory;
      state.lastCategory = cat;
      const deadline = extractDeadline(line);
      const priority = extractPriority(line) || 'medium';
      const item = createItem(line, cat, deadline, priority, null, null, null, null, null, null);
      state.items.push(item);
    });
    saveState();
    closeAddModal();
    renderColumns();
    showToast('Added ' + lines.length + ' items');
    if (submitBtn) submitBtn.disabled = false;
  }

  function addVoiceMultiple() {
    const submitBtn = document.getElementById('submit-voice');
    if (submitBtn?.disabled) return;
    const transcriptEl = document.getElementById('voice-transcript');
    let transcript = (transcriptEl && transcriptEl.textContent) ? transcriptEl.textContent.trim() : '';
    transcript = transcript.replace(/\s+comma\s+/gi, ',');
    const lines = transcript.split(/,\s*|\s+next\s+/i).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    if (submitBtn) submitBtn.disabled = true;
    lines.forEach(line => {
      const cat = detectCategory(line) || state.lastCategory;
      state.lastCategory = cat;
      const deadline = extractDeadline(line);
      const priority = extractPriority(line) || 'medium';
      const item = createItem(line, cat, deadline, priority, null, null, null, null, null, null);
      state.items.push(item);
    });
    saveState();
    if (transcriptEl) transcriptEl.textContent = '';
    closeAddModal();
    renderColumns();
    showToast('Added ' + lines.length + ' items');
    if (submitBtn) submitBtn.disabled = false;
  }

  function initVoiceMulti() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById('voice-multi-btn');
    const transcriptEl = document.getElementById('voice-transcript');
    const submitBtn = document.getElementById('submit-voice');
    if (!SpeechRecognition || !btn) {
      const tabVoice = document.getElementById('tab-voice');
      if (tabVoice) tabVoice.style.display = 'none';
      return;
    }
    let recognition = null;
    btn.addEventListener('click', () => {
      if (recognition) {
        recognition.stop();
        return;
      }
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            const t = (transcriptEl.textContent || '') + (transcriptEl.textContent ? ' ' : '') + e.results[i][0].transcript;
            transcriptEl.textContent = t.trim();
          }
        }
        if (submitBtn) submitBtn.disabled = !(transcriptEl.textContent || '').trim();
      };
      recognition.onend = () => { recognition = null; btn.textContent = 'Start speaking'; };
      recognition.onerror = () => { recognition = null; btn.textContent = 'Start speaking'; };
      recognition.start();
      btn.textContent = 'Stop';
    });
    if (submitBtn) submitBtn.addEventListener('click', addVoiceMultiple);
  }

  function ensureSettingsAccordion() {
    const modalBody = document.querySelector('#settings-modal .modal-body');
    if (!modalBody || modalBody.dataset.accordionized === 'true') return;
    const saveBtn = document.getElementById('save-settings');
    if (!saveBtn) return;

    function collectRange(startNode, endNode) {
      if (!startNode || !endNode) return [];
      const nodes = [];
      let n = startNode;
      while (n) {
        const next = n.nextElementSibling;
        nodes.push(n);
        if (n === endNode) break;
        n = next;
      }
      return nodes;
    }

    function createSection(title, open, nodes) {
      if (!nodes || !nodes.length) return;
      const details = document.createElement('details');
      details.className = 'settings-accordion';
      if (open) details.open = true;
      const summary = document.createElement('summary');
      summary.className = 'settings-accordion-title';
      summary.textContent = title;
      const content = document.createElement('div');
      content.className = 'settings-accordion-content';
      nodes.forEach(node => content.appendChild(node));
      details.appendChild(summary);
      details.appendChild(content);
      modalBody.appendChild(details);
    }

    const notifications = document.getElementById('settings-push-notifications');
    const syncStart = document.getElementById('settings-sync-code');
    const syncEnd = document.getElementById('settings-pair-code');
    const nameInput = document.getElementById('settings-display-name');
    const dayReset = document.getElementById('settings-tally-reset-hour');
    const presetButtons = document.querySelector('.settings-preset-btns');
    const pilesAdd = document.querySelector('.settings-piles-add');
    const themeColors = document.querySelector('.settings-theme-colors');

    const generalStart = nameInput ? nameInput.previousElementSibling && nameInput.previousElementSibling.previousElementSibling : null;
    const workflowStart = presetButtons ? presetButtons.previousElementSibling && presetButtons.previousElementSibling.previousElementSibling : null;
    const appearanceStart = themeColors ? themeColors.previousElementSibling && themeColors.previousElementSibling.previousElementSibling : null;

    saveBtn.remove();

    createSection('General', true, collectRange(generalStart, dayReset));
    createSection('Workflow', true, collectRange(workflowStart, pilesAdd));
    createSection('Appearance', false, collectRange(appearanceStart, themeColors));
    createSection('Sync & Devices', false, collectRange(syncStart, syncEnd));
    if (notifications) createSection('Notifications', false, [notifications]);

    modalBody.appendChild(saveBtn);
    modalBody.dataset.accordionized = 'true';
  }

  function openSettingsModal() {
    ensureSettingsAccordion();
    const pushStatus = document.getElementById('settings-push-status');
    if (pushStatus) pushStatus.textContent = '';
    const buildRefEl = document.getElementById('settings-build-ref');
    if (buildRefEl) {
      const ref = (state.buildRef || '').trim();
      buildRefEl.textContent = ref ? ('Build: ' + ref) : '';
    }
    const displayNameEl = document.getElementById('settings-display-name');
    if (displayNameEl) displayNameEl.value = state.displayName || '';

    const tallyResetEl = document.getElementById('settings-tally-reset-hour');
    if (tallyResetEl) tallyResetEl.value = String(state.tallyResetHour != null ? state.tallyResetHour : 3);

    const showSuggestNextEl = document.getElementById('settings-show-suggest-next');
    if (showSuggestNextEl) showSuggestNextEl.checked = !!state.showSuggestNext;

    const presetRadios = document.querySelectorAll('input[name="category-preset"]');
    presetRadios.forEach(r => {
      r.checked = (r.value === (state.categoryPreset || 'generic'));
    });
    const container = document.getElementById('settings-column-inputs');
    if (!container) return;
    container.innerHTML = getCategories().map(c => {
      const val = (state.customLabels[c.id] || c.label);
      return `<label>${escapeHtml(c.label)}<input type="text" data-cat="${c.id}" value="${escapeHtml(val)}" placeholder="${escapeHtml(c.label)}"></label>`;
    }).join('');

    const colorsContainer = document.getElementById('settings-column-colors');
    if (colorsContainer) {
      colorsContainer.innerHTML = getCategories().map(c => {
        const current = getColumnColor(c.id);
        return `
          <div class="settings-color-row">
            <label>${escapeHtml(getCategoryLabel(c.id))}</label>
            <div class="color-picker-row">
              <input type="color" data-cat="${c.id}" value="${current}" class="color-input">
              <input type="text" data-cat="${c.id}" class="color-hex-input" value="${current}" placeholder="#000000" maxlength="7">
            </div>
          </div>`;
      }).join('');

      colorsContainer.querySelectorAll('.color-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const cat = e.target.dataset.cat;
          state.columnColors[cat] = e.target.value;
          const hexInp = colorsContainer.querySelector(`.color-hex-input[data-cat="${cat}"]`);
          if (hexInp) hexInp.value = e.target.value;
          saveDevicePreferencesToSupabase();
          renderColumns();
        });
      });
      colorsContainer.querySelectorAll('.color-hex-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const cat = e.target.dataset.cat;
          const val = e.target.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            state.columnColors[cat] = val;
            const colorInp = colorsContainer.querySelector(`.color-input[data-cat="${cat}"]`);
            if (colorInp) colorInp.value = val;
            saveDevicePreferencesToSupabase();
            renderColumns();
          }
        });
      });
    }

    const btnColorEl = document.getElementById('settings-button-color');
    const btnHexEl = document.getElementById('settings-button-hex');
    const textColorEl = document.getElementById('settings-text-color');
    const textHexEl = document.getElementById('settings-text-hex');
    const defaultBtn = '#e07a5f';
    const defaultText = '#e8e6e3';
    if (btnColorEl) btnColorEl.value = state.buttonColor || defaultBtn;
    if (btnHexEl) btnHexEl.value = state.buttonColor || defaultBtn;
    if (textColorEl) textColorEl.value = state.textColor || defaultText;
    if (textHexEl) textHexEl.value = state.textColor || defaultText;

    const syncCodeEl = document.getElementById('settings-sync-code');
    const syncCodeDisplay = document.getElementById('settings-sync-code-display');
    const pairCodeEl = document.getElementById('settings-pair-code');
    const pairCodeDisplay = document.getElementById('settings-pair-code-display');
    if (syncCodeEl && syncCodeDisplay) {
      if (state.deviceSyncId) {
        syncCodeEl.style.display = 'block';
        syncCodeDisplay.textContent = state.deviceSyncId;
      } else {
        syncCodeEl.style.display = 'none';
      }
    }
    if (pairCodeEl && pairCodeDisplay) {
      if (state.pairId) {
        pairCodeEl.style.display = 'block';
        pairCodeDisplay.textContent = state.pairId;
      } else {
        pairCodeEl.style.display = 'none';
      }
    }

    renderSettingsPilesList();
    const pileNameInput = document.getElementById('settings-pile-name');
    const pileAddBtn = document.getElementById('settings-pile-add-btn');
    if (pileAddBtn && pileNameInput) {
      pileAddBtn.replaceWith(pileAddBtn.cloneNode(true));
      document.getElementById('settings-pile-add-btn').addEventListener('click', () => {
        const name = pileNameInput.value.trim();
        if (!name) return;
        addPile(name);
        pileNameInput.value = '';
        renderSettingsPilesList();
        showToast('Pile added');
      });
    }

    document.getElementById('settings-modal').style.display = 'flex';
  }

  function renderSettingsPilesList() {
    const container = document.getElementById('settings-piles-list');
    if (!container) return;
    const piles = getPiles();
    container.innerHTML = piles.length ? piles.map(p => {
      const count = (state.items || []).filter(i => i.pileId === p.id).length;
      return `<div class="settings-pile-row" data-pile-id="${p.id}">
        <span class="settings-pile-name">${escapeHtml(p.name)}</span>
        <span class="settings-pile-meta">${count} task${count !== 1 ? 's' : ''}</span>
        <button type="button" class="btn-secondary btn-sm settings-pile-rename" data-pile-id="${p.id}">Rename</button>
        <button type="button" class="btn-secondary btn-sm settings-pile-delete" data-pile-id="${p.id}" data-count="${count}">Delete</button>
      </div>`;
    }).join('') : '<p class="settings-hint">No piles yet. Add one below.</p>';

    container.querySelectorAll('.settings-pile-rename').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pileId;
        const current = getPileName(id) || '';
        const name = window.prompt('Rename pile:', current);
        if (name != null && name.trim()) {
          updatePile(id, name.trim());
          renderSettingsPilesList();
          showToast('Pile renamed');
        }
      });
    });
    container.querySelectorAll('.settings-pile-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pileId;
        const count = parseInt(btn.dataset.count, 10) || 0;
        const msg = count > 0
          ? count + ' task' + (count !== 1 ? 's' : '') + ' will become uncategorized. Delete this pile?'
          : 'Delete this pile?';
        if (window.confirm(msg)) {
          deletePile(id);
          renderSettingsPilesList();
          renderColumns();
          showToast('Pile deleted');
        }
      });
    });
  }

  function getPreferencesForDevice() {
    const prefs = { ...getActiveColumnColors() };
    if (state.buttonColor) prefs.__button = state.buttonColor;
    if (state.textColor) prefs.__text = state.textColor;
    prefs.custom_labels = { ...(state.customLabels || {}) };
    prefs.category_preset = state.categoryPreset || 'generic';
    prefs.__items = state.items;
    prefs.__todaySuggestionIds = state.todaySuggestionIds;
    if (Array.isArray(state.columnOrder) && state.columnOrder.length) prefs.__columnOrder = state.columnOrder;
    prefs.__tallyResetHour = state.tallyResetHour != null ? state.tallyResetHour : 3;
    if (Array.isArray(state.piles) && state.piles.length) prefs.__piles = state.piles;
    if (state.viewMode) prefs.__viewMode = state.viewMode;
    if (typeof state.showSuggestNext === 'boolean') prefs.__showSuggestNext = state.showSuggestNext;
    if (state.columnNotes && Object.keys(state.columnNotes).length) prefs.__columnNotes = state.columnNotes;
    if (state.lastSeed) prefs.__lastSeed = state.lastSeed;
    if (Array.isArray(state.habits) && state.habits.length) prefs.__habits = state.habits;
    if (Array.isArray(state.habitCompletions) && state.habitCompletions.length) prefs.__habitCompletions = state.habitCompletions;
    prefs.__people = Array.isArray(state.people) ? state.people : [];
    if (Array.isArray(state.peopleGroups) && state.peopleGroups.length) prefs.__peopleGroups = state.peopleGroups;
    if (state.journalDaily && typeof state.journalDaily === 'object' && Object.keys(state.journalDaily).length) prefs.__journalDaily = state.journalDaily;
    if (state.journalDailyOpenEntryByDate && typeof state.journalDailyOpenEntryByDate === 'object' && Object.keys(state.journalDailyOpenEntryByDate).length) {
      prefs.__journalDailyOpenEntryByDate = { ...state.journalDailyOpenEntryByDate };
    }
    if (Array.isArray(state.seedReflections) && state.seedReflections.length) prefs.__seedReflections = state.seedReflections;
    const wk = normalizeWeekPlan(state.weekPlan);
    if (wk.anchorWeekStart || Object.keys(wk.days).length) prefs.__weekPlan = wk;
    if (state.lastPlanCommittedAt) prefs.__lastPlanCommittedAt = state.lastPlanCommittedAt;
    if (state.lastCommittedPlanSnapshot && state.lastCommittedPlanSnapshot.anchorWeekStart) {
      prefs.__lastCommittedPlanSnapshot = normalizeWeekPlan(state.lastCommittedPlanSnapshot);
    }
    if (state.previousWeekPlanSnapshot && state.previousWeekPlanSnapshot.anchorWeekStart) {
      prefs.__previousWeekPlanSnapshot = normalizeWeekPlan(state.previousWeekPlanSnapshot);
    }
    if (state.showWeekStrip) prefs.__showWeekStrip = true;
    if (state.otherCollapsedOnDate) prefs.__otherCollapsedOnDate = state.otherCollapsedOnDate;
    return prefs;
  }

  function applyDevicePreferencesToState(prefs) {
    if (!prefs || typeof prefs !== 'object') return;
    if (prefs.__button) { state.buttonColor = prefs.__button; delete prefs.__button; }
    if (prefs.__text) { state.textColor = prefs.__text; delete prefs.__text; }
    if (prefs.custom_labels) { state.customLabels = prefs.custom_labels; delete prefs.custom_labels; }
    if (prefs.category_preset) { state.categoryPreset = prefs.category_preset; delete prefs.category_preset; }
    if (Array.isArray(prefs.__items)) { state.items = prefs.__items; delete prefs.__items; }
    if (Array.isArray(prefs.__todaySuggestionIds)) { state.todaySuggestionIds = prefs.__todaySuggestionIds; delete prefs.__todaySuggestionIds; }
    if (typeof prefs.__completedTodayCount === 'number') delete prefs.__completedTodayCount;
    if (prefs.__lastCompletedDate) delete prefs.__lastCompletedDate;
    if (Array.isArray(prefs.__columnOrder)) { state.columnOrder = prefs.__columnOrder; delete prefs.__columnOrder; }
    if (typeof prefs.__tallyResetHour === 'number' && prefs.__tallyResetHour >= 0 && prefs.__tallyResetHour <= 23) { state.tallyResetHour = prefs.__tallyResetHour; delete prefs.__tallyResetHour; }
    if (Array.isArray(prefs.__piles)) { state.piles = prefs.__piles; delete prefs.__piles; }
    if (prefs.__viewMode === 'piles' || prefs.__viewMode === 'columns') { state.viewMode = prefs.__viewMode; delete prefs.__viewMode; }
    if (typeof prefs.__showSuggestNext === 'boolean') { state.showSuggestNext = prefs.__showSuggestNext; delete prefs.__showSuggestNext; }
    if (prefs.__columnNotes && typeof prefs.__columnNotes === 'object') { state.columnNotes = prefs.__columnNotes; delete prefs.__columnNotes; }
    if (typeof prefs.__lastSeed === 'string') { state.lastSeed = prefs.__lastSeed; delete prefs.__lastSeed; }
    if (Array.isArray(prefs.__habits)) { state.habits = prefs.__habits; delete prefs.__habits; }
    if (Array.isArray(prefs.__habitCompletions)) { state.habitCompletions = prefs.__habitCompletions; delete prefs.__habitCompletions; }
    if (Array.isArray(prefs.__people)) { state.people = prefs.__people; delete prefs.__people; }
    if (Array.isArray(prefs.__peopleGroups) && prefs.__peopleGroups.length) {
      state.peopleGroups = prefs.__peopleGroups.filter(function(g) { return g && typeof g.id === 'string' && typeof g.label === 'string'; });
      delete prefs.__peopleGroups;
    }
    if (prefs.__journalDaily && typeof prefs.__journalDaily === 'object') {
      if (!state.journalDaily || typeof state.journalDaily !== 'object') state.journalDaily = {};
      Object.keys(prefs.__journalDaily).forEach(function(dateKey) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
        var existing = state.journalDaily[dateKey];
        var incoming = prefs.__journalDaily[dateKey];
        state.journalDaily[dateKey] = mergeJournalDayRemote(existing, incoming);
      });
      delete prefs.__journalDaily;
    }
    if (prefs.__journalDailyOpenEntryByDate && typeof prefs.__journalDailyOpenEntryByDate === 'object') {
      if (!state.journalDailyOpenEntryByDate || typeof state.journalDailyOpenEntryByDate !== 'object') state.journalDailyOpenEntryByDate = {};
      Object.assign(state.journalDailyOpenEntryByDate, prefs.__journalDailyOpenEntryByDate);
      delete prefs.__journalDailyOpenEntryByDate;
    }
    if (Array.isArray(prefs.__seedReflections)) {
      var existingRefl = state.seedReflections || [];
      var incomingRefl = prefs.__seedReflections;
      var byTime = {};
      existingRefl.forEach(function(r) { byTime[r.reflectedAt] = r; });
      incomingRefl.forEach(function(r) {
        if (r && (r.reflectedAt == null || !byTime[r.reflectedAt])) byTime[r.reflectedAt || Date.now() + Math.random()] = r;
      });
      state.seedReflections = Object.values(byTime).sort(function(a, b) { return (a.reflectedAt || 0) - (b.reflectedAt || 0); });
      delete prefs.__seedReflections;
    }
    if (prefs.__weekPlan && typeof prefs.__weekPlan === 'object') {
      state.weekPlan = normalizeWeekPlan(prefs.__weekPlan);
      delete prefs.__weekPlan;
    }
    if (typeof prefs.__lastPlanCommittedAt === 'string') {
      state.lastPlanCommittedAt = prefs.__lastPlanCommittedAt;
      delete prefs.__lastPlanCommittedAt;
    }
    if (prefs.__lastCommittedPlanSnapshot && typeof prefs.__lastCommittedPlanSnapshot === 'object') {
      state.lastCommittedPlanSnapshot = normalizeWeekPlan(prefs.__lastCommittedPlanSnapshot);
      delete prefs.__lastCommittedPlanSnapshot;
    }
    if (prefs.__previousWeekPlanSnapshot && typeof prefs.__previousWeekPlanSnapshot === 'object') {
      state.previousWeekPlanSnapshot = normalizeWeekPlan(prefs.__previousWeekPlanSnapshot);
      delete prefs.__previousWeekPlanSnapshot;
    }
    if (prefs.__showWeekStrip === true) { state.showWeekStrip = true; delete prefs.__showWeekStrip; }
    if (typeof prefs.__otherCollapsedOnDate === 'string') {
      state.otherCollapsedOnDate = prefs.__otherCollapsedOnDate;
      delete prefs.__otherCollapsedOnDate;
    }
    if (Object.keys(prefs).length) state.columnColors = prefs;
    saveState(true, true);
  }

  async function runDeviceSyncMigration() {
    if (state.deviceSyncId) return;
    if (!window.talkAbout) return;
    if (state.pairId) {
      state.deviceSyncId = state.pairId + '_' + (state.addedBy || 'Talia');
      try {
        const payload = getPreferencesForDevice();
        const oldPrefs = await window.talkAbout.getUserPreferences(state.pairId, state.addedBy);
        if (oldPrefs && !oldPrefs.error && typeof oldPrefs === 'object' && Object.keys(oldPrefs).length > 0) {
          Object.assign(payload, oldPrefs);
        }
        const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, payload);
        if (error) console.warn('Migration save failed', error);
      } catch (e) {
        console.warn('Migration failed', e);
        const payload = getPreferencesForDevice();
        await window.talkAbout.saveDevicePreferences(state.deviceSyncId, payload);
      }
      if (hasChosenSolo()) {
        state.pairId = null;
        state.addedBy = 'Talia';
        localStorage.removeItem(STORAGE_PREFIX + 'pairId');
        localStorage.setItem(STORAGE_PREFIX + 'addedBy', 'Talia');
      }
    } else {
      state.deviceSyncId = window.talkAbout.generatePairId();
      try {
        const payload = getPreferencesForDevice();
        await window.talkAbout.saveDevicePreferences(state.deviceSyncId, payload);
      } catch (e) {
        console.warn('Seed failed', e);
      }
    }
    saveDeviceSyncState();
  }

  function saveDevicePreferencesToSupabase() {
    if (!window.talkAbout || !state.deviceSyncId) return;
    if (state.savePrefsTimeout) clearTimeout(state.savePrefsTimeout);
    state.savePrefsTimeout = setTimeout(async () => {
      state.savePrefsTimeout = null;
      try {
        const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
        if (error) showToast('Could not sync preferences — will retry when online');
      } catch (e) {
        showToast('Could not sync preferences — will retry when online');
      }
    }, 500);
  }

  async function forcePushToCloud() {
    const btn = document.getElementById('settings-push-now-btn');
    const statusEl = document.getElementById('settings-push-notifications-status');
    const origText = btn ? btn.textContent : '';
    const setStatus = (msg) => {
      if (statusEl) { statusEl.textContent = msg; statusEl.className = 'settings-push-status' + (msg && !msg.startsWith('✓') ? ' settings-push-error' : ''); }
    };
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Pushing…';
    }
    setStatus('');
    if (!window.talkAbout || !state.deviceSyncId) {
      setStatus('No sync code yet — use the app first');
      showToast('No sync code yet — use the app first');
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      return;
    }
    try {
      const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
      if (error) {
        const msg = 'Could not push — ' + (error || 'check connection');
        setStatus(msg);
        showToast(msg);
      } else {
        const msg = '✓ Pushed ' + state.items.length + ' tasks to cloud';
        setStatus(msg);
        showToast(msg);
      }
    } catch (e) {
      const msg = 'Could not push — check connection';
      setStatus(msg);
      showToast(msg);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = origText;
      }
    }
  }

  function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
  }

  function renderSeedTaskOptions(filterText) {
    const taskSelect = document.getElementById('seed-render-task-select');
    const emptyEl = document.getElementById('seed-render-empty');
    if (!taskSelect) return;
    const q = (filterText || '').trim().toLowerCase();
    const filtered = (state.seedRenderTaskCache || []).filter(i => !q || (i.text || '').toLowerCase().includes(q));
    taskSelect.innerHTML = '<option value="">— None —</option>' + filtered.map(i =>
      `<option value="${escapeHtml(i.id)}">${escapeHtml((i.text || '').slice(0, 80))}${(i.text || '').length > 80 ? '…' : ''}</option>`
    ).join('');
    if (emptyEl) emptyEl.style.display = filtered.length ? 'none' : 'block';
  }

  function openSeedRenderModal() {
    const modal = document.getElementById('seed-render-modal');
    const picker = document.getElementById('seed-render-picker');
    const searchInput = document.getElementById('seed-render-task-search');
    const questionInput = document.getElementById('seed-render-question');
    const resultDiv = document.getElementById('seed-render-result');
    const actionsDiv = document.getElementById('seed-render-actions');
    const renderingDiv = document.getElementById('seed-render-rendering');
    const reflectionDiv = document.getElementById('seed-render-reflection');
    const reflectionInput = document.getElementById('seed-render-reflection-input');
    if (!modal) return;
    state.seedRenderTaskCache = sortByTimeBandsAndFriction(getActiveItems());
    state.seedRenderState = null;
    if (picker) picker.style.display = 'block';
    if (renderingDiv) renderingDiv.style.display = 'none';
    if (reflectionDiv) reflectionDiv.style.display = 'none';
    if (reflectionInput) reflectionInput.value = '';
    if (searchInput) searchInput.value = '';
    renderSeedTaskOptions('');
    if (questionInput) questionInput.value = '';
    if (resultDiv) resultDiv.style.display = 'none';
    if (actionsDiv) actionsDiv.style.display = 'block';
    modal.style.display = 'flex';
  }

  function closeSeedRenderModal() {
    const modal = document.getElementById('seed-render-modal');
    if (modal) modal.style.display = 'none';
    state.seedRenderState = null;
  }

  function openConsistencyPanel() {
    const panel = document.getElementById('consistency-panel');
    if (!panel) return;
    panel.style.display = 'block';
    renderConsistencyPanel();
  }

  function closeConsistencyPanel() {
    const panel = document.getElementById('consistency-panel');
    if (panel) panel.style.display = 'none';
  }

  function renderConsistencyPanel() {
    const todayStr = getTodayLocalYYYYMMDD();
    const pct = computeWeightedPct(todayStr);
    const rolling = compute7DayRolling();
    const zone = getZoneLabel(pct);
    const metricsEl = document.getElementById('consistency-metrics');
    const zoneEl = document.getElementById('consistency-zone');
    const trendEl = document.getElementById('consistency-trend');
    const monthEl = document.getElementById('consistency-month');
    const habitsListEl = document.getElementById('consistency-habits-list');
    if (metricsEl) metricsEl.innerHTML = '<p>Weighted today: <strong>' + pct + '%</strong></p><p>7-day rolling: <strong>' + rolling + '%</strong></p>';
    if (zoneEl) zoneEl.textContent = 'Zone: ' + zone;
    const trendDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      trendDays.push({ date: dateStr, pct: computeWeightedPct(dateStr) });
    }
    if (trendEl) trendEl.innerHTML = '<p>Last 7 days</p><p>' + trendDays.map(x => x.date + ': ' + x.pct + '%').join(' · ') + '</p>';
    if (monthEl) monthEl.innerHTML = '<p>Month view (read-only)</p><p class="consistency-month-hint">Days × habits grid would go here.</p>';
    const habits = getHabits();
    const columnSelect = document.getElementById('consistency-habit-column');
    const pileSelect = document.getElementById('consistency-habit-pile');
    if (columnSelect) {
      columnSelect.innerHTML = '<option value="">None</option>' + getCategories().map(c =>
        '<option value="' + c.id + '">' + escapeHtml(getCategoryLabel(c.id)) + '</option>'
      ).join('');
    }
    if (pileSelect) {
      pileSelect.innerHTML = '<option value="">None</option>' + getPiles().map(p =>
        '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>'
      ).join('');
    }
    if (habitsListEl) {
      habitsListEl.innerHTML = habits.length ? habits.map(h => {
        const linkDesc = [h.linkedCategoryId ? getCategoryLabel(h.linkedCategoryId) : null, h.linkedPileId ? getPileName(h.linkedPileId) : null].filter(Boolean);
        const linkText = linkDesc.length === 2 ? 'Both' : linkDesc.length === 1 ? linkDesc[0] : 'Manual only';
        return `<div class="consistency-habit-row" data-habit-id="${h.id}">
          <span class="consistency-habit-name">${escapeHtml(h.name)}</span>
          <span class="consistency-habit-meta">weight ${h.weight || 1} · ${escapeHtml(linkText)}</span>
          <button type="button" class="btn-secondary btn-sm consistency-habit-delete" data-habit-id="${h.id}">Delete</button>
        </div>`;
      }).join('') : '<p class="settings-hint">No habits yet. Add one below.</p>';
      habitsListEl.querySelectorAll('.consistency-habit-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.confirm('Delete this habit?')) {
            deleteHabit(btn.dataset.habitId);
            renderConsistencyPanel();
            renderConsistencySmall();
          }
        });
      });
    }
    const addBtn = document.getElementById('consistency-habit-add');
    if (addBtn) {
      addBtn.replaceWith(addBtn.cloneNode(true));
      document.getElementById('consistency-habit-add').addEventListener('click', () => {
        const nameEl = document.getElementById('consistency-habit-name');
        const weightEl = document.getElementById('consistency-habit-weight');
        const colEl = document.getElementById('consistency-habit-column');
        const pileEl = document.getElementById('consistency-habit-pile');
        const name = nameEl?.value?.trim();
        if (!name) return;
        addHabit(name, weightEl?.value || 3, colEl?.value || null, pileEl?.value || null);
        if (nameEl) nameEl.value = '';
        renderConsistencyPanel();
        renderConsistencySmall();
        showToast('Habit added');
      });
    }
  }

  function collectJournalDayFromDom() {
    const tallyStr = getTallyDateYYYYMMDD();
    const day = normalizeJournalDayValue(state.journalDaily && state.journalDaily[tallyStr]);
    let entries = day.entries.length ? day.entries.map((e) => ({ ...e })) : [];
    const slot = document.getElementById('journal-daily-active-slot');
    const body = document.querySelector('#journal-daily-active-slot .journal-entry-body');
    const activeId = (slot && slot.dataset.entryId) || state.journalDailyOpenEntryByDate[tallyStr];
    if (body && activeId) {
      const html = sanitizeJournalHtml(body.innerHTML);
      if (entries.length === 0) {
        entries = [{ id: activeId, html, updatedAt: Date.now() }];
      } else {
        const idx = entries.findIndex((e) => e.id === activeId);
        if (idx >= 0) {
          entries[idx] = { ...entries[idx], html, updatedAt: Date.now() };
        }
      }
    }
    return normalizeJournalDayValue({ v: 2, entries });
  }

  function journalEntryPreviewLabel(html, index) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    const t = (div.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return t.length > 44 ? t.slice(0, 44) + '…' : t;
    return 'Entry ' + (index + 1);
  }

  function scheduleJournalDailyPersist() {
    if (state.journalDailySaveTimeout) clearTimeout(state.journalDailySaveTimeout);
    state.journalDailySaveTimeout = setTimeout(() => {
      state.journalDailySaveTimeout = null;
      const tallyStr = getTallyDateYYYYMMDD();
      if (!state.journalDaily) state.journalDaily = {};
      state.journalDaily[tallyStr] = collectJournalDayFromDom();
      saveState();
    }, 450);
  }

  function flushJournalDailySave() {
    if (state.journalDailySaveTimeout) {
      clearTimeout(state.journalDailySaveTimeout);
      state.journalDailySaveTimeout = null;
    }
    if (!document.getElementById('journal-daily-entries')) return;
    const tallyStr = getTallyDateYYYYMMDD();
    if (!state.journalDaily) state.journalDaily = {};
    state.journalDaily[tallyStr] = collectJournalDayFromDom();
    saveState();
  }

  function journalSyncPlaceholderClass(el) {
    if (!el) return;
    const t = (el.textContent || '').replace(/\u200b/g, '').trim();
    el.classList.toggle('journal-entry-empty', !t);
  }

  let journalCaretScrollRaf = 0;
  function journalMaybeScrollCaretIntoComfortZone(body) {
    if (!body || !document.body.contains(body)) return;
    const scroller = body.closest('.journal-daily-entries--stoic');
    if (!scroller) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (!body.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) return;
    const scRect = scroller.getBoundingClientRect();
    const targetTop = scRect.top + scRect.height * 0.36;
    const delta = rect.top - targetTop;
    if (Math.abs(delta) > 8) scroller.scrollTop += delta;
  }

  function requestJournalCaretComfortScroll(body) {
    if (!body) return;
    if (journalCaretScrollRaf) cancelAnimationFrame(journalCaretScrollRaf);
    journalCaretScrollRaf = requestAnimationFrame(function() {
      journalCaretScrollRaf = 0;
      journalMaybeScrollCaretIntoComfortZone(body);
    });
  }

  function openJournalPanel() {
    state.journalFocusMode = false;
    const panel = document.getElementById('journal-panel');
    if (!panel) return;
    panel.style.display = 'block';
    renderJournalPanel();
    const firstBody = document.querySelector('#journal-daily-entries .journal-entry-body');
    if (firstBody && state.journalActiveTab === 'daily') firstBody.focus();
  }

  function closeJournalPanel() {
    flushJournalDailySave();
    state.journalFocusMode = false;
    const panel = document.getElementById('journal-panel');
    if (panel) panel.style.display = 'none';
  }

  function setJournalFocusMode(on) {
    state.journalFocusMode = !!on;
    const panel = document.getElementById('journal-panel');
    const header = document.getElementById('journal-panel-header');
    const nav = document.getElementById('journal-nav');
    const focusClose = document.getElementById('journal-focus-close');
    const focusBtn = document.getElementById('journal-focus-btn');
    const dailyActions = document.querySelector('.journal-daily-actions');
    if (panel) panel.classList.toggle('journal-focus-mode', state.journalFocusMode);
    if (header) header.style.display = state.journalFocusMode ? 'none' : '';
    if (nav) nav.style.display = state.journalFocusMode ? 'none' : '';
    if (focusClose) focusClose.style.display = state.journalFocusMode ? 'block' : 'none';
    if (dailyActions) dailyActions.style.display = state.journalFocusMode ? 'none' : '';
    if (focusBtn) focusBtn.textContent = state.journalFocusMode ? 'Exit focus' : 'Focus writing';
    if (state.journalFocusMode) {
      const body = document.querySelector('#journal-daily-entries .journal-entry-body');
      if (body) body.focus();
    }
  }

  function renderJournalDaily() {
    const tallyStr = getTallyDateYYYYMMDD();
    const dateLabel = document.getElementById('journal-daily-date-label');
    if (dateLabel) dateLabel.textContent = 'Today, ' + (getTallyDate() || '').replace(/\s+\d{4}$/, '');
    const wrap = document.getElementById('journal-daily-entries');
    const switcher = document.getElementById('journal-daily-entry-switcher');
    const delBtn = document.getElementById('journal-daily-delete-entry');
    if (!wrap) return;

    const day = normalizeJournalDayValue(state.journalDaily && state.journalDaily[tallyStr]);
    let entryList = day.entries.length ? day.entries.slice() : [{ id: newEntryId(), html: JOURNAL_EMPTY_ENTRY_HTML, updatedAt: Date.now() }];

    let selectedId = state.journalDailyOpenEntryByDate[tallyStr];
    if (!selectedId || !entryList.some((e) => e.id === selectedId)) {
      selectedId = entryList[0].id;
    }
    state.journalDailyOpenEntryByDate[tallyStr] = selectedId;
    const selected = entryList.find((e) => e.id === selectedId) || entryList[0];

    if (switcher) {
      if (entryList.length > 1) {
        switcher.style.display = 'flex';
        switcher.innerHTML = entryList.map((ent, i) => {
          const label = journalEntryPreviewLabel(ent.html, i);
          const active = ent.id === selectedId;
          return '<button type="button" role="tab" class="journal-entry-tab' + (active ? ' journal-entry-tab--active' : '') + '" data-entry-id="' + escapeHtml(ent.id) + '" aria-selected="' + (active ? 'true' : 'false') + '">' + escapeHtml(label) + '</button>';
        }).join('');
      } else {
        switcher.style.display = 'none';
        switcher.innerHTML = '';
      }
    }

    if (delBtn) delBtn.hidden = entryList.length < 2;

    const displayHtml = coerceJournalEntryDisplayHtml(selected.html);
    wrap.innerHTML =
      '<div id="journal-daily-active-slot" class="journal-daily-active-slot" data-entry-id="' + escapeHtml(selected.id) + '">' +
      '<div class="journal-entry-body" contenteditable="true" spellcheck="true" data-placeholder="Title, then your thoughts…" title="Journal entry">' + displayHtml + '</div>' +
      '</div>';

    const body = wrap.querySelector('.journal-entry-body');
    if (body) {
      journalSyncPlaceholderClass(body);
      body.addEventListener('input', function() {
        journalSyncPlaceholderClass(body);
        requestJournalCaretComfortScroll(body);
      });
      body.addEventListener('keyup', function() {
        requestJournalCaretComfortScroll(body);
      });
      body.addEventListener('focusin', function() {
        journalStoicLastBody = body;
        requestJournalCaretComfortScroll(body);
      });
      body.addEventListener('mouseup', function() {
        requestJournalCaretComfortScroll(body);
      });
      journalStoicLastBody = body;
      if (displayHtml !== String(selected.html || '')) scheduleJournalDailyPersist();
    }

    const journalPanel = document.getElementById('journal-panel');
    if (journalPanel && !journalPanel._journalStoicToolbarBound) {
      journalPanel._journalStoicToolbarBound = true;
      const stoicTb = document.getElementById('journal-stoic-toolbar');
      if (stoicTb) {
        stoicTb.addEventListener('mousedown', (e) => {
          if (e.target.closest('.journal-stoic-cmd')) e.preventDefault();
        });
        stoicTb.addEventListener('click', (e) => {
          const btn = e.target.closest('.journal-stoic-cmd');
          if (!btn) return;
          e.preventDefault();
          const b = journalStoicLastBody || document.querySelector('#journal-daily-active-slot .journal-entry-body');
          if (!b) return;
          b.focus();
          const cmd = btn.dataset.cmd;
          const block = btn.dataset.block;
          try {
            if (cmd === 'formatBlock' && block) {
              const tag = block.toLowerCase();
              document.execCommand('formatBlock', false, tag);
            } else if (cmd) {
              document.execCommand(cmd, false, null);
            }
          } catch (err) {
            console.warn('execCommand', cmd || block, err);
          }
          requestJournalCaretComfortScroll(b);
          scheduleJournalDailyPersist();
        });
      }
    }

    const dailyView = document.getElementById('journal-daily-view');
    if (dailyView && !dailyView._journalEntryTabsBound) {
      dailyView._journalEntryTabsBound = true;
      dailyView.addEventListener('click', (e) => {
        const tab = e.target.closest('.journal-entry-tab');
        if (!tab || !tab.dataset.entryId) return;
        const id = tab.dataset.entryId;
        const ts = getTallyDateYYYYMMDD();
        if (id === state.journalDailyOpenEntryByDate[ts]) return;
        flushJournalDailySave();
        state.journalDailyOpenEntryByDate[ts] = id;
        renderJournalDaily();
        const nb = document.querySelector('#journal-daily-active-slot .journal-entry-body');
        if (nb) nb.focus();
      });
    }

    wrap.oninput = () => scheduleJournalDailyPersist();

    setJournalFocusMode(state.journalFocusMode);
  }

  function renderJournalReflections() {
    const listEl = document.getElementById('journal-reflections-list');
    if (!listEl) return;
    const reflections = (state.seedReflections || []).slice().sort(function(a, b) {
      const ta = (a.reflectedAt != null) ? a.reflectedAt : 0;
      const tb = (b.reflectedAt != null) ? b.reflectedAt : 0;
      return tb - ta;
    });
    listEl.innerHTML = reflections.length ? reflections.map(function(r) {
      const d = r.reflectedAt != null ? new Date(r.reflectedAt) : new Date();
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const seedPart = (r.seed && r.seed.trim()) ? ' “‘' + escapeHtml(r.seed.trim()) + '”' : '';
      return '<div class="journal-reflection-item"><span class="journal-reflection-date">' + escapeHtml(dateStr) + '</span>' + seedPart + ' <span class="journal-reflection-text">' + escapeHtml((r.text || '').slice(0, 200)) + ((r.text || '').length > 200 ? '…' : '') + '</span></div>';
    }).join('') : '<p class="empty-state">No reflections yet.</p>';
  }

  function renderJournalCalendar() {
    const picker = document.getElementById('journal-calendar-picker');
    const resultEl = document.getElementById('journal-calendar-result');
    const gridEl = document.getElementById('journal-calendar-month-grid');
    const labelEl = document.getElementById('journal-cal-month-label');
    const prevBtn = document.getElementById('journal-cal-prev');
    const nextBtn = document.getElementById('journal-cal-next');
    if (!resultEl) return;

    const themeColor = state.buttonColor || '#e07a5f';

    function pad(n) {
      return String(n).padStart(2, '0');
    }
    function ymdStr(y, m0, d) {
      return y + '-' + pad(m0 + 1) + '-' + pad(d);
    }
    function parsePickerYM() {
      if (picker && picker.value && /^\d{4}-\d{2}-\d{2}$/.test(picker.value)) {
        const [y, mo] = picker.value.split('-').map(Number);
        return { y, m: mo - 1 };
      }
      const t = new Date();
      return { y: t.getFullYear(), m: t.getMonth() };
    }

    let viewYM = parsePickerYM();

    function showResultForDate(dateStr) {
      if (!dateStr) {
        resultEl.innerHTML = '<p class="empty-state">Pick a date to see journal and reflections.</p>';
        return;
      }
      const jDay = normalizeJournalDayValue(state.journalDaily && state.journalDaily[dateStr]);
      const journalHtml = jDay.entries.map((e) => e.html || '').join('');
      const reflections = (state.seedReflections || []).filter((r) => {
        if (r.reflectedAt == null) return false;
        const d = new Date(r.reflectedAt);
        return ymdStr(d.getFullYear(), d.getMonth(), d.getDate()) === dateStr;
      });
      let html = '<h4>Journal for ' + escapeHtml(dateStr) + '</h4>';
      if (journalHtml.trim()) {
        html += '<div class="journal-calendar-journal journal-rich">' + journalHtml + '</div>';
      } else {
        html += '<p class="empty-state">No journal entries for this day.</p>';
      }
      html += '<h4>Reflections</h4>';
      if (reflections.length) {
        html += reflections.map((r) => {
          const seedPart = (r.seed && r.seed.trim()) ? ' “‘' + escapeHtml(r.seed.trim()) + '”' : '';
          return '<div class="journal-reflection-item">' + seedPart + ' ' + escapeHtml((r.text || '').slice(0, 300)) + ((r.text || '').length > 300 ? '…' : '') + '</div>';
        }).join('');
      } else {
        html += '<p class="empty-state">No reflections for this day.</p>';
      }
      resultEl.innerHTML = html;
    }

    function showResult() {
      const dateStr = picker && picker.value ? picker.value : '';
      showResultForDate(dateStr);
    }

    function renderMonthGrid() {
      if (!gridEl) return;
      const y = viewYM.y;
      const m = viewYM.m;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (labelEl) labelEl.textContent = monthNames[m] + ' ' + y;
      const first = new Date(y, m, 1);
      const startPad = first.getDay();
      const dim = new Date(y, m + 1, 0).getDate();
      const todayYmd = getTallyDateYYYYMMDD();

      let html = '<div class="journal-cal-dow">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) =>
        '<span>' + d + '</span>').join('') + '</div><div class="journal-cal-cells">';
      for (let i = 0; i < startPad; i++) html += '<div class="journal-cal-cell journal-cal-pad"></div>';
      for (let d = 1; d <= dim; d++) {
        const ds = ymdStr(y, m, d);
        const raw = state.journalDaily && state.journalDaily[ds];
        const has = journalDayHasContent(raw);
        const isToday = ds === todayYmd;
        html += '<button type="button" class="journal-cal-day' + (has ? ' journal-cal-has-entry' : '') + (isToday ? ' journal-cal-today' : '') + '" data-date="' + ds + '"' +
          (has ? ' style="--journal-cal-accent:' + themeColor + '"' : '') + '>' + d + '</button>';
      }
      html += '</div>';
      gridEl.innerHTML = html;
      gridEl.querySelectorAll('.journal-cal-day').forEach((b) => {
        b.addEventListener('click', () => {
          const ds = b.dataset.date;
          if (picker) picker.value = ds;
          showResultForDate(ds);
        });
      });
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        viewYM.m -= 1;
        if (viewYM.m < 0) { viewYM.m = 11; viewYM.y -= 1; }
        renderMonthGrid();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        viewYM.m += 1;
        if (viewYM.m > 11) { viewYM.m = 0; viewYM.y += 1; }
        renderMonthGrid();
      };
    }

    if (picker) {
      picker.onchange = () => {
        viewYM = parsePickerYM();
        renderMonthGrid();
        showResult();
      };
    }

    const todayStr = getTallyDateYYYYMMDD();
    if (picker && !picker.value) picker.value = todayStr;

    viewYM = parsePickerYM();
    renderMonthGrid();
    setTimeout(() => {
      if (picker && !picker.value) picker.value = getTallyDateYYYYMMDD();
      showResult();
    }, 0);
  }

  function renderJournalPanel() {
    setJournalFocusMode(state.journalFocusMode);
    const dailyView = document.getElementById('journal-daily-view');
    const reflectionsView = document.getElementById('journal-reflections-view');
    const calendarView = document.getElementById('journal-calendar-view');
    [dailyView, reflectionsView, calendarView].forEach(function(el) {
      if (el) {
        el.classList.remove('journal-view-visible');
        el.classList.add('journal-view-hidden');
      }
    });
    if (state.journalActiveTab === 'daily') {
      if (dailyView) {
        dailyView.classList.remove('journal-view-hidden');
        dailyView.classList.add('journal-view-visible');
      }
      renderJournalDaily();
    } else if (state.journalActiveTab === 'reflections') {
      if (reflectionsView) {
        reflectionsView.classList.remove('journal-view-hidden');
        reflectionsView.classList.add('journal-view-visible');
      }
      renderJournalReflections();
    } else {
      if (calendarView) {
        calendarView.classList.remove('journal-view-hidden');
        calendarView.classList.add('journal-view-visible');
      }
      renderJournalCalendar();
    }
  }

  async function saveSettingsAndClose() {
    try {
      const newPreset = (document.querySelector('input[name="category-preset"]:checked') || {}).value || 'generic';
      const oldPreset = state.categoryPreset || 'generic';
      if (newPreset !== oldPreset) {
        const mapKey = oldPreset + '_to_' + newPreset;
        const map = PRESET_MIGRATION[mapKey];
        if (map) {
          state.items.forEach(item => {
            if (map[item.category]) item.category = map[item.category];
          });
          if (state.columnNotes && typeof state.columnNotes === 'object') {
            const migrated = {};
            Object.keys(state.columnNotes).forEach(k => {
              const newKey = map[k];
              migrated[newKey != null ? newKey : k] = state.columnNotes[k];
            });
            state.columnNotes = migrated;
          }
          if (Array.isArray(state.habits)) {
            state.habits.forEach(h => {
              if (h.linkedCategoryId && map[h.linkedCategoryId]) h.linkedCategoryId = map[h.linkedCategoryId];
            });
          }
          state.categoryPreset = newPreset;
          state.customLabels = {};
          const newCats = CATEGORY_PRESETS[newPreset];
          state.lastCategory = (newCats && newCats[0]) ? newCats[0].id : 'life';
        }
      }
      const displayNameInp = document.getElementById('settings-display-name');
      if (displayNameInp) state.displayName = displayNameInp.value.trim();

      const tallyResetInp = document.getElementById('settings-tally-reset-hour');
      if (tallyResetInp) {
        const h = parseInt(tallyResetInp.value, 10);
        if (!isNaN(h) && h >= 0 && h <= 23) state.tallyResetHour = h;
      }

      const showSuggestNextInp = document.getElementById('settings-show-suggest-next');
      if (showSuggestNextInp) state.showSuggestNext = showSuggestNextInp.checked;

      const btnColorInp = document.getElementById('settings-button-color');
      const textColorInp = document.getElementById('settings-text-color');
      if (btnColorInp && btnColorInp.value) state.buttonColor = btnColorInp.value;
      if (textColorInp && textColorInp.value) state.textColor = textColorInp.value;

      const inputs = document.querySelectorAll('#settings-column-inputs input[data-cat]');
      inputs.forEach(inp => {
        const val = inp.value.trim();
        if (val) state.customLabels[inp.dataset.cat] = val;
        else delete state.customLabels[inp.dataset.cat];
      });

      const colorsContainer = document.getElementById('settings-column-colors');
      if (colorsContainer) {
        colorsContainer.querySelectorAll('.color-input[data-cat]').forEach(inp => {
          const cat = inp.dataset.cat;
          if (cat && cat !== '__button' && cat !== '__text') state.columnColors[cat] = inp.value;
        });
        colorsContainer.querySelectorAll('.color-hex-input[data-cat]').forEach(inp => {
          const cat = inp.dataset.cat;
          const val = inp.value.trim();
          if (cat && cat !== '__button' && cat !== '__text' && /^#[0-9a-fA-F]{6}$/.test(val)) {
            state.columnColors[cat] = val;
          }
        });
      }

      applyThemeColors();
      saveState();
      updateCategorySelectOptions();
      renderColumns();
      const badge = document.getElementById('pair-badge');
      if (badge) {
        if (state.pairId) badge.textContent = state.pairId + ' · ' + ((state.displayName || '').trim() || state.addedBy);
        else badge.textContent = (state.displayName || '').trim() || 'Solo';
      }
      closeSettingsModal();
      if (window.talkAbout && state.deviceSyncId) {
        const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
        if (error) {
          showToast('Settings saved locally. Could not sync to cloud — ' + (error || 'Supabase not configured'));
        } else {
          showToast('Settings saved');
        }
      } else {
        showToast('Settings saved');
      }
    } catch (e) {
      console.warn('Save settings failed', e);
      showToast('Could not save settings — ' + (e.message || 'try again'));
    }
  }

  function applySmartFields() {
    const textEl = document.getElementById('task-input');
    if (!textEl) return;
    const text = textEl.value;
    const cat = detectCategory(text);
    if (cat) document.getElementById('category-select').value = cat;
    const deadline = extractDeadline(text);
    if (deadline) document.getElementById('deadline-input').value = deadline;
    const priority = extractPriority(text);
    if (priority) {
      const sel = document.getElementById('priority-select');
      if (sel && sel.querySelector(`option[value="${priority}"]`)) sel.value = priority;
    }
    const recurrence = extractRecurrence(text);
    if (recurrence) {
      const sel = document.getElementById('recurrence-select');
      if (sel && sel.querySelector(`option[value="${recurrence}"]`)) sel.value = recurrence;
    }
    const doingDate = extractDoingDate(text);
    // If doing-date matches the extracted deadline, treat as due-only (avoid past doing-date auto-archive).
    if (doingDate && doingDate !== deadline) {
      const inp = document.getElementById('doing-date-input');
      if (inp) inp.value = doingDate;
    }
    const friction = extractFriction(text);
    if (friction) {
      const sel = document.getElementById('friction-select');
      if (sel && sel.querySelector(`option[value="${friction}"]`)) sel.value = friction;
    }
    // Soft-detect pile/person by matching known names.
    const t = (text || '').toLowerCase();
    const piles = (state.piles || []).slice();
    const people = (state.people || []).slice();
    const pile = piles.find(p => p?.name && t.includes(String(p.name).toLowerCase()));
    if (pile) {
      const sel = document.getElementById('pile-select');
      if (sel && sel.querySelector(`option[value="${pile.id}"]`)) sel.value = pile.id;
    }
    const person = people.find(p => p?.name && t.includes(String(p.name).toLowerCase()));
    if (person) {
      const sel = document.getElementById('person-select');
      if (sel && sel.querySelector(`option[value="${person.id}"]`)) sel.value = person.id;
    }
    const firstStepMatch = (text || '').match(/\b(?:first\s+step|start\s+by|start)\s*:\s*(.+)$/i);
    if (firstStepMatch && firstStepMatch[1]) {
      const inp = document.getElementById('first-step-input');
      if (inp && !inp.value) inp.value = firstStepMatch[1].trim().slice(0, 200);
    }
  }

  function applySmartFieldsToEdit() {
    const textEl = document.getElementById('edit-text');
    if (!textEl) return;
    const text = textEl.value;
    const cat = detectCategory(text);
    if (cat) {
      const sel = document.getElementById('edit-category');
      if (sel && sel.querySelector(`option[value="${cat}"]`)) sel.value = cat;
    }
    const deadline = extractDeadline(text);
    if (deadline) {
      const inp = document.getElementById('edit-deadline');
      if (inp) inp.value = deadline;
    }
    const priority = extractPriority(text);
    if (priority) {
      const sel = document.getElementById('edit-priority');
      if (sel && sel.querySelector(`option[value="${priority}"]`)) sel.value = priority;
    }
    const recurrence = extractRecurrence(text);
    if (recurrence) {
      const sel = document.getElementById('edit-recurrence');
      if (sel && sel.querySelector(`option[value="${recurrence}"]`)) sel.value = recurrence;
    }
    const doingDate = extractDoingDate(text);
    if (doingDate && doingDate !== deadline) {
      const inp = document.getElementById('edit-doing-date');
      if (inp) inp.value = doingDate;
    }
    const friction = extractFriction(text);
    if (friction) {
      const sel = document.getElementById('edit-friction');
      if (sel && sel.querySelector(`option[value="${friction}"]`)) sel.value = friction;
    }
  }

  function addSingle() {
    const submitBtn = document.getElementById('submit-single');
    if (submitBtn?.disabled) return;
    const textEl = document.getElementById('task-input');
    if (!textEl) return;
    const text = textEl.value.trim();
    if (!text) return;
    const category = document.getElementById('category-select').value;
    const deadline = document.getElementById('deadline-input').value || null;
    const doingDateEl = document.getElementById('doing-date-input');
    const doingDate = (doingDateEl && doingDateEl.value) ? doingDateEl.value : null;
    const priority = document.getElementById('priority-select').value;
    const recurrenceEl = document.getElementById('recurrence-select');
    const recurrence = (recurrenceEl && recurrenceEl.value) ? recurrenceEl.value : null;
    const pileEl = document.getElementById('pile-select');
    const pileId = (pileEl && pileEl.value) ? pileEl.value : null;
    const frictionEl = document.getElementById('friction-select');
    const friction = (frictionEl && frictionEl.value) ? frictionEl.value : null;
    const firstStepEl = document.getElementById('first-step-input');
    const firstStep = (firstStepEl && firstStepEl.value) ? firstStepEl.value.trim() : null;
    if (submitBtn) submitBtn.disabled = true;
    try {
      state.lastCategory = category;
      const personEl = document.getElementById('person-select');
      const personId = (personEl && personEl.value) ? personEl.value : null;
      const item = createItem(text, category, deadline, priority, recurrence, null, doingDate, pileId, friction, personId);
      if (firstStep) item.firstStep = firstStep;
      state.items.push(item);
      saveState();
      closeAddModal();
      renderColumns();
    } catch (e) {
      console.warn('Add single failed', e);
      showToast('Could not add task — ' + (e?.message || 'try again'));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function openEditModal(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.editingId = id;
    document.getElementById('edit-text').value = item.text;
    document.getElementById('edit-category').innerHTML = getCategories().map(c =>
      `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${escapeHtml(getCategoryLabel(c.id))}</option>`
    ).join('');
    updatePileSelectOptions('edit-pile', item.pileId || '');
    updatePersonSelectOptions('edit-person', item.personId || '');
    const editFriction = document.getElementById('edit-friction');
    if (editFriction) editFriction.value = item.friction || '';
    const editFirstStep = document.getElementById('edit-first-step');
    if (editFirstStep) editFirstStep.value = item.firstStep || '';
    document.getElementById('edit-deadline').value = item.deadline || '';
    const editDoingEl = document.getElementById('edit-doing-date');
    if (editDoingEl) editDoingEl.value = item.doingDate || '';
    document.getElementById('edit-priority').innerHTML = PRIORITIES.map(p =>
      `<option value="${p}" ${p === item.priority ? 'selected' : ''}>${p}</option>`
    ).join('');
    document.getElementById('edit-modal').style.display = 'flex';
  }

  function saveEdit() {
    const id = state.editingId;
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.text = document.getElementById('edit-text').value.trim();
    item.category = document.getElementById('edit-category').value;
    const editPileEl = document.getElementById('edit-pile');
    item.pileId = (editPileEl && editPileEl.value) ? editPileEl.value : null;
    const editPersonEl = document.getElementById('edit-person');
    item.personId = (editPersonEl && editPersonEl.value) ? editPersonEl.value : null;
    const editFrictionEl = document.getElementById('edit-friction');
    item.friction = (editFrictionEl && editFrictionEl.value) ? editFrictionEl.value : null;
    const editFirstStepEl = document.getElementById('edit-first-step');
    item.firstStep = (editFirstStepEl && editFirstStepEl.value.trim()) ? editFirstStepEl.value.trim() : null;
    item.deadline = document.getElementById('edit-deadline').value || null;
    const editDoingEl = document.getElementById('edit-doing-date');
    item.doingDate = (editDoingEl && editDoingEl.value) ? editDoingEl.value : null;
    const editRecurrence = document.getElementById('edit-recurrence');
    item.recurrence = (editRecurrence && editRecurrence.value) ? editRecurrence.value : null;
    item.priority = document.getElementById('edit-priority').value;
    state.editingId = null;
    document.getElementById('edit-modal').style.display = 'none';
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();
  }

  function toggleFocusMode() {
    const focusMode = document.getElementById('focus-mode');
    const overview = document.getElementById('overview');
    const todayBar = document.getElementById('today-bar');
    if (focusMode && overview && todayBar) {
      if (focusMode.style.display === 'none') {
        focusMode.style.display = 'block';
        overview.style.display = 'none';
        todayBar.style.display = 'none';
        renderFocusList();
      } else {
        focusMode.style.display = 'none';
        overview.style.display = 'block';
        todayBar.style.display = 'block';
      }
    }
  }

  function exportBackup() {
    const data = buildBackupPayload(state);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'parking-lot-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function isValidBackupItem(item) {
    return item && typeof item === 'object' && typeof (item.text ?? item.id) === 'string';
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid backup format');
        if (data.items) {
          if (!Array.isArray(data.items)) throw new Error('Items must be an array');
          state.items = data.items.filter(isValidBackupItem).map((item, idx) => ({
            ...item,
            id: item.id || 'id_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).slice(2),
            text: (item.text || '').trim() || 'Untitled',
            category: item.category || 'life',
            archived: !!item.archived,
            parkedAt: item.parkedAt || Date.now()
          }));
        }
        if (data.todaySuggestionIds) {
          if (!Array.isArray(data.todaySuggestionIds)) throw new Error('todaySuggestionIds must be an array');
          const validIds = new Set(state.items.map(i => i.id));
          state.todaySuggestionIds = data.todaySuggestionIds.filter(id => typeof id === 'string' && validIds.has(id));
        }
        if (data.weekPlan && typeof data.weekPlan === 'object') {
          state.weekPlan = normalizeWeekPlan(data.weekPlan);
        }
        if (typeof data.lastPlanCommittedAt === 'string' || data.lastPlanCommittedAt === null) {
          state.lastPlanCommittedAt = data.lastPlanCommittedAt;
        }
        if (data.lastCommittedPlanSnapshot && typeof data.lastCommittedPlanSnapshot === 'object') {
          state.lastCommittedPlanSnapshot = normalizeWeekPlan(data.lastCommittedPlanSnapshot);
        }
        if (data.previousWeekPlanSnapshot && typeof data.previousWeekPlanSnapshot === 'object') {
          state.previousWeekPlanSnapshot = normalizeWeekPlan(data.previousWeekPlanSnapshot);
        }
        if (typeof data.showWeekStrip === 'boolean') state.showWeekStrip = data.showWeekStrip;
        if (typeof data.otherCollapsedOnDate === 'string') state.otherCollapsedOnDate = data.otherCollapsedOnDate;
        state.weekPlan = pruneWeekPlan(state.items, state.weekPlan);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
        showToast('Import complete');
      } catch (e) {
        showToast(e instanceof SyntaxError ? 'Import failed: invalid JSON' : (e.message || 'Import failed'));
      }
    };
    reader.readAsText(file);
  }

  function openArchiveModal() {
    const archived = state.items.filter(i => i.archived).sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
    const list = document.getElementById('archive-list');
    if (!list) return;
    list.innerHTML = archived.length ? archived.map(item => {
      const date = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const cat = getCategories().find(c => c.id === item.category);
      return `<div class="archive-item">${escapeHtml(item.text)} <span class="archive-date">${escapeHtml(getCategoryLabel(item.category))} — ${escapeHtml(date)}</span></div>`;
    }).join('') : '<div class="empty-state">No completed items yet</div>';
    document.getElementById('archive-modal').style.display = 'flex';
  }

  function computeAnalytics() {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const parked = state.items.filter(i => !i.archived && i.parkedAt >= weekAgo).length;
    const completed = state.items.filter(i => i.archived && i.archivedAt >= weekAgo).length;
    const byCat = {};
    state.items.filter(i => i.archived && i.archivedAt >= weekAgo).forEach(i => {
      byCat[i.category] = (byCat[i.category] || 0) + 1;
    });
    const catStr = Object.entries(byCat).map(([k, v]) => {
      return `${getCategoryLabel(k)}: ${v}`;
    }).join(', ');
    return `Parked this week: ${parked}\nCompleted from Today's Suggestions: ${completed}${catStr ? '\nBy category: ' + catStr : ''}`;
  }

  function openAnalytics() {
    const textEl = document.getElementById('analytics-text');
    if (textEl) textEl.textContent = computeAnalytics();
    const panel = document.getElementById('analytics-panel');
    if (panel) panel.style.display = 'block';
  }

  function openEmailTriage() {
    if (!window.talkAbout || !hasSupabaseConfig()) {
      showToast('Email triage unavailable — connect Supabase first');
      return;
    }
    renderEmailTriage(true);
    const triagePairId = state.pairId || 'solo_default';
    const triageAddedBy = state.addedBy;
    window.talkAbout.getLastAgentRun(triagePairId, triageAddedBy).then(run => {
      state.lastAgentRun = run;
      if (!run && !state.pairId && triageAddedBy) {
        window.talkAbout.getLastAgentRun(triagePairId, null).then(fallbackRun => {
          if (fallbackRun) state.lastAgentRun = fallbackRun;
          renderEmailTriage(false);
        });
      } else {
        renderEmailTriage(false);
      }
    });
    window.talkAbout.getEmailTasks(triagePairId, triageAddedBy).then(({ data, error }) => {
      state.emailTriageItems = error ? [] : (data || []);
      if (state.emailTriageItems.length === 0 && !state.pairId && triageAddedBy) {
        window.talkAbout.getEmailTasks(triagePairId, null).then(({ data: fallbackData }) => {
          if (fallbackData?.length) state.emailTriageItems = fallbackData;
          renderEmailTriage(false);
        });
      } else {
        renderEmailTriage(false);
      }
    });
  }

  function addTalkAbout() {
    const input = document.getElementById('talk-about-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (!window.talkAbout || !state.pairId) {
      showToast('Connect to sync first');
      return;
    }
    window.talkAbout.addTalkAbout(state.pairId, text, state.addedBy).then(({ data, error }) => {
      if (error) showToast(error === 'Supabase not configured' ? 'Add Supabase URL and key to config.js' : 'Failed to add');
      else {
        input.value = '';
        if (data) {
          state.talkAboutItems = [...state.talkAboutItems, data];
          renderTalkAbout();
        }
        showToast('Added');
      }
    });
  }

  /** Avoid blocking main UI on slow/missing Supabase (E2E + flaky networks). */
  async function safeGetDevicePreferences(deviceSyncId) {
    if (typeof window !== 'undefined' && window.__E2E__) {
      return { __skipped: true };
    }
    if (!window.talkAbout || !deviceSyncId) return { __skipped: true };
    const ms = 12000;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('getDevicePreferences timed out after', ms, 'ms');
        resolve({ error: 'timeout' });
      }, ms);
      window.talkAbout.getDevicePreferences(deviceSyncId).then((prefs) => {
        clearTimeout(timer);
        resolve(prefs);
      }).catch((e) => {
        clearTimeout(timer);
        resolve({ error: e && e.message ? e.message : String(e) });
      });
    });
  }

  async function showMainApp() {
    document.getElementById('entry-screen').style.display = 'none';
    document.getElementById('pair-setup').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('floating-buttons').style.display = 'flex';
    const badge = document.getElementById('pair-badge');
    const talkSection = document.getElementById('talk-about-section');
    const linkPartnerBtn = document.getElementById('link-partner-btn');
    if (state.pairId) {
      const name = (state.displayName || '').trim() || state.addedBy;
      if (badge) badge.textContent = state.pairId + ' · ' + name;
      if (talkSection) talkSection.style.display = 'block';
      if (linkPartnerBtn) linkPartnerBtn.style.display = 'none';
    } else {
      const name = (state.displayName || '').trim() || 'Solo';
      if (badge) badge.textContent = name;
      if (talkSection) talkSection.style.display = 'none';
      if (linkPartnerBtn) linkPartnerBtn.style.display = 'block';
    }
    loadState();
    await runDeviceSyncMigration();
    try {
      if (window.talkAbout && state.deviceSyncId) {
        const prefs = await safeGetDevicePreferences(state.deviceSyncId);
        if (prefs?.__skipped) {
          /* E2E or no-op */
        } else if (prefs?.error) {
          showToast('Could not load preferences — using local settings');
        } else {
          applyDevicePreferencesToState(prefs);
        }
      }
    } catch (e) {
      console.warn('Preferences fetch failed', e);
      showToast('Using local settings');
    }
    applyThemeColors();
    updateCategorySelectOptions();
    ensureViewToggle();
    renderColumns();
    renderTodayList();
    const weekStripToggle = document.getElementById('show-week-strip-toggle');
    if (weekStripToggle) weekStripToggle.checked = !!state.showWeekStrip;
    renderWeekStrip();
    renderTalkAbout();
    renderEmailTriage(false);
    updateTally();
    updateAddToSuggestionsBtn();
    attachMainAppRealtime({
      state,
      win: window,
      applyDevicePreferencesToState,
      refreshUIAfterRemotePrefs,
      renderTalkAbout,
      renderEmailTriage
    });
  }


  function ensureViewToggle() {
    const header = document.querySelector('.columns-header');
    if (!header) return;
    let toggle = header.querySelector('.view-toggle');
    if (toggle) return;
    toggle = document.createElement('div');
    toggle.className = 'view-toggle';
    toggle.setAttribute('role', 'tablist');
    toggle.setAttribute('aria-label', 'View mode');
    toggle.innerHTML = `
      <button type="button" id="view-columns-btn" class="view-toggle-btn" data-view="columns" aria-selected="false">Columns</button>
      <button type="button" id="view-piles-btn" class="view-toggle-btn" data-view="piles" aria-selected="false">Piles</button>
    `;
    const search = header.querySelector('#search-input');
    if (search && search.parentNode == header) header.insertBefore(toggle, search);
    else header.appendChild(toggle);
  }

  function bindEvents() {
    ensureViewToggle();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = state.searchQuery || '';
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value;
        renderColumns();
      });
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      state.drillDownCategory = null;
      backBtn.style.display = 'none';
      renderColumns();
    });

    const viewColumnsBtn = document.getElementById('view-columns-btn');
    const viewPilesBtn = document.getElementById('view-piles-btn');
    if (viewColumnsBtn) viewColumnsBtn.addEventListener('click', () => {
      state.viewMode = 'columns';
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      renderColumns();
    });
    if (viewPilesBtn) viewPilesBtn.addEventListener('click', () => {
      state.viewMode = 'piles';
      state.openColumnNoteId = null;
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      renderColumns();
    });

    const columnsEl = document.getElementById('columns');
    if (columnsEl) {
      columnsEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      columnsEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const column = e.target.closest('.column');
        if (!column) return;
        const id = e.dataTransfer.getData('text/plain');
        const item = state.items.find(i => i.id === id);
        if (!item) return;
        if (state.viewMode === 'piles') {
          const newPileId = column.dataset.uncategorized === 'true' ? null : (column.dataset.pileId || null);
          if (item.pileId !== newPileId) {
            item.pileId = newPileId;
            saveState();
            renderColumns();
          }
        } else {
          const newCat = column.dataset.category;
          if (newCat && item.category !== newCat) {
            item.category = newCat;
            saveState();
            renderColumns();
          }
        }
      });
    }

    const todayListEl = document.getElementById('today-list');
    if (todayListEl) {
      todayListEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        todayListEl.classList.add('drag-over');
      });
      todayListEl.addEventListener('dragleave', (e) => {
        if (!todayListEl.contains(e.relatedTarget)) todayListEl.classList.remove('drag-over');
      });
      todayListEl.addEventListener('drop', (e) => {
        e.preventDefault();
        todayListEl.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const item = state.items.find(i => i.id === id);
        if (!item || item.archived) return;
        if (state.todaySuggestionIds.includes(id)) return;
        processAddToTodayQueue([id]);
        updateAddToSuggestionsBtn();
      });
    }

    const planWeekHeaderBtn = document.getElementById('plan-week-header-btn');
    if (planWeekHeaderBtn) planWeekHeaderBtn.addEventListener('click', () => weekPlanningApi.openPlanningEntry({}));
    const sidebarPlanWeek = document.getElementById('sidebar-plan-week');
    if (sidebarPlanWeek) sidebarPlanWeek.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay') && (document.getElementById('sidebar-overlay').style.display = 'none');
      document.body.classList.remove('sidebar-open');
      weekPlanningApi.openPlanningEntry({});
    });
    const sidebarWeekView = document.getElementById('sidebar-week-view');
    if (sidebarWeekView) sidebarWeekView.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay') && (document.getElementById('sidebar-overlay').style.display = 'none');
      document.body.classList.remove('sidebar-open');
      const panel = document.getElementById('week-view-panel');
      if (panel) {
        weekPlanningApi.renderWeekViewPanel();
        panel.style.display = 'flex';
      }
    });
    const closeWeekView = document.getElementById('close-week-view');
    if (closeWeekView) closeWeekView.addEventListener('click', () => {
      const panel = document.getElementById('week-view-panel');
      if (panel) panel.style.display = 'none';
    });
    const weekStripToggle = document.getElementById('show-week-strip-toggle');
    if (weekStripToggle) {
      weekStripToggle.checked = !!state.showWeekStrip;
      weekStripToggle.addEventListener('change', () => {
        state.showWeekStrip = weekStripToggle.checked;
        saveState();
        if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
        renderWeekStrip();
      });
    }

    const addToSuggestionsBtn = document.getElementById('add-to-suggestions-btn');
    if (addToSuggestionsBtn) addToSuggestionsBtn.addEventListener('click', addToSuggestions);
    const addToSuggestionsClear = document.getElementById('add-to-suggestions-clear');
    if (addToSuggestionsClear) addToSuggestionsClear.addEventListener('click', clearAddToSuggestionsSelection);

    const clearBtn = document.getElementById('clear-suggestions');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      state.todaySuggestionIds = [];
      saveState();
      renderTodayList();
      renderFocusList();
      renderColumns();
    });

    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    function openSidebar() {
      if (sidebar) sidebar.classList.add('open');
      if (sidebarOverlay) sidebarOverlay.style.display = 'block';
      document.body.classList.add('sidebar-open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    }
    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.style.display = 'none';
      document.body.classList.remove('sidebar-open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', closeSidebar);
    });

    const linkPartnerBtn = document.getElementById('link-partner-btn');
    if (linkPartnerBtn) linkPartnerBtn.addEventListener('click', () => {
      closeSidebar();
      openLinkPartnerModal();
    });

    const addBtn = document.getElementById('add-btn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    const shortcutsOverlay = document.getElementById('shortcuts-overlay');
    const closeShortcutsBtn = document.getElementById('close-shortcuts');
    function openShortcutsOverlay() {
      if (shortcutsOverlay) { shortcutsOverlay.style.display = 'flex'; shortcutsOverlay.setAttribute('aria-hidden', 'false'); }
    }
    function closeShortcutsOverlay() {
      if (shortcutsOverlay) { shortcutsOverlay.style.display = 'none'; shortcutsOverlay.setAttribute('aria-hidden', 'true'); }
    }
    if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', closeShortcutsOverlay);
    if (shortcutsOverlay) shortcutsOverlay.addEventListener('click', (e) => { if (e.target === shortcutsOverlay) closeShortcutsOverlay(); });

    function isTypingInFormField(target) {
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return false;
      if (target.matches('input, textarea, select')) return true;
      if (target.isContentEditable) return true;
      return !!(target.closest && target.closest('[contenteditable="true"]'));
    }

    document.addEventListener('keydown', (e) => {
      const mainApp = document.getElementById('main-app');
      if (!mainApp || mainApp.style.display === 'none') return;
      const inFormOrRichText = isTypingInFormField(e.target);
      if (e.key === 'n' || e.key === 'N') {
        if (inFormOrRichText) return;
        e.preventDefault();
        openAddModal();
      } else if (e.key === 'Escape') {
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') {
          closeShortcutsOverlay();
        } else if (document.body.classList.contains('sidebar-open')) {
          closeSidebar();
        } else {
          const modals = ['add-modal', 'edit-modal', 'add-from-talk-modal', 'archive-modal', 'settings-modal', 'link-partner-modal', 'seed-render-modal'];
          const panels = ['analytics-panel', 'email-triage-section'];
          for (const id of modals) {
            const m = document.getElementById(id);
            if (m && m.style.display === 'flex') {
              if (id === 'add-modal') closeAddModal();
              else if (id === 'edit-modal') { m.style.display = 'none'; state.editingId = null; }
              else if (id === 'add-from-talk-modal') closeAddFromTalkModal();
              else if (id === 'archive-modal') m.style.display = 'none';
              else if (id === 'settings-modal') closeSettingsModal();
              else if (id === 'link-partner-modal') closeLinkPartnerModal();
              else if (id === 'seed-render-modal') closeSeedRenderModal();
              return;
            }
          }
          for (const id of panels) {
            const p = document.getElementById(id);
            if (p && p.style.display === 'block') { p.style.display = 'none'; return; }
          }
          const consistencyPanel = document.getElementById('consistency-panel');
          if (consistencyPanel && consistencyPanel.style.display === 'block') {
            closeConsistencyPanel();
            return;
          }
          const journalPanel = document.getElementById('journal-panel');
          if (journalPanel && journalPanel.style.display === 'block') {
            if (state.journalFocusMode) {
              setJournalFocusMode(false);
              if (document.getElementById('journal-focus-btn')) document.getElementById('journal-focus-btn').focus();
            } else {
              closeJournalPanel();
            }
            return;
          }
          const relationshipsPanel = document.getElementById('relationships-panel');
          if (relationshipsPanel && relationshipsPanel.style.display === 'block') {
            if (state.relationshipsDetailPersonId) {
              state.relationshipsDetailPersonId = null;
              renderRelationshipsPanel();
            } else {
              closeRelationshipsPanel();
            }
            return;
          }
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inFormOrRichText) return;
        e.preventDefault();
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') closeShortcutsOverlay();
        else openShortcutsOverlay();
      }
    });

    const focusBtn = document.getElementById('focus-btn');
    if (focusBtn) focusBtn.addEventListener('click', toggleFocusMode);
    const seedFab = document.getElementById('seed-fab');
    if (seedFab) seedFab.addEventListener('click', openSeedRenderModal);

    document.querySelectorAll('.fab-wrap').forEach(wrap => {
      wrap.addEventListener('mouseenter', () => wrap.classList.add('fab-help-visible'));
      wrap.addEventListener('mouseleave', () => wrap.classList.remove('fab-help-visible'));
    });

    const closeAdd = document.getElementById('close-add');
    if (closeAdd) closeAdd.addEventListener('click', closeAddModal);

    const addModal = document.getElementById('add-modal');
    if (addModal) addModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-modal') closeAddModal();
    });

    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.addEventListener('input', applySmartFields);
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addSingle();
      });
    }

    const submitSingle = document.getElementById('submit-single');
    if (submitSingle) submitSingle.addEventListener('click', addSingle);
    const submitQuick = document.getElementById('submit-quick');
    if (submitQuick) submitQuick.addEventListener('click', addQuick);
    const tabSingle = document.getElementById('tab-single');
    const tabQuick = document.getElementById('tab-quick');
    const tabVoice = document.getElementById('tab-voice');
    if (tabSingle) tabSingle.addEventListener('click', () => {
      tabSingle.classList.add('active');
      if (tabQuick) tabQuick.classList.remove('active');
      if (tabVoice) tabVoice.classList.remove('active');
      const singleAdd = document.getElementById('single-add');
      const quickAdd = document.getElementById('quick-add');
      const voiceAdd = document.getElementById('voice-add');
      if (singleAdd) singleAdd.style.display = 'block';
      if (quickAdd) quickAdd.style.display = 'none';
      if (voiceAdd) voiceAdd.style.display = 'none';
    });
    if (tabQuick) tabQuick.addEventListener('click', () => {
      if (tabSingle) tabSingle.classList.remove('active');
      tabQuick.classList.add('active');
      if (tabVoice) tabVoice.classList.remove('active');
      const singleAdd = document.getElementById('single-add');
      const quickAdd = document.getElementById('quick-add');
      const voiceAdd = document.getElementById('voice-add');
      if (singleAdd) singleAdd.style.display = 'none';
      if (quickAdd) quickAdd.style.display = 'block';
      if (voiceAdd) voiceAdd.style.display = 'none';
    });
    if (tabVoice) tabVoice.addEventListener('click', () => {
      if (tabSingle) tabSingle.classList.remove('active');
      if (tabQuick) tabQuick.classList.remove('active');
      tabVoice.classList.add('active');
      const singleAdd = document.getElementById('single-add');
      const quickAdd = document.getElementById('quick-add');
      const voiceAdd = document.getElementById('voice-add');
      if (singleAdd) singleAdd.style.display = 'none';
      if (quickAdd) quickAdd.style.display = 'none';
      if (voiceAdd) voiceAdd.style.display = 'block';
    });
    initVoiceMulti();

    const closeEdit = document.getElementById('close-edit');
    if (closeEdit) closeEdit.addEventListener('click', () => {
      document.getElementById('edit-modal').style.display = 'none';
      state.editingId = null;
    });

    const editModal = document.getElementById('edit-modal');
    if (editModal) editModal.addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') {
        editModal.style.display = 'none';
        state.editingId = null;
      }
    });

    const saveEditBtn = document.getElementById('save-edit');
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveEdit);

    const closeAddFromTalk = document.getElementById('close-add-from-talk');
    if (closeAddFromTalk) closeAddFromTalk.addEventListener('click', closeAddFromTalkModal);
    const addFromTalkModal = document.getElementById('add-from-talk-modal');
    if (addFromTalkModal) addFromTalkModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-from-talk-modal') closeAddFromTalkModal();
    });
    const submitAddFromTalkBtn = document.getElementById('submit-add-from-talk');
    if (submitAddFromTalkBtn) submitAddFromTalkBtn.addEventListener('click', submitAddFromTalk);

    const editTextEl = document.getElementById('edit-text');
    if (editTextEl) editTextEl.addEventListener('input', applySmartFieldsToEdit);

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);

    const closeSettings = document.getElementById('close-settings');
    if (closeSettings) closeSettings.addEventListener('click', closeSettingsModal);

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) settingsModal.addEventListener('click', (e) => {
      if (e.target.id === 'settings-modal') closeSettingsModal();
    });

    const saveSettings = document.getElementById('save-settings');
    if (saveSettings) saveSettings.addEventListener('click', saveSettingsAndClose);

    const pushNowBtn = document.getElementById('settings-push-now-btn');
    if (pushNowBtn) pushNowBtn.addEventListener('click', () => forcePushToCloud());

    const settingsLinkBtn = document.getElementById('settings-link-btn');
    const settingsLinkCode = document.getElementById('settings-link-code');
    if (settingsLinkBtn && settingsLinkCode) {
      settingsLinkBtn.addEventListener('click', async () => {
        const code = (settingsLinkCode.value || '').trim().toLowerCase().replace(/\s/g, '');
        if (!code || code.length < 6) {
          showToast('Enter a valid sync code (6+ chars from your other device)');
          return;
        }
        state.deviceSyncId = code;
        saveDeviceSyncState();
        try {
          if (window.talkAbout) {
            const prefs = await window.talkAbout.getDevicePreferences(state.deviceSyncId);
            if (!prefs?.error) {
              const hadData = Array.isArray(prefs.__items) || Object.keys(prefs).length > 0;
              applyDevicePreferencesToState(prefs);
              attachDevicePreferencesRealtime({
                state,
                talkAbout: window.talkAbout,
                applyDevicePreferencesToState,
                refreshUIAfterRemotePrefs
              });
              refreshUIAfterRemotePrefs();
              const syncDisplay = document.getElementById('settings-sync-code-display');
              if (syncDisplay) syncDisplay.textContent = state.deviceSyncId;
              const syncEl = document.getElementById('settings-sync-code');
              if (syncEl) syncEl.style.display = 'block';
              showToast(hadData ? 'Device linked — tasks and settings synced' : 'Device linked. Add a task on your other device and it will sync.');
            } else {
              showToast('Device linked. Could not fetch data — check connection.');
            }
          } else {
            showToast('Device linked. Supabase not configured.');
          }
        } catch (e) {
          showToast('Could not fetch — check code and connection');
        }
        settingsLinkCode.value = '';
      });
    }

    const btnColorEl = document.getElementById('settings-button-color');
    const btnHexEl = document.getElementById('settings-button-hex');
    const textColorEl = document.getElementById('settings-text-color');
    const textHexEl = document.getElementById('settings-text-hex');
    if (btnColorEl) btnColorEl.addEventListener('input', (e) => {
      state.buttonColor = e.target.value;
      if (btnHexEl) btnHexEl.value = e.target.value;
      applyThemeColors();
      saveDevicePreferencesToSupabase();
    });
    if (btnHexEl) btnHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.buttonColor = val;
        if (btnColorEl) btnColorEl.value = val;
        applyThemeColors();
        saveDevicePreferencesToSupabase();
      }
    });
    if (textColorEl) textColorEl.addEventListener('input', (e) => {
      state.textColor = e.target.value;
      if (textHexEl) textHexEl.value = e.target.value;
      applyThemeColors();
      saveDevicePreferencesToSupabase();
    });
    if (textHexEl) textHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.textColor = val;
        if (textColorEl) textColorEl.value = val;
        applyThemeColors();
        saveDevicePreferencesToSupabase();
      }
    });

    const archiveBtn = document.getElementById('archive-btn');
    if (archiveBtn) archiveBtn.addEventListener('click', openArchiveModal);

    const closeSeedRender = document.getElementById('close-seed-render');
    if (closeSeedRender) closeSeedRender.addEventListener('click', closeSeedRenderModal);
    const seedRenderModal = document.getElementById('seed-render-modal');
    if (seedRenderModal) seedRenderModal.addEventListener('click', (e) => {
      if (e.target.id === 'seed-render-modal') closeSeedRenderModal();
    });
    const seedRenderSet = document.getElementById('seed-render-set');
    if (seedRenderSet) seedRenderSet.addEventListener('click', () => {
      const taskSelect = document.getElementById('seed-render-task-select');
      const questionInput = document.getElementById('seed-render-question');
      const picker = document.getElementById('seed-render-picker');
      const renderingDiv = document.getElementById('seed-render-rendering');
      const taskId = taskSelect && taskSelect.value ? taskSelect.value : '';
      const question = questionInput && questionInput.value ? questionInput.value.trim() : '';
      let seed = '';
      if (taskId) {
        const item = state.items.find(i => i.id === taskId);
        seed = item ? (item.text || '').trim() : '';
      }
      if (!seed) seed = question;
      if (!seed) {
        showToast('Pick a task or type a question');
        return;
      }
      state.lastSeed = seed;
      state.seedRenderState = 'rendering';
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      if (picker) picker.style.display = 'none';
      if (renderingDiv) renderingDiv.style.display = 'block';
    });
    const seedRenderDone = document.getElementById('seed-render-done');
    if (seedRenderDone) seedRenderDone.addEventListener('click', closeSeedRenderModal);
    const seedRenderImBack = document.getElementById('seed-render-im-back');
    if (seedRenderImBack) seedRenderImBack.addEventListener('click', () => {
      const renderingDiv = document.getElementById('seed-render-rendering');
      const reflectionDiv = document.getElementById('seed-render-reflection');
      const reflectionInput = document.getElementById('seed-render-reflection-input');
      state.seedRenderState = 'back';
      if (renderingDiv) renderingDiv.style.display = 'none';
      if (reflectionDiv) reflectionDiv.style.display = 'block';
      if (reflectionInput) { reflectionInput.value = ''; reflectionInput.focus(); }
    });
    const seedRenderReflectionSave = document.getElementById('seed-render-reflection-save');
    if (seedRenderReflectionSave) seedRenderReflectionSave.addEventListener('click', () => {
      const reflectionInput = document.getElementById('seed-render-reflection-input');
      const text = reflectionInput && reflectionInput.value ? reflectionInput.value.trim() : '';
      if (!state.seedReflections) state.seedReflections = [];
      state.seedReflections.push({
        seed: state.lastSeed || '',
        reflectedAt: Date.now(),
        text: text
      });
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      showToast('Reflection saved');
      closeSeedRenderModal();
    });
    const seedRenderSearch = document.getElementById('seed-render-task-search');
    if (seedRenderSearch) seedRenderSearch.addEventListener('input', () => renderSeedTaskOptions(seedRenderSearch.value));
    const seedRenderSearchClear = document.getElementById('seed-render-task-search-clear');
    if (seedRenderSearchClear) seedRenderSearchClear.addEventListener('click', () => {
      const input = document.getElementById('seed-render-task-search');
      if (input) input.value = '';
      renderSeedTaskOptions('');
    });

    const closeArchive = document.getElementById('close-archive');
    if (closeArchive) closeArchive.addEventListener('click', () => {
      const m = document.getElementById('archive-modal');
      if (m) m.style.display = 'none';
    });

    const archiveModal = document.getElementById('archive-modal');
    if (archiveModal) archiveModal.addEventListener('click', (e) => {
      if (e.target.id === 'archive-modal') archiveModal.style.display = 'none';
    });

    const consistencyOpenFull = document.getElementById('consistency-open-full');
    if (consistencyOpenFull) consistencyOpenFull.addEventListener('click', () => {
      closeSidebar();
      openConsistencyPanel();
    });
    const consistencyBtn = document.getElementById('consistency-btn');
    if (consistencyBtn) consistencyBtn.addEventListener('click', openConsistencyPanel);
    const closeConsistency = document.getElementById('close-consistency');
    if (closeConsistency) closeConsistency.addEventListener('click', closeConsistencyPanel);

    const journalBtn = document.getElementById('journal-btn');
    if (journalBtn) journalBtn.addEventListener('click', openJournalPanel);
    const closeJournal = document.getElementById('close-journal');
    if (closeJournal) closeJournal.addEventListener('click', closeJournalPanel);

    document.querySelectorAll('.journal-nav-item').forEach(function(btn) {
      if (btn.id === 'journal-focus-btn') return;
      btn.addEventListener('click', function() {
        const tab = btn.dataset.tab;
        if (!tab) return;
        flushJournalDailySave();
        state.journalActiveTab = tab;
        document.querySelectorAll('.journal-nav-item').forEach(function(b) {
          if (b.dataset.tab) {
            b.classList.toggle('active', b.dataset.tab === tab);
            b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
          }
        });
        renderJournalPanel();
      });
    });

    const journalFocusBtn = document.getElementById('journal-focus-btn');
    if (journalFocusBtn) journalFocusBtn.addEventListener('click', function() {
      setJournalFocusMode(!state.journalFocusMode);
    });
    const journalFocusClose = document.getElementById('journal-focus-close');
    if (journalFocusClose) journalFocusClose.addEventListener('click', function() {
      setJournalFocusMode(false);
      var fb = document.getElementById('journal-focus-btn');
      if (fb) fb.focus();
    });
    const journalDailySave = document.getElementById('journal-daily-save');
    if (journalDailySave) journalDailySave.addEventListener('click', function() {
      flushJournalDailySave();
      showToast('Saved');
    });

    const journalDailyNewEntry = document.getElementById('journal-daily-new-entry');
    if (journalDailyNewEntry) {
      journalDailyNewEntry.addEventListener('click', function() {
        const tallyStr = getTallyDateYYYYMMDD();
        flushJournalDailySave();
        if (!state.journalDaily) state.journalDaily = {};
        const current = normalizeJournalDayValue(state.journalDaily[tallyStr]);
        const nid = newEntryId();
        current.entries.push({ id: nid, html: JOURNAL_EMPTY_ENTRY_HTML, updatedAt: Date.now() });
        state.journalDaily[tallyStr] = current;
        state.journalDailyOpenEntryByDate[tallyStr] = nid;
        saveState();
        renderJournalDaily();
        const nb = document.querySelector('#journal-daily-active-slot .journal-entry-body');
        if (nb) nb.focus();
      });
    }

    const journalDailyDeleteEntry = document.getElementById('journal-daily-delete-entry');
    if (journalDailyDeleteEntry) {
      journalDailyDeleteEntry.addEventListener('click', function() {
        const tallyStr = getTallyDateYYYYMMDD();
        const day = normalizeJournalDayValue(state.journalDaily && state.journalDaily[tallyStr]);
        if (day.entries.length < 2) return;
        if (!window.confirm('Delete this entry? This cannot be undone.')) return;
        flushJournalDailySave();
        const sel = state.journalDailyOpenEntryByDate[tallyStr];
        const next = day.entries.filter((e) => e.id !== sel);
        state.journalDaily[tallyStr] = normalizeJournalDayValue({ v: 2, entries: next });
        state.journalDailyOpenEntryByDate[tallyStr] = next[0].id;
        saveState();
        renderJournalDaily();
        showToast('Entry removed');
      });
    }

    const journalAddReflBtn = document.getElementById('journal-add-reflection-btn');
    const journalAddReflForm = document.getElementById('journal-add-reflection-form');
    const journalAddReflInput = document.getElementById('journal-add-reflection-input');
    const journalAddReflSave = document.getElementById('journal-add-reflection-save');
    const journalAddReflCancel = document.getElementById('journal-add-reflection-cancel');
    if (journalAddReflBtn && journalAddReflForm) {
      journalAddReflBtn.addEventListener('click', function() {
        journalAddReflForm.style.display = 'block';
        if (journalAddReflInput) { journalAddReflInput.value = ''; journalAddReflInput.focus(); }
      });
    }
    if (journalAddReflCancel && journalAddReflForm) {
      journalAddReflCancel.addEventListener('click', function() {
        journalAddReflForm.style.display = 'none';
      });
    }
    if (journalAddReflSave && journalAddReflInput) {
      journalAddReflSave.addEventListener('click', function() {
        const text = journalAddReflInput.value.trim();
        if (!text) return;
        if (!state.seedReflections) state.seedReflections = [];
        state.seedReflections.push({ seed: '', reflectedAt: Date.now(), text: text });
        saveState();
        if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
        journalAddReflInput.value = '';
        if (journalAddReflForm) journalAddReflForm.style.display = 'none';
        renderJournalReflections();
        showToast('Reflection saved');
      });
    }

    function openRelationshipsPanel() {
      state.relationshipsDetailPersonId = null;
      var panel = document.getElementById('relationships-panel');
      if (!panel) return;
      panel.style.display = 'block';
      renderRelationshipsPanel();
    }

    function closeRelationshipsPanel() {
      state.relationshipsDetailPersonId = null;
      var panel = document.getElementById('relationships-panel');
      if (panel) panel.style.display = 'none';
    }

    function renderRelationshipsPanel() {
      var listView = document.getElementById('relationships-list-view');
      var detailView = document.getElementById('relationships-detail-view');
      var backBtn = document.getElementById('relationships-back');
      var headerH3 = document.querySelector('#relationships-header h3');
      if (state.relationshipsDetailPersonId) {
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        if (backBtn) backBtn.style.display = 'inline-block';
        if (headerH3) headerH3.style.display = 'none';
        renderRelationshipsDetail(state.relationshipsDetailPersonId);
      } else {
        if (listView) listView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        if (headerH3) headerH3.style.display = 'block';
        renderRelationshipsList();
      }
    }

    function fillRelationshipGroupSelect(selectEl, selectedId) {
      if (!selectEl) return;
      const groups = getPeopleGroups();
      selectEl.innerHTML = groups.map(function(g) {
        return '<option value="' + escapeHtml(g.id) + '"' + (g.id === selectedId ? ' selected' : '') + '>' + escapeHtml(g.label) + '</option>';
      }).join('');
    }

    function renderRelationshipsGroupsPanel() {
      var panel = document.getElementById('relationships-groups-panel');
      var listEl = document.getElementById('relationships-groups-list');
      if (!panel || !listEl) return;
      var groups = getPeopleGroups();
      listEl.innerHTML = groups.map(function(g) {
        var count = getPeople().filter(function(p) { return p.group === g.id; }).length;
        return '<li class="relationships-group-edit-row" data-group-id="' + escapeHtml(g.id) + '">' +
          '<input type="text" class="settings-name-input relationships-group-rename" value="' + escapeHtml(g.label) + '" maxlength="48" aria-label="Group name">' +
          '<span class="relationships-group-count">' + count + ' people</span>' +
          '<button type="button" class="btn-secondary btn-sm relationships-group-save">Rename</button>' +
          '<button type="button" class="btn-secondary btn-sm relationships-group-delete">Delete</button>' +
          '</li>';
      }).join('');
      listEl.querySelectorAll('.relationships-group-save').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var row = btn.closest('.relationships-group-edit-row');
          var id = row && row.dataset.groupId;
          var inp = row && row.querySelector('.relationships-group-rename');
          if (!id || !inp) return;
          renamePeopleGroup(id, inp.value);
          renderRelationshipsGroupsPanel();
          var addSel = document.getElementById('relationships-add-group');
          if (addSel) fillRelationshipGroupSelect(addSel, addSel.value);
          showToast('Group updated');
        });
      });
      listEl.querySelectorAll('.relationships-group-delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var row = btn.closest('.relationships-group-edit-row');
          var id = row && row.dataset.groupId;
          if (!id) return;
          if (!window.confirm('Delete this group? People in it move to Friends.')) return;
          deletePeopleGroup(id);
          renderRelationshipsGroupsPanel();
          var addSel2 = document.getElementById('relationships-add-group');
          if (addSel2) fillRelationshipGroupSelect(addSel2, 'friends');
          renderRelationshipsList();
          showToast('Group removed');
        });
      });
    }

    function renderRelationshipsList() {
      var container = document.getElementById('relationships-group-list');
      if (!container) return;
      var addGrpEl = document.getElementById('relationships-add-group');
      var prevSel = (addGrpEl && addGrpEl.value) ? addGrpEl.value : 'friends';
      fillRelationshipGroupSelect(addGrpEl, prevSel);
      var people = getPeople();
      var groups = getPeopleGroups();
      var byGroup = {};
      groups.forEach(function(g) {
        byGroup[g.id] = people.filter(function(p) { return p.group === g.id; });
      });
      container.innerHTML = people.length === 0
        ? '<p class="empty-state">No people yet. Add someone to stay in touch.</p>'
        : groups.map(function(g) {
            var list = byGroup[g.id] || [];
            if (list.length === 0) return '';
            return '<div class="relationships-group-section"><h4 class="relationships-group-title">' + escapeHtml(g.label) + ' (' + list.length + ')</h4><div class="relationships-person-list">' +
              list.map(function(p) {
                var lastStr = p.lastConnected == null ? 'Never' : (function() {
                  var d = new Date(p.lastConnected);
                  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                })();
                var due = isOverdueToReconnect(p);
                return '<div class="relationships-person-row" data-person-id="' + escapeHtml(p.id) + '" role="button" tabindex="0">' +
                  '<span class="relationships-person-name">' + escapeHtml(p.name) + '</span>' +
                  '<span class="relationships-person-meta">Last connected: ' + escapeHtml(lastStr) + '</span>' +
                  (due ? ' <span class="relationships-due-badge">Due to reconnect</span>' : '') +
                  '</div>';
              }).join('') +
              '</div></div>';
          }).join('');
      container.querySelectorAll('.relationships-person-row').forEach(function(row) {
        row.addEventListener('click', function() {
          state.relationshipsDetailPersonId = row.dataset.personId;
          renderRelationshipsPanel();
        });
      });
    }

    function renderRelationshipsDetail(personId) {
      var content = document.getElementById('relationships-detail-content');
      if (!content) return;
      var person = getPerson(personId);
      if (!person) {
        state.relationshipsDetailPersonId = null;
        renderRelationshipsPanel();
        return;
      }
      var lastDateVal = person.lastConnected != null ? (function() {
        var d = new Date(person.lastConnected);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      })() : '';
      var hist = (person.history || []).slice().sort(function(a, b) { return (b.at || 0) - (a.at || 0); });
      var historyHtml = hist.length ? hist.map(function(h) {
        var d = new Date(h.at);
        return '<div class="relationships-history-row"><span class="relationships-history-date">' + escapeHtml(d.toLocaleString()) + '</span><p class="relationships-history-text">' + escapeHtml(h.text) + '</p></div>';
      }).join('') : '<p class="empty-state">No history yet — add notes as you go.</p>';
      var linked = (state.items || []).filter(function(i) { return !i.archived && i.personId === personId; });
      content.innerHTML = '<div class="relationships-detail-block relationships-detail-form">' +
        '<label>Name</label><input type="text" id="relationships-detail-name" class="settings-name-input" maxlength="120" value="' + escapeHtml(person.name) + '">' +
        '<label>Group</label><select id="relationships-detail-group" class="settings-select"></select>' +
        '<label>Last connected</label><input type="date" id="relationships-detail-last" class="settings-name-input" value="' + escapeHtml(lastDateVal) + '">' +
        '<label>Reconnect reminder</label><select id="relationships-detail-reconnect" class="settings-select">' +
        '<option value="">No reminder</option><option value="1w">Every week</option><option value="2w">Every 2 weeks</option>' +
        '<option value="1m">Every month</option><option value="3m">Every 3 months</option></select>' +
        '<label>Notes</label><textarea id="relationships-detail-notes" class="settings-name-input" rows="3" placeholder="Things to remember">' + escapeHtml(person.notes || '') + '</textarea>' +
        '<div class="relationships-detail-save-row">' +
        '<button type="button" id="relationships-detail-save" class="btn-primary btn-sm">Save changes</button>' +
        '<button type="button" id="relationships-mark-connected" class="btn-secondary btn-sm" data-person-id="' + escapeHtml(personId) + '">Mark connected today</button>' +
        '</div></div>' +
        '<h4>History</h4>' +
        '<div class="relationships-history-list">' + historyHtml + '</div>' +
        '<label class="relationships-history-add-label">Add to history</label>' +
        '<textarea id="relationships-history-new" class="settings-name-input" rows="2" placeholder="e.g. Video call, sent a card, deep talk about…"></textarea>' +
        '<button type="button" id="relationships-history-add" class="btn-secondary btn-sm">Add note</button>' +
        '<h4>Linked tasks</h4>' +
        (linked.length ? '<ul class="relationships-linked-tasks">' + linked.map(function(i) {
          return '<li><button type="button" class="btn-link relationships-open-task" data-id="' + escapeHtml(i.id) + '">' + escapeHtml((i.text || '').slice(0, 60)) + (i.text && i.text.length > 60 ? '…' : '') + '</button></li>';
        }).join('') + '</ul>' : '<p class="empty-state">No tasks linked.</p>') +
        '<div class="relationships-detail-actions">' +
        '<button type="button" id="relationships-delete-person" class="btn-secondary btn-sm" data-person-id="' + escapeHtml(personId) + '">Delete person</button></div>';
      fillRelationshipGroupSelect(document.getElementById('relationships-detail-group'), person.group);
      var recSel = document.getElementById('relationships-detail-reconnect');
      if (recSel && person.reconnectRule && person.reconnectRule.interval) recSel.value = person.reconnectRule.interval;

      var saveBtn = document.getElementById('relationships-detail-save');
      if (saveBtn) saveBtn.addEventListener('click', function() {
        var name = (document.getElementById('relationships-detail-name') || {}).value.trim();
        var group = (document.getElementById('relationships-detail-group') || {}).value;
        var lastVal = (document.getElementById('relationships-detail-last') || {}).value;
        var lastMs = lastVal ? (new Date(lastVal)).setHours(0, 0, 0, 0) : null;
        var rec = (document.getElementById('relationships-detail-reconnect') || {}).value;
        var reconnectRule = rec ? { interval: rec } : null;
        var notesRaw = (document.getElementById('relationships-detail-notes') || {}).value;
        var notes = (notesRaw || '').trim() || null;
        if (!name) { showToast('Name required'); return; }
        updatePerson(personId, { name: name, group: group, lastConnected: lastMs, reconnectRule: reconnectRule, notes: notes });
        showToast('Saved');
        renderRelationshipsDetail(personId);
        if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      });
      var markBtn = document.getElementById('relationships-mark-connected');
      if (markBtn) markBtn.addEventListener('click', function() {
        updatePerson(personId, { lastConnected: Date.now() });
        appendPersonHistory(personId, 'Marked connected');
        renderRelationshipsDetail(personId);
        showToast('Marked connected');
        if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      });
      var histAdd = document.getElementById('relationships-history-add');
      if (histAdd) histAdd.addEventListener('click', function() {
        var t = (document.getElementById('relationships-history-new') || {}).value.trim();
        if (!t) return;
        appendPersonHistory(personId, t);
        document.getElementById('relationships-history-new').value = '';
        renderRelationshipsDetail(personId);
        showToast('History updated');
        if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      });
      content.querySelectorAll('.relationships-open-task').forEach(function(btn) {
        btn.addEventListener('click', function() {
          closeRelationshipsPanel();
          openEditModal(btn.dataset.id);
        });
      });
      var delBtn = document.getElementById('relationships-delete-person');
      if (delBtn) delBtn.addEventListener('click', function() {
        var count = linked.length;
        if (!window.confirm('Delete this person? ' + (count ? count + ' task(s) will no longer be linked to them.' : ''))) return;
        deletePerson(personId);
        state.relationshipsDetailPersonId = null;
        renderRelationshipsPanel();
        renderColumns();
        showToast('Person removed');
      });
    }

    var relAddBtn = document.getElementById('relationships-add-person');
    var relAddForm = document.getElementById('relationships-add-form');
    var relAddName = document.getElementById('relationships-add-name');
    var relAddGroup = document.getElementById('relationships-add-group');
    var relAddLast = document.getElementById('relationships-add-last-connected');
    var relAddReconnect = document.getElementById('relationships-add-reconnect');
    var relAddNotes = document.getElementById('relationships-add-notes');
    var relAddSave = document.getElementById('relationships-add-save');
    var relAddCancel = document.getElementById('relationships-add-cancel');
    if (relAddBtn && relAddForm) relAddBtn.addEventListener('click', function() {
      relAddForm.style.display = 'block';
      fillRelationshipGroupSelect(relAddGroup, (relAddGroup && relAddGroup.value) ? relAddGroup.value : 'friends');
      if (relAddName) { relAddName.value = ''; relAddName.focus(); }
      if (relAddLast) relAddLast.value = '';
      if (relAddReconnect) relAddReconnect.value = '';
      if (relAddNotes) relAddNotes.value = '';
    });
    if (relAddCancel && relAddForm) relAddCancel.addEventListener('click', function() { relAddForm.style.display = 'none'; });
    if (relAddSave && relAddName) relAddSave.addEventListener('click', function() {
      var name = (relAddName.value || '').trim();
      if (!name) return;
      var group = relAddGroup && relAddGroup.value ? relAddGroup.value : 'friends';
      var lastVal = relAddLast && relAddLast.value ? relAddLast.value : null;
      var lastMs = lastVal ? (new Date(lastVal)).setHours(0, 0, 0, 0) : null;
      var reconnectVal = relAddReconnect && relAddReconnect.value ? relAddReconnect.value : null;
      var reconnectRule = reconnectVal ? { interval: reconnectVal } : null;
      var notes = relAddNotes && relAddNotes.value ? relAddNotes.value.trim() : null;
      addPerson({ name: name, group: group, lastConnected: lastMs, reconnectRule: reconnectRule, notes: notes });
      relAddForm.style.display = 'none';
      relAddName.value = '';
      renderRelationshipsList();
      showToast('Person added');
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
    });
    var relToggleGroups = document.getElementById('relationships-toggle-groups');
    var relGroupsPanel = document.getElementById('relationships-groups-panel');
    if (relToggleGroups && relGroupsPanel) {
      relToggleGroups.addEventListener('click', function() {
        var open = relGroupsPanel.style.display !== 'block';
        relGroupsPanel.style.display = open ? 'block' : 'none';
        if (open) renderRelationshipsGroupsPanel();
      });
    }
    var relNewGroupAdd = document.getElementById('relationships-new-group-add');
    var relNewGroupName = document.getElementById('relationships-new-group-name');
    if (relNewGroupAdd && relNewGroupName) {
      relNewGroupAdd.addEventListener('click', function() {
        var id = addPeopleGroup(relNewGroupName.value);
        if (!id) { showToast('Enter a group name'); return; }
        relNewGroupName.value = '';
        renderRelationshipsGroupsPanel();
        fillRelationshipGroupSelect(document.getElementById('relationships-add-group'), id);
        showToast('Group added');
        if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      });
    }

    var relBack = document.getElementById('relationships-back');
    if (relBack) relBack.addEventListener('click', function() {
      state.relationshipsDetailPersonId = null;
      renderRelationshipsPanel();
    });
    var closeRelationships = document.getElementById('close-relationships');
    if (closeRelationships) closeRelationships.addEventListener('click', closeRelationshipsPanel);

    var relationshipsBtn = document.getElementById('relationships-btn');
    if (relationshipsBtn) relationshipsBtn.addEventListener('click', openRelationshipsPanel);

    const analyticsBtn = document.getElementById('analytics-btn');
    if (analyticsBtn) analyticsBtn.addEventListener('click', openAnalytics);

    const emailTriageBtn = document.getElementById('email-triage-btn');
    if (emailTriageBtn) emailTriageBtn.addEventListener('click', openEmailTriage);

    const emailTriageRunBtn = document.getElementById('email-triage-run-btn');
    if (emailTriageRunBtn) emailTriageRunBtn.addEventListener('click', () => {
      if (!window.talkAbout) { showToast('Supabase not configured'); return; }
      const pairId = state.pairId || 'solo_default';
      window.talkAbout.requestTriageRun(pairId, state.addedBy).then(({ error }) => {
        if (error) showToast(error === 'Supabase not configured' ? error : 'Request failed');
        else showToast('Triage run requested — agent will process when it runs.');
      });
    });

    document.querySelectorAll('.close-email-triage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = document.getElementById('email-triage-section');
        if (s) s.style.display = 'none';
      });
    });

    const closeAnalytics = document.getElementById('close-analytics');
    if (closeAnalytics) closeAnalytics.addEventListener('click', () => {
      const p = document.getElementById('analytics-panel');
      if (p) p.style.display = 'none';
    });

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportBackup);

    const importBtn = document.getElementById('import-btn');
    if (importBtn) importBtn.addEventListener('click', () => document.getElementById('import-input').click());

    const importInput = document.getElementById('import-input');
    if (importInput) importInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) importBackup(f);
      e.target.value = '';
    });

    const talkInput = document.getElementById('talk-about-input');
    if (talkInput) talkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTalkAbout(); }
    });

    const talkAddBtn = document.getElementById('talk-about-add-btn');
    if (talkAddBtn) talkAddBtn.addEventListener('click', addTalkAbout);

    const hint = document.getElementById('priority-hint');
    if (hint) hint.addEventListener('click', () => {
      alert('1. Is someone else waiting? → Critical\n2. Does money/reputation depend on it? → High\n3. Would you feel relieved dropping it? → Low (else Medium)');
    });

    const micBtn = document.getElementById('mic-btn');
    if (micBtn && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.textContent = '...';
      });
      recognition.onresult = (e) => {
        taskInput.value = e.results[0][0].transcript;
        micBtn.textContent = '🎤';
        applySmartFields();
      };
      recognition.onerror = recognition.onend = () => { micBtn.textContent = '🎤'; };
    }
  }

  function openLinkPartnerModal() {
    const modal = document.getElementById('link-partner-modal');
    const actions = document.querySelector('.link-partner-actions');
    const created = document.getElementById('link-pair-created');
    if (modal) modal.style.display = 'flex';
    if (actions) actions.style.display = 'flex';
    if (created) created.style.display = 'none';
  }

  function closeLinkPartnerModal() {
    const modal = document.getElementById('link-partner-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindLinkPartnerModal() {
    const modal = document.getElementById('link-partner-modal');
    const closeBtn = document.getElementById('close-link-partner');
    const createBtn = document.getElementById('link-create-btn');
    const joinBtn = document.getElementById('link-join-btn');
    const continueBtn = document.getElementById('link-continue-btn');
    const actions = document.querySelector('.link-partner-actions');
    const created = document.getElementById('link-pair-created');
    const codeEl = document.getElementById('link-pair-code');
    const joinInput = document.getElementById('link-join-input');

    if (closeBtn) closeBtn.addEventListener('click', closeLinkPartnerModal);
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target.id === 'link-partner-modal') closeLinkPartnerModal();
    });

    if (createBtn) createBtn.addEventListener('click', async () => {
      state.pairId = window.talkAbout ? window.talkAbout.generatePairId() : 'demo' + Date.now().toString(36).slice(-6);
      state.addedBy = 'Talia';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      if (actions) actions.style.display = 'none';
      if (created) created.style.display = 'block';
      if (codeEl) codeEl.textContent = state.pairId;
    });

    if (continueBtn) continueBtn.addEventListener('click', async () => {
      closeLinkPartnerModal();
      await showMainApp();
    });

    if (joinBtn) joinBtn.addEventListener('click', async () => {
      const code = (joinInput && joinInput.value) ? joinInput.value.trim().toLowerCase() : '';
      if (!code) { showToast('Enter a pair code'); return; }
      const asTalia = document.getElementById('link-join-talia');
      state.pairId = code;
      state.addedBy = (asTalia && asTalia.checked) ? 'Talia' : 'Garren';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      closeLinkPartnerModal();
      await showMainApp();
    });

    if (joinInput) joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('link-join-btn').click();
    });
  }

  function bindPairSetup() {
    const createBtn = document.getElementById('create-pair-btn');
    if (createBtn) createBtn.addEventListener('click', async () => {
      state.pairId = window.talkAbout ? window.talkAbout.generatePairId() : 'demo' + Date.now().toString(36).slice(-6);
      state.addedBy = 'Talia';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      document.getElementById('pair-created').style.display = 'block';
      document.querySelector('.pair-actions').style.display = 'none';
      document.getElementById('pair-code-display').textContent = state.pairId;
    });

    const continueBtn = document.getElementById('continue-after-create');
    if (continueBtn) continueBtn.addEventListener('click', async () => {
      document.getElementById('pair-created').style.display = 'none';
      await showMainApp();
      bindEvents();
    });

    const joinBtn = document.getElementById('join-pair-btn');
    if (joinBtn) joinBtn.addEventListener('click', async () => {
      const input = document.getElementById('join-code-input');
      const code = (input && input.value) ? input.value.trim().toLowerCase() : '';
      if (!code) {
        showToast('Enter a pair code');
        return;
      }
      const asTalia = document.getElementById('join-as-talia');
      state.pairId = code;
      state.addedBy = (asTalia && asTalia.checked) ? 'Talia' : 'Garren';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      document.getElementById('pair-setup').style.display = 'none';
      await showMainApp();
      bindEvents();
    });

    const joinInput = document.getElementById('join-code-input');
    if (joinInput) joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('join-pair-btn').click();
    });
  }

  async function loadPublicProductConfig() {
    try {
      const r = await fetch('./product.json', { cache: 'no-store' });
      if (!r.ok) return;
      const p = await r.json();
      state.productConfig = p;
      if (p.buildRef != null && String(p.buildRef).trim()) {
        state.buildRef = String(p.buildRef).trim().slice(0, 120);
      }
      if (p.name && typeof p.name === 'string') {
        document.title = p.name;
      }
    } catch (e) {
      /* offline or missing file — keep defaults */
    }
  }

  async function init() {
    await loadPublicProductConfig();
    setStorageNotify((msg) => showToast(msg));
    setCloudSyncHook(() => saveDevicePreferencesToSupabase());
    window.addEventListener('online', () => {
      updateOfflineBanner();
      showToast('Back online — sync resumed');
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
    });
    window.addEventListener('offline', updateOfflineBanner);
    updateOfflineBanner();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          if (reg) reg.update();
          navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
        })
        .catch((err) => {
          console.warn('Service worker registration failed', err);
          showToast('Offline mode limited — refresh when online');
        });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => reg.update());
        }
      });
    }
    loadPairState();
    loadDeviceSyncState();
    if (state.pairId || hasChosenSolo() || state.deviceSyncId) {
      document.getElementById('entry-screen').style.display = 'none';
      document.getElementById('pair-setup').style.display = 'none';
      await showMainApp();
      bindEvents();
    } else {
      document.getElementById('entry-screen').style.display = 'block';
      document.getElementById('pair-setup').style.display = 'none';
      document.getElementById('main-app').style.display = 'none';
      document.getElementById('floating-buttons').style.display = 'none';
      bindEntryScreen();
    }
  }

  function bindEntryScreen() {
    const soloBtn = document.getElementById('entry-solo-btn');
    const coupleBtn = document.getElementById('entry-couple-btn');
    const linkBtn = document.getElementById('entry-link-btn');
    const linkForm = document.getElementById('entry-link-form');
    const linkCode = document.getElementById('entry-link-code');
    const linkSubmit = document.getElementById('entry-link-submit');
    const linkCancel = document.getElementById('entry-link-cancel');
    if (linkBtn) linkBtn.addEventListener('click', () => {
      if (linkForm) linkForm.style.display = 'block';
      if (linkCode) { linkCode.value = ''; linkCode.focus(); }
    });
    if (linkCancel) linkCancel.addEventListener('click', () => {
      if (linkForm) linkForm.style.display = 'none';
    });
    if (linkSubmit) linkSubmit.addEventListener('click', async () => {
      const code = (linkCode && linkCode.value) ? linkCode.value.trim().toLowerCase().replace(/\s/g, '') : '';
      if (!code || code.length < 6) {
        showToast('Enter a valid sync code (from your other device)');
        return;
      }
      state.deviceSyncId = code;
      saveDeviceSyncState();
      if (linkForm) linkForm.style.display = 'none';
      document.getElementById('entry-screen').style.display = 'none';
      try {
        if (window.talkAbout) {
          const prefs = await window.talkAbout.getDevicePreferences(state.deviceSyncId);
          if (!prefs?.error) applyDevicePreferencesToState(prefs);
          saveState();
        }
        showToast('Device linked. If settings look wrong, check the code.');
      } catch (e) {
        showToast('Device linked. If settings look wrong, check the code.');
      }
      await showMainApp();
      bindEvents();
    });
    if (linkCode) linkCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('entry-link-submit').click();
    });
    if (soloBtn) soloBtn.addEventListener('click', async () => {
      setChosenSolo();
      if (!state.deviceSyncId) {
        state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'solo' + Date.now().toString(36).slice(-6);
        saveDeviceSyncState();
        if (window.talkAbout) {
          try {
            await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
          } catch (e) { console.warn('Seed failed', e); }
        }
      }
      document.getElementById('entry-screen').style.display = 'none';
      await showMainApp();
      bindEvents();
    });
    if (coupleBtn) coupleBtn.addEventListener('click', () => {
      document.getElementById('entry-screen').style.display = 'none';
      document.getElementById('pair-setup').style.display = 'block';
      bindPairSetup();
    });
  }

  wireComposer();

  bindLinkPartnerModal();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init().catch(e => console.error('Init failed', e)));
} else {
  init().catch(e => console.error('Init failed', e));
}
