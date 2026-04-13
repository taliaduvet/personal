import { PRIORITIES } from '../constants.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import {
  getCategories,
  getCategoryOptionLabel,
  coerceCategoryId
} from '../domain/categories.js';
import {
  detectCategory,
  extractDeadline,
  extractDoingDate,
  extractFriction,
  extractRecurrence,
  extractPriority,
  createItem
} from '../domain/tasks.js';

/**
 * @typedef {Object} ModalControllerDeps
 * @property {import('../types.js').AppState} state
 * @property {() => void} saveState
 * @property {(msg: string, undo?: () => void) => void} showToast
 * @property {() => unknown} getRenderColumns
 * @property {() => unknown} getRenderTodayList
 * @property {() => unknown} getRenderFocusList
 * @property {() => void} updateCategorySelectOptions
 * @property {(selectIdOrEl: string|HTMLElement, selectedPileId?: string) => void} updatePileSelectOptions
 * @property {(selectIdOrEl: string|HTMLElement, selectedPersonId?: string) => void} updatePersonSelectOptions
 * @property {() => void} [onAfterItemsChange] — e.g. refresh week planner when it is open
 */

/**
 * @param {ModalControllerDeps} deps
 */
export function createModalController(deps) {
  const {
    saveState,
    showToast,
    getRenderColumns,
    getRenderTodayList,
    getRenderFocusList,
    updateCategorySelectOptions,
    updatePileSelectOptions,
    updatePersonSelectOptions,
    onAfterItemsChange = () => {}
  } = deps;

  function renderColumns() {
    const fn = getRenderColumns();
    if (typeof fn === 'function') fn();
  }
  function renderTodayList() {
    const fn = getRenderTodayList();
    if (typeof fn === 'function') fn();
  }
  function renderFocusList() {
    const fn = getRenderFocusList();
    if (typeof fn === 'function') fn();
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
    if (categorySelect) {
      const preferred =
        presetCategory != null && presetCategory !== undefined ? presetCategory : state.lastCategory;
      const coerced = coerceCategoryId(preferred);
      categorySelect.value = coerced;
      state.lastCategory = coerced;
    }
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
    const lines = (el && el.value) ? el.value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : [];
    if (!lines.length) return;
    if (submitBtn) submitBtn.disabled = true;
    lines.forEach((line) => {
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
    onAfterItemsChange();
    showToast('Added ' + lines.length + ' items');
    if (submitBtn) submitBtn.disabled = false;
  }

  function addVoiceMultiple() {
    const submitBtn = document.getElementById('submit-voice');
    if (submitBtn?.disabled) return;
    const transcriptEl = document.getElementById('voice-transcript');
    let transcript = (transcriptEl && transcriptEl.textContent) ? transcriptEl.textContent.trim() : '';
    transcript = transcript.replace(/\s+comma\s+/gi, ',');
    const lines = transcript.split(/,\s*|\s+next\s+/i).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    if (submitBtn) submitBtn.disabled = true;
    lines.forEach((line) => {
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
    onAfterItemsChange();
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
    if (doingDate && doingDate !== deadline) {
      const inp = document.getElementById('doing-date-input');
      if (inp) inp.value = doingDate;
    }
    const friction = extractFriction(text);
    if (friction) {
      const sel = document.getElementById('friction-select');
      if (sel && sel.querySelector(`option[value="${friction}"]`)) sel.value = friction;
    }
    const t = (text || '').toLowerCase();
    const piles = (state.piles || []).slice();
    const people = (state.people || []).slice();
    const pile = piles.find((p) => p?.name && t.includes(String(p.name).toLowerCase()));
    if (pile) {
      const sel = document.getElementById('pile-select');
      if (sel && sel.querySelector(`option[value="${pile.id}"]`)) sel.value = pile.id;
    }
    const person = people.find((p) => p?.name && t.includes(String(p.name).toLowerCase()));
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
    if (submitBtn) submitBtn.disabled = true;
    try {
      const categoryEl = document.getElementById('category-select');
      const priorityEl = document.getElementById('priority-select');
      if (!categoryEl || !priorityEl) {
        throw new Error('Add form is incomplete — refresh the page');
      }
      const category = coerceCategoryId(categoryEl.value);
      const deadlineEl = document.getElementById('deadline-input');
      const deadline = (deadlineEl && deadlineEl.value) ? deadlineEl.value : null;
      const doingDateEl = document.getElementById('doing-date-input');
      const doingDate = (doingDateEl && doingDateEl.value) ? doingDateEl.value : null;
      const priority = priorityEl.value;
      const recurrenceEl = document.getElementById('recurrence-select');
      const recurrence = (recurrenceEl && recurrenceEl.value) ? recurrenceEl.value : null;
      const pileEl = document.getElementById('pile-select');
      const pileId = (pileEl && pileEl.value) ? pileEl.value : null;
      const frictionEl = document.getElementById('friction-select');
      const friction = (frictionEl && frictionEl.value) ? frictionEl.value : null;
      const firstStepEl = document.getElementById('first-step-input');
      const firstStep = (firstStepEl && firstStepEl.value) ? firstStepEl.value.trim() : null;
      state.lastCategory = category;
      const personEl = document.getElementById('person-select');
      const personId = (personEl && personEl.value) ? personEl.value : null;
      const item = createItem(text, category, deadline, priority, recurrence, null, doingDate, pileId, friction, personId);
      if (firstStep) item.firstStep = firstStep;
      state.items.push(item);
      saveState();
      closeAddModal();
      renderColumns();
      onAfterItemsChange();
    } catch (e) {
      console.warn('Add single failed', e);
      showToast('Could not add task — ' + (e?.message || 'try again'));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function openEditModal(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    state.editingId = id;
    document.getElementById('edit-text').value = item.text;
    document.getElementById('edit-category').innerHTML = getCategories().map((c) =>
      `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${escapeHtml(getCategoryOptionLabel(c.id))}</option>`
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
    document.getElementById('edit-priority').innerHTML = PRIORITIES.map((p) =>
      `<option value="${p}" ${p === item.priority ? 'selected' : ''}>${p}</option>`
    ).join('');
    document.getElementById('edit-modal').style.display = 'flex';
  }

  function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    state.editingId = null;
  }

  function saveEdit() {
    const id = state.editingId;
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    item.text = document.getElementById('edit-text').value.trim();
    item.category = coerceCategoryId(document.getElementById('edit-category').value);
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
    onAfterItemsChange();
  }

  function submitAddTask() {
    addSingle();
  }

  function submitEditTask() {
    saveEdit();
  }

  return {
    openAddModal,
    openEditModal,
    closeAddModal,
    closeEditModal,
    addQuick,
    addVoiceMultiple,
    initVoiceMulti,
    applySmartFields,
    applySmartFieldsToEdit,
    addSingle,
    saveEdit,
    submitAddTask,
    submitEditTask
  };
}
