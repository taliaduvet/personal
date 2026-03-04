(function() {
  'use strict';

  const CATEGORY_PRESETS = {
    generic: [
      { id: 'work', label: 'Work' },
      { id: 'hobbies', label: 'Hobbies' },
      { id: 'life', label: 'Life' },
      { id: 'other', label: 'Other' }
    ],
    creative: [
      { id: 'misfit', label: 'Misfit' },
      { id: 'stop2030barclay', label: 'Stop 2030 Barclay' },
      { id: 'cycles', label: 'Cycles' },
      { id: 'life', label: 'Life' }
    ]
  };

  function getCategories() {
    const preset = state.categoryPreset || 'generic';
    return CATEGORY_PRESETS[preset] || CATEGORY_PRESETS.generic;
  }

  const PRESET_MIGRATION = {
    generic_to_creative: { work: 'misfit', hobbies: 'stop2030barclay', life: 'life', other: 'cycles' },
    creative_to_generic: { misfit: 'work', stop2030barclay: 'hobbies', life: 'life', cycles: 'other' }
  };

  const PRIORITIES = ['critical', 'high', 'medium', 'low'];
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  const STORAGE_PREFIX = 'parkingLotCouples_';
  const HAS_CHOSEN_SOLO_KEY = STORAGE_PREFIX + 'hasChosenSolo';

  const DEFAULT_COLUMN_COLORS = {
    work: '#e07a5f',
    hobbies: '#81b29a',
    life: '#f2cc8f',
    other: '#9ca3af',
    misfit: '#e07a5f',
    stop2030barclay: '#81b29a',
    cycles: '#f2cc8f'
  };

  let state = {
    items: [],
    todaySuggestionIds: [],
    completedTodayCount: 0,
    lastCompletedDate: null,
    lastCategory: 'life',
    drillDownCategory: null,
    selectedIds: new Set(),
    searchQuery: '',
    undoItem: null,
    undoTimeout: null,
    editingId: null,
    pairId: null,
    addedBy: null,
    talkAboutItems: [],
    talkAboutUnsubscribe: null,
    customLabels: {},
    columnColors: {},
    categoryPreset: 'generic',
    buttonColor: null,
    textColor: null,
    displayName: '',
    emailTriageItems: [],
    lastAgentRun: null,
    emailTriageUnsubscribe: null,
    savePrefsTimeout: null,
    processingIds: new Set()
  };

  function loadPairState() {
    state.pairId = localStorage.getItem(STORAGE_PREFIX + 'pairId');
    state.addedBy = localStorage.getItem(STORAGE_PREFIX + 'addedBy') || 'Talia';
  }

  function hasChosenSolo() {
    return localStorage.getItem(HAS_CHOSEN_SOLO_KEY) === 'true';
  }

  function setChosenSolo() {
    localStorage.setItem(HAS_CHOSEN_SOLO_KEY, 'true');
  }

  function savePairState() {
    if (state.pairId) localStorage.setItem(STORAGE_PREFIX + 'pairId', state.pairId);
    if (state.addedBy) localStorage.setItem(STORAGE_PREFIX + 'addedBy', state.addedBy);
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'data');
      if (stored) {
        const parsed = JSON.parse(stored);
        state.items = parsed.items || [];
        state.todaySuggestionIds = parsed.todaySuggestionIds || [];
        state.lastCategory = parsed.lastCategory || 'life';
        state.customLabels = parsed.customLabels || {};
        state.categoryPreset = parsed.categoryPreset || 'generic';
        state.buttonColor = parsed.buttonColor || null;
        state.textColor = parsed.textColor || null;
        state.displayName = parsed.displayName || '';
      }
      const tally = localStorage.getItem(STORAGE_PREFIX + 'tally');
      if (tally) {
        const { count, date } = JSON.parse(tally);
        const today = new Date().toDateString();
        if (date === today) state.completedTodayCount = count;
        else state.completedTodayCount = 0;
      }
    } catch (e) {
      console.warn('Load failed', e);
      showToast('Could not load saved data — starting fresh');
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'data', JSON.stringify({
        items: state.items,
        todaySuggestionIds: state.todaySuggestionIds,
        lastCategory: state.lastCategory,
        customLabels: state.customLabels,
        categoryPreset: state.categoryPreset || 'generic',
        buttonColor: state.buttonColor,
        textColor: state.textColor,
        displayName: state.displayName || ''
      }));
      localStorage.setItem(STORAGE_PREFIX + 'tally', JSON.stringify({
        count: state.completedTodayCount,
        date: new Date().toDateString()
      }));
    } catch (e) {
      console.warn('Save failed', e);
      showToast('Could not save — check storage or try again');
    }
  }

  function detectCategory(text) {
    const t = (text || '').toLowerCase();
    const preset = state.categoryPreset || 'generic';
    if (preset === 'creative') {
      if (t.includes('misfit')) return 'misfit';
      if (t.includes('barclay') || t.includes('stop 2030') || t.includes('stop2030')) return 'stop2030barclay';
      if (t.includes('cycles')) return 'cycles';
      if (t.includes('life')) return 'life';
    } else {
      if (t.includes('work')) return 'work';
      if (t.includes('hobbi') || t.includes('hobby')) return 'hobbies';
      if (t.includes('life')) return 'life';
    }
    return null;
  }

  function extractDeadline(text) {
    const t = (text || '').toLowerCase();
    const now = new Date();
    const year = now.getFullYear();

    const monthDay = t.match(/(?:due\s+)?(?:by\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?/i);
    if (monthDay) {
      const m = MONTHS[monthDay[1].toLowerCase().slice(0,3)];
      const d = parseInt(monthDay[2], 10);
      const y = monthDay[3] ? parseInt(monthDay[3], 10) : year;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
    const slash = t.match(/(?:due\s+)?(?:by\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (slash) {
      const m = parseInt(slash[1], 10);
      const d = parseInt(slash[2], 10);
      const y = slash[3] ? (slash[3].length === 2 ? 2000 + parseInt(slash[3], 10) : parseInt(slash[3], 10)) : year;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }

    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const nextDay = t.match(/(?:due\s+)?(?:by\s+)?(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (nextDay) {
      const targetDay = dayNames.indexOf(nextDay[1].toLowerCase());
      const isThis = /this\s+/.test(t);
      let d = new Date(now);
      const currentDay = d.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0 && !isThis) diff += 7;
      else if (diff < 0 && isThis) diff += 7;
      else if (diff === 0 && isThis) diff = 0;
      else if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }

    const endOfMonth = t.match(/(?:due\s+)?(?:by\s+)?(?:the\s+)?(?:end\s+of\s+(?:the\s+)?month|eom)/i);
    if (endOfMonth) {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return d.toISOString().slice(0, 10);
    }

    const inWeeks = t.match(/(?:due\s+)?(?:by\s+)?(?:in\s+)?(\d+)\s+weeks?(?:\s+from\s+now)?/i);
    if (inWeeks) {
      const d = new Date(now);
      d.setDate(d.getDate() + parseInt(inWeeks[1], 10) * 7);
      return d.toISOString().slice(0, 10);
    }

    const inDays = t.match(/(?:due\s+)?(?:by\s+)?(?:in\s+)?(\d+)\s+days?(?:\s+from\s+now)?/i);
    if (inDays) {
      const d = new Date(now);
      d.setDate(d.getDate() + parseInt(inDays[1], 10));
      return d.toISOString().slice(0, 10);
    }

    if (/\b(?:due\s+)?(?:by\s+)?tomorrow\b/i.test(t)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }

    if (/\b(?:due\s+)?(?:by\s+)?next\s+week\b/i.test(t)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    }

    if (typeof window !== 'undefined' && window.chrono) {
      try {
        const parsed = window.chrono.parseDate(t);
        if (parsed && !isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      } catch (e) { /* fallback to null */ }
    }
    return null;
  }

  function stripAutoExtractedFromText(text, category, deadline) {
    let result = (text || '').trim();
    if (!result) return result;
    if (deadline) {
      result = result.replace(/(?:due\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:\s+\d{4})?/gi, '');
      result = result.replace(/(?:due\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?(?:the\s+)?end\s+of\s+(?:the\s+)?(?:next\s+)?month/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?eom\b/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?(?:next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?(?:in\s+)?\d+\s+(?:days?|weeks?)(?:\s+from\s+now)?/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?tomorrow\b/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?next\s+week\b/gi, '');
    }
    if (category) {
      if (category === 'work') result = result.replace(/\bwork\b/gi, '');
      if (category === 'hobbies') result = result.replace(/\bhobbies?\b/gi, '');
      if (category === 'life') result = result.replace(/\blife\b/gi, '');
      if (category === 'misfit') result = result.replace(/\bmisfit\b/gi, '');
      if (category === 'stop2030barclay') result = result.replace(/\b(barclay|stop\s*2030|stop2030)\b/gi, '');
      if (category === 'cycles') result = result.replace(/\bcycles\b/gi, '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  function createItem(text, category, deadline, priority, recurrence) {
    const cleanText = stripAutoExtractedFromText(text, category, deadline) || text.trim();
    return {
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      text: cleanText || text.trim(),
      category: category || state.lastCategory,
      parkedAt: Date.now(),
      deadline: deadline || null,
      priority: priority || 'medium',
      recurrence: recurrence || null,
      archived: false
    };
  }

  function formatDuration(ms) {
    const days = Math.floor(ms / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1d';
    if (days < 7) return days + 'd';
    if (days < 30) return Math.floor(days / 7) + 'w';
    if (days < 365) return Math.floor(days / 30) + 'mo';
    return Math.floor(days / 365) + 'y';
  }

  function formatDeadline(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    const diff = (d - today) / 86400000;
    if (diff < 0) return { text: 'OVERDUE (' + Math.abs(Math.floor(diff)) + 'd)', overdue: true };
    if (diff === 0) return { text: 'Today', overdue: false };
    if (diff <= 7) return { text: 'In ' + Math.floor(diff) + 'd', overdue: false };
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
  }

  function sortItems(items) {
    return [...items].sort((a, b) => {
      const aOverdue = a.deadline && new Date(a.deadline) < new Date();
      const bOverdue = b.deadline && new Date(b.deadline) < new Date();
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return a.parkedAt - b.parkedAt;
    });
  }

  function getActiveItems() {
    return state.items.filter(i => !i.archived);
  }

  function getItemsByCategory(cat) {
    let items = getActiveItems().filter(i => i.category === cat);
    const q = (state.searchQuery || '').trim().toLowerCase();
    if (q) items = items.filter(i => (i.text || '').toLowerCase().includes(q));
    return items;
  }

  function getCategoryLabel(catId) {
    if (state.customLabels[catId]) return state.customLabels[catId];
    const cat = getCategories().find(c => c.id === catId);
    return cat ? cat.label : catId;
  }

  function getColumnColor(catId) {
    if (catId === '__button' || catId === '__text') return null;
    return state.columnColors[catId] || DEFAULT_COLUMN_COLORS[catId] || '#6b7280';
  }

  function getActiveColumnColors() {
    const out = {};
    Object.keys(state.columnColors || {}).forEach(k => {
      if (k !== '__button' && k !== '__text') out[k] = state.columnColors[k];
    });
    return out;
  }

  function applyThemeColors() {
    const root = document.documentElement;
    if (state.buttonColor) root.style.setProperty('--accent-button', state.buttonColor);
    else root.style.removeProperty('--accent-button');
    if (state.textColor) root.style.setProperty('--accent-text', state.textColor);
    else root.style.removeProperty('--accent-text');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

  function renderColumns() {
    const container = document.getElementById('columns');
    if (!container) return;
    const cats = state.drillDownCategory ? [state.drillDownCategory] : getCategories().map(c => c.id);
    container.classList.toggle('single-column', !!state.drillDownCategory);

    container.innerHTML = cats.map(catId => {
      const items = sortItems(getItemsByCategory(catId));
      const label = getCategoryLabel(catId);
      const color = getColumnColor(catId);

      return `
        <div class="column column-accent" data-category="${catId}" style="--column-accent: ${color}">
          <div class="column-header" data-category="${catId}">
            ${escapeHtml(label)} <span class="count">(${items.length})</span>
          </div>
          <div class="column-items">
            ${items.length ? items.map(item => renderTaskCard(item)).join('') : `
              <div class="empty-state column-add-hint" data-category="${catId}">Nothing here yet—click to add</div>
            `}
          </div>
          <button type="button" class="column-add-btn" data-category="${catId}" title="Add task">+ Add</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.column-header').forEach(el => {
      el.addEventListener('click', () => {
        if (state.drillDownCategory) {
          state.drillDownCategory = null;
          document.getElementById('back-btn').style.display = 'none';
        } else {
          state.drillDownCategory = el.dataset.category;
          document.getElementById('back-btn').style.display = 'inline-block';
        }
        renderColumns();
      });
    });

    container.querySelectorAll('.task-card input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.closest('.task-card').dataset.id;
        if (e.target.checked) state.selectedIds.add(id);
        else state.selectedIds.delete(id);
        updateAddToSuggestionsBtn();
      });
    });

    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.task-actions') || e.target.type === 'checkbox') return;
        const id = card.dataset.id;
        state.selectedIds.has(id) ? state.selectedIds.delete(id) : state.selectedIds.add(id);
        card.classList.toggle('selected', state.selectedIds.has(id));
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = state.selectedIds.has(id);
        updateAddToSuggestionsBtn();
      });
    });

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(btn.dataset.id);
      });
    });
    container.querySelectorAll('.btn-drop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteItem(btn.dataset.id, true);
      });
    });

    container.querySelectorAll('.btn-move').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const newCat = e.target.value;
        if (!newCat) return;
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.category = newCat;
          saveState();
          renderColumns();
        }
        e.target.value = '';
      });
    });

    container.querySelectorAll('.column-add-btn, .column-add-hint').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = el.dataset.category;
        if (cat) openAddModal(cat);
      });
    });
  }

  function renderTaskCard(item) {
    const fd = formatDeadline(item.deadline);
    const duration = formatDuration(Date.now() - item.parkedAt);
    const checked = state.selectedIds.has(item.id);
    const overdue = fd && fd.overdue;

    const daysParked = Math.floor((Date.now() - item.parkedAt) / 86400000);
    const staleNudge = daysParked >= 30 ? ` title="Parked ${daysParked} days — consider doing it or dropping it"` : '';

    return `
      <div class="task-card ${overdue ? 'overdue' : ''} ${checked ? 'selected' : ''} ${daysParked >= 30 ? 'stale-nudge' : ''}" data-id="${item.id}"${staleNudge}>
        <input type="checkbox" ${checked ? 'checked' : ''}>
        <div class="task-content">
          <div class="task-text">${escapeHtml(item.text)}</div>
          <div class="task-meta">
            <span>Parked ${duration}</span>
            ${fd ? `<span class="${overdue ? 'overdue-badge' : ''}">${escapeHtml(fd.text)}</span>` : ''}
            ${daysParked >= 30 ? `<span class="stale-badge" title="Parked ${daysParked} days">${daysParked}d</span>` : ''}
            ${item.recurrence ? `<span class="recurrence-badge" title="Recurs ${item.recurrence}">↻</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <select class="btn-move" data-id="${item.id}" title="Move to column">
            <option value="">Move</option>
            ${getCategories().map(c => `<option value="${c.id}" ${c.id === item.category ? 'disabled' : ''}>${escapeHtml(getCategoryLabel(c.id))}</option>`).join('')}
          </select>
          <button class="btn-edit" data-id="${item.id}" title="Edit">✎</button>
          <button class="btn-drop" data-id="${item.id}" title="Drop">×</button>
        </div>
      </div>
    `;
  }

  function renderTalkAbout() {
    const list = document.getElementById('talk-about-list');
    if (!list) return;
    const items = state.talkAboutItems;
    list.innerHTML = items.length ? items.map(item => `
      <div class="talk-about-item" data-id="${item.id}">
        <span class="task-text">${escapeHtml(item.text)}</span>
        <span class="added-by">(${escapeHtml(item.added_by)})</span>
        <button class="btn-resolve-talk" data-id="${item.id}" title="Mark discussed">✓</button>
      </div>
    `).join('') : '<div class="empty-state">Nothing to discuss yet—add something above</div>';

    list.querySelectorAll('.btn-resolve-talk').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        resolveTalkAbout(btn.dataset.id);
      });
    });
  }

  async function resolveTalkAbout(id) {
    if (!window.talkAbout) return;
    const { error } = await window.talkAbout.resolveTalkAbout(id);
    if (error) showToast('Failed to resolve');
    else state.talkAboutItems = state.talkAboutItems.filter(i => i.id !== id);
    renderTalkAbout();
  }

  function moveTodayUp(id) {
    const idx = state.todaySuggestionIds.indexOf(id);
    if (idx <= 0) return;
    state.todaySuggestionIds.splice(idx, 1);
    state.todaySuggestionIds.splice(idx - 1, 0, id);
    saveState();
    renderTodayList();
    renderFocusList();
  }

  function moveTodayDown(id) {
    const idx = state.todaySuggestionIds.indexOf(id);
    if (idx < 0 || idx >= state.todaySuggestionIds.length - 1) return;
    state.todaySuggestionIds.splice(idx, 1);
    state.todaySuggestionIds.splice(idx + 1, 0, id);
    saveState();
    renderTodayList();
    renderFocusList();
  }

  function renderTodayList() {
    const list = document.getElementById('today-list');
    if (!list) return;
    const ids = state.todaySuggestionIds;
    const items = ids.map(id => state.items.find(i => i.id === id)).filter(Boolean);

    list.innerHTML = items.map((item, idx) => {
      const accent = getColumnColor(item.category);
      const canUp = idx > 0;
      const canDown = idx < items.length - 1;
      return `<div class="today-item today-item-accent" data-id="${item.id}" style="--today-accent: ${accent}">
        <div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!canUp ? 'disabled' : ''} title="Move up">↑</button>
          <button type="button" class="btn-order" data-action="down" ${!canDown ? 'disabled' : ''} title="Move down">↓</button>
        </div>
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done" title="Done">Done</button>
        <button class="btn-remove" title="Remove from suggestions">Remove</button>
      </div>`;
    }).join('') || '<div class="empty-state">Pick items from the columns below, then click "Add selected to Today\'s Suggestions"</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.today-item').dataset.id;
        if (e.target.dataset.action === 'up') moveTodayUp(id);
        else moveTodayDown(id);
      });
    });
  }

  function renderFocusList() {
    const list = document.getElementById('focus-list');
    if (!list) return;
    const items = state.todaySuggestionIds
      .map(id => state.items.find(i => i.id === id))
      .filter(Boolean);

    list.innerHTML = items.map((item, idx) => {
      const accent = getColumnColor(item.category);
      const canUp = idx > 0;
      const canDown = idx < items.length - 1;
      return `<div class="today-item today-item-accent task-card" data-id="${item.id}" style="--today-accent: ${accent}">
        <div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!canUp ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-order" data-action="down" ${!canDown ? 'disabled' : ''}>↓</button>
        </div>
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done">Done</button>
        <button class="btn-remove">Remove from suggestions</button>
      </div>`;
    }).join('') || '<div class="empty-state">Add items from the overview to get started</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.today-item').dataset.id;
        if (e.target.dataset.action === 'up') moveTodayUp(id);
        else moveTodayDown(id);
      });
    });
  }

  function updateTally() {
    const str = 'Completed today: ' + state.completedTodayCount;
    const tallyEl = document.getElementById('completed-tally');
    if (tallyEl) tallyEl.textContent = str;
    const focusTally = document.getElementById('focus-tally');
    if (focusTally) focusTally.textContent = str;
  }

  function updateAddToSuggestionsBtn() {
    const btn = document.getElementById('add-to-suggestions-btn');
    if (!btn) return;
    const count = state.selectedIds.size;
    const remaining = 5 - state.todaySuggestionIds.length;
    btn.disabled = count === 0 || remaining <= 0;
    btn.textContent = count && remaining > 0
      ? `Add ${Math.min(count, remaining)} to Today's Suggestions`
      : 'Add selected to Today\'s Suggestions';
  }

  function addToSuggestions() {
    const remaining = 5 - state.todaySuggestionIds.length;
    const toAdd = [...state.selectedIds].slice(0, remaining);
    toAdd.forEach(id => {
      state.todaySuggestionIds.push(id);
      state.selectedIds.delete(id);
    });
    saveState();
    renderTodayList();
    renderColumns();
    updateAddToSuggestionsBtn();
  }

  function removeFromSuggestions(id) {
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();
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
    const newItem = createItem(item.text, item.category, nextDeadline, item.priority, item.recurrence);
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
    item.archived = true;
    item.archivedAt = item.archivedAt || Date.now();
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    state.completedTodayCount++;
    const respawnedId = item.recurrence ? respawnRecurring(item) : null;
    saveState();
    updateTally();
    renderTodayList();
    renderFocusList();
    renderColumns();

    state.processingIds.delete(id);
    showToast('Done', () => {
      item.archived = prevArchived;
      item.archivedAt = prevArchivedAt;
      if (wasInSuggestions) state.todaySuggestionIds.push(id);
      state.completedTodayCount = Math.max(0, state.completedTodayCount - 1);
      if (respawnedId) state.items = state.items.filter(i => i.id !== respawnedId);
      saveState();
      updateTally();
      renderTodayList();
      renderFocusList();
      renderColumns();
    });
    if (state.undoDoneTimeout) clearTimeout(state.undoDoneTimeout);
    state.undoDoneTimeout = setTimeout(() => { /* toast hides */ }, 5000);
  }

  function deleteItem(id, showUndo = true) {
    if (state.processingIds.has(id)) return;
    const idx = state.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    state.processingIds.add(id);
    const item = state.items[idx];
    state.items.splice(idx, 1);
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    state.selectedIds.delete(id);
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();

    state.processingIds.delete(id);
    if (showUndo) {
      state.undoItem = item;
      showToast('Removed', () => {
        state.items.push(state.undoItem);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
      });
      if (state.undoTimeout) clearTimeout(state.undoTimeout);
      state.undoTimeout = setTimeout(() => { state.undoItem = null; }, 5000);
    }
  }

  function showToast(message, onUndo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = message + (onUndo ? '<span class="undo-btn">Undo</span>' : '');
    toast.classList.add('visible');
    if (onUndo) {
      const undoBtn = toast.querySelector('.undo-btn');
      if (undoBtn) undoBtn.onclick = () => {
        onUndo();
        toast.classList.remove('visible');
      };
    }
    setTimeout(() => toast.classList.remove('visible'), 5000);
  }

  function updateCategorySelectOptions() {
    const sel = document.getElementById('category-select');
    if (!sel) return;
    sel.innerHTML = getCategories().map(c =>
      `<option value="${c.id}">${escapeHtml(getCategoryLabel(c.id))}</option>`
    ).join('');
  }

  function openAddModal(presetCategory) {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'flex';
    updateCategorySelectOptions();
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
    const submitVoice = document.getElementById('submit-voice');
    if (submitVoice) submitVoice.disabled = true;
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.value = '';
      taskInput.focus();
    }
    const quickInput = document.getElementById('quick-input');
    if (quickInput) quickInput.value = '';
    const deadlineInput = document.getElementById('deadline-input');
    if (deadlineInput) deadlineInput.value = '';
    const recurrenceSelect = document.getElementById('recurrence-select');
    if (recurrenceSelect) recurrenceSelect.value = '';
    const prioritySelect = document.getElementById('priority-select');
    if (prioritySelect) prioritySelect.value = 'medium';
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) categorySelect.value = presetCategory || state.lastCategory;
    if (presetCategory) state.lastCategory = presetCategory;
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
      const item = createItem(line, cat, deadline, 'medium');
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
      const item = createItem(line, cat, deadline, 'medium');
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

  function openSettingsModal() {
    const displayNameEl = document.getElementById('settings-display-name');
    if (displayNameEl) displayNameEl.value = state.displayName || '';

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
          saveColumnColorsToSupabase();
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
            saveColumnColorsToSupabase();
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

    document.getElementById('settings-modal').style.display = 'flex';
  }

  function getPreferencesForSupabase() {
    const prefs = { ...getActiveColumnColors() };
    if (state.buttonColor) prefs.__button = state.buttonColor;
    if (state.textColor) prefs.__text = state.textColor;
    return prefs;
  }

  function saveColumnColorsToSupabase() {
    if (!window.talkAbout || !state.pairId) return;
    if (state.savePrefsTimeout) clearTimeout(state.savePrefsTimeout);
    state.savePrefsTimeout = setTimeout(async () => {
      state.savePrefsTimeout = null;
      try {
        const { error } = await window.talkAbout.saveUserPreferences(state.pairId, state.addedBy, getPreferencesForSupabase());
        if (error) showToast('Could not sync preferences — will retry when online');
      } catch (e) {
        showToast('Could not sync preferences — will retry when online');
      }
    }, 500);
  }

  function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
  }

  async function saveSettingsAndClose() {
    const newPreset = (document.querySelector('input[name="category-preset"]:checked') || {}).value || 'generic';
    const oldPreset = state.categoryPreset || 'generic';
    if (newPreset !== oldPreset) {
      const mapKey = oldPreset + '_to_' + newPreset;
      const map = PRESET_MIGRATION[mapKey];
      if (map) {
        state.items.forEach(item => {
          if (map[item.category]) item.category = map[item.category];
        });
        state.categoryPreset = newPreset;
        state.customLabels = {};
        const newCats = CATEGORY_PRESETS[newPreset];
        state.lastCategory = (newCats && newCats[0]) ? newCats[0].id : 'life';
      }
    }
    const displayNameInp = document.getElementById('settings-display-name');
    if (displayNameInp) state.displayName = displayNameInp.value.trim();

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
    applyThemeColors();
    if (window.talkAbout && state.pairId) {
      await window.talkAbout.saveUserPreferences(state.pairId, state.addedBy, getPreferencesForSupabase());
    }
    saveState();
    updateCategorySelectOptions();
    renderColumns();
    const badge = document.getElementById('pair-badge');
    if (badge) {
      if (state.pairId) badge.textContent = state.pairId + ' · ' + ((state.displayName || '').trim() || state.addedBy);
      else badge.textContent = (state.displayName || '').trim() || 'Solo';
    }
    closeSettingsModal();
    showToast('Settings saved');
  }

  function applySmartFields() {
    const textEl = document.getElementById('task-input');
    if (!textEl) return;
    const text = textEl.value;
    const cat = detectCategory(text);
    if (cat) document.getElementById('category-select').value = cat;
    const deadline = extractDeadline(text);
    if (deadline) document.getElementById('deadline-input').value = deadline;
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
    const priority = document.getElementById('priority-select').value;
    const recurrenceEl = document.getElementById('recurrence-select');
    const recurrence = (recurrenceEl && recurrenceEl.value) ? recurrenceEl.value : null;
    if (submitBtn) submitBtn.disabled = true;
    state.lastCategory = category;
    const item = createItem(text, category, deadline, priority, recurrence);
    state.items.push(item);
    saveState();
    closeAddModal();
    renderColumns();
    if (submitBtn) submitBtn.disabled = false;
  }

  function openEditModal(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.editingId = id;
    document.getElementById('edit-text').value = item.text;
    document.getElementById('edit-category').innerHTML = getCategories().map(c =>
      `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${escapeHtml(getCategoryLabel(c.id))}</option>`
    ).join('');
    document.getElementById('edit-deadline').value = item.deadline || '';
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
    item.deadline = document.getElementById('edit-deadline').value || null;
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
    const data = {
      items: state.items,
      todaySuggestionIds: state.todaySuggestionIds,
      exportedAt: new Date().toISOString()
    };
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
    renderEmailTriage();
    if (window.talkAbout && typeof SUPABASE_URL !== 'undefined') {
      const section = document.getElementById('email-triage-section');
      if (section) section.style.display = 'block';
    } else {
      showToast('Email triage unavailable — connect Supabase first');
    }
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
    if (window.talkAbout && state.pairId) {
      const prefs = await window.talkAbout.getUserPreferences(state.pairId, state.addedBy);
      if (prefs?.error) {
        showToast('Could not load preferences — using local settings');
      } else if (prefs && typeof prefs === 'object') {
        if (prefs.__button) { state.buttonColor = prefs.__button; delete prefs.__button; }
        if (prefs.__text) { state.textColor = prefs.__text; delete prefs.__text; }
        if (Object.keys(prefs).length) state.columnColors = prefs;
      }
    }
    applyThemeColors();
    updateCategorySelectOptions();
    renderColumns();
    renderTodayList();
    renderTalkAbout();
    renderEmailTriage();
    updateTally();
    updateAddToSuggestionsBtn();
    if (window.talkAbout && state.pairId) {
      if (state.talkAboutUnsubscribe) state.talkAboutUnsubscribe();
      state.talkAboutUnsubscribe = window.talkAbout.subscribeTalkAbout(state.pairId, (items) => {
        state.talkAboutItems = items;
        renderTalkAbout();
      });
    } else if (state.talkAboutUnsubscribe) {
      state.talkAboutUnsubscribe();
      state.talkAboutUnsubscribe = null;
    }
    const triagePairId = state.pairId || 'solo_default';
    const triageAddedBy = state.addedBy;
    if (window.talkAbout) {
      window.talkAbout.getLastAgentRun(triagePairId, triageAddedBy).then(run => {
        state.lastAgentRun = run;
        renderEmailTriage();
      });
      if (state.emailTriageUnsubscribe) state.emailTriageUnsubscribe();
      state.emailTriageUnsubscribe = window.talkAbout.subscribeEmailTasks(triagePairId, triageAddedBy, items => {
        state.emailTriageItems = items;
        renderEmailTriage();
      });
    }
  }

  function renderEmailTriage() {
    const section = document.getElementById('email-triage-section');
    const list = document.getElementById('email-triage-list');
    const statusEl = document.getElementById('email-triage-status');
    const emptyEl = document.getElementById('email-triage-empty');
    if (!section || !list) return;
    if (!window.talkAbout || typeof SUPABASE_URL === 'undefined') {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    const items = state.emailTriageItems || [];
    if (statusEl) {
      const run = state.lastAgentRun;
      if (run) {
        const d = run.run_at ? new Date(run.run_at) : null;
        const ago = d ? (Math.round((Date.now() - d) / 60000) + ' min ago') : '';
        const status = run.status === 'failed' ? 'Last triage failed' : (run.status === 'partial' ? 'Last triage partial' : 'Last triage');
        statusEl.textContent = status + (ago ? ': ' + ago : '') + (run.error_message ? ' — ' + run.error_message : '');
      } else {
        statusEl.textContent = 'Last triage: —';
      }
    }
    if (items.length === 0) {
      list.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    list.innerHTML = items.map(t => {
      const gmailUrl = t.thread_id
        ? 'https://mail.google.com/mail/u/0/#inbox/' + encodeURIComponent(t.thread_id)
        : 'https://mail.google.com/mail/u/0/#inbox';
      const subj = escapeHtml((t.subject || '').slice(0, 60));
      const text = escapeHtml((t.text || '').slice(0, 120));
      const draft = t.draft_reply ? '<details class="email-triage-draft"><summary>Draft reply</summary><pre>' + escapeHtml(t.draft_reply.slice(0, 500)) + '</pre></details>' : '';
      return `<div class="email-triage-card" data-id="${t.id}">
        <div class="email-triage-card-main">
          <strong>${subj}</strong>
          <p class="email-triage-text">${text}</p>
          ${draft}
          <div class="email-triage-actions">
            <select class="email-triage-category" data-id="${t.id}">${getCategories().map(c => `<option value="${c.id}" ${c.id === t.category ? 'selected' : ''}>${escapeHtml(getCategoryLabel(c.id))}</option>`).join('')}</select>
            <button class="btn-primary btn-sm email-triage-add" data-id="${t.id}">Add to column</button>
            <button class="btn-secondary btn-sm email-triage-dismiss" data-id="${t.id}">Dismiss</button>
            <a href="${gmailUrl}" target="_blank" rel="noopener" class="email-triage-link">Open in Gmail</a>
          </div>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('.email-triage-add').forEach(btn => {
      btn.addEventListener('click', () => addEmailTaskToParkingLot(btn.dataset.id));
    });
    list.querySelectorAll('.email-triage-dismiss').forEach(btn => {
      btn.addEventListener('click', () => dismissEmailTask(btn.dataset.id));
    });
  }

  function addEmailTaskToParkingLot(id) {
    const t = state.emailTriageItems.find(x => x.id === id);
    if (!t || !window.talkAbout) return;
    const cat = document.querySelector(`.email-triage-category[data-id="${id}"]`)?.value || t.category;
    const item = createItem(t.text, cat, t.deadline, t.priority || 'medium');
    state.items.push(item);
    state.lastCategory = cat;
    saveState();
    window.talkAbout.approveEmailTask(id).then(({ error }) => {
      if (error) showToast('Failed to approve');
      else {
        state.emailTriageItems = state.emailTriageItems.filter(x => x.id !== id);
        renderEmailTriage();
        renderColumns();
        showToast('Added to ' + getCategoryLabel(cat));
      }
    });
  }

  function dismissEmailTask(id) {
    if (!window.talkAbout) return;
    window.talkAbout.deleteEmailTask(id).then(({ error }) => {
      if (error) showToast('Failed to dismiss');
      else {
        state.emailTriageItems = state.emailTriageItems.filter(x => x.id !== id);
        renderEmailTriage();
        showToast('Dismissed');
      }
    });
  }

  function bindEvents() {
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

    const addToSuggestionsBtn = document.getElementById('add-to-suggestions-btn');
    if (addToSuggestionsBtn) addToSuggestionsBtn.addEventListener('click', addToSuggestions);

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

    document.addEventListener('keydown', (e) => {
      const mainApp = document.getElementById('main-app');
      if (!mainApp || mainApp.style.display === 'none') return;
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openAddModal();
      } else if (e.key === 'Escape') {
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') {
          closeShortcutsOverlay();
        } else if (document.body.classList.contains('sidebar-open')) {
          closeSidebar();
        } else {
          const modals = ['add-modal', 'edit-modal', 'archive-modal', 'settings-modal', 'link-partner-modal'];
          const panels = ['analytics-panel', 'email-triage-section'];
          for (const id of modals) {
            const m = document.getElementById(id);
            if (m && m.style.display === 'flex') {
              if (id === 'add-modal') closeAddModal();
              else if (id === 'edit-modal') { m.style.display = 'none'; state.editingId = null; }
              else if (id === 'archive-modal') m.style.display = 'none';
              else if (id === 'settings-modal') closeSettingsModal();
              else if (id === 'link-partner-modal') closeLinkPartnerModal();
              return;
            }
          }
          for (const id of panels) {
            const p = document.getElementById(id);
            if (p && p.style.display === 'block') { p.style.display = 'none'; return; }
          }
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') closeShortcutsOverlay();
        else openShortcutsOverlay();
      }
    });

    const focusBtn = document.getElementById('focus-btn');
    if (focusBtn) focusBtn.addEventListener('click', toggleFocusMode);

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

    const btnColorEl = document.getElementById('settings-button-color');
    const btnHexEl = document.getElementById('settings-button-hex');
    const textColorEl = document.getElementById('settings-text-color');
    const textHexEl = document.getElementById('settings-text-hex');
    if (btnColorEl) btnColorEl.addEventListener('input', (e) => {
      state.buttonColor = e.target.value;
      if (btnHexEl) btnHexEl.value = e.target.value;
      applyThemeColors();
      saveColumnColorsToSupabase();
    });
    if (btnHexEl) btnHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.buttonColor = val;
        if (btnColorEl) btnColorEl.value = val;
        applyThemeColors();
        saveColumnColorsToSupabase();
      }
    });
    if (textColorEl) textColorEl.addEventListener('input', (e) => {
      state.textColor = e.target.value;
      if (textHexEl) textHexEl.value = e.target.value;
      applyThemeColors();
      saveColumnColorsToSupabase();
    });
    if (textHexEl) textHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.textColor = val;
        if (textColorEl) textColorEl.value = val;
        applyThemeColors();
        saveColumnColorsToSupabase();
      }
    });

    const archiveBtn = document.getElementById('archive-btn');
    if (archiveBtn) archiveBtn.addEventListener('click', openArchiveModal);

    const closeArchive = document.getElementById('close-archive');
    if (closeArchive) closeArchive.addEventListener('click', () => {
      const m = document.getElementById('archive-modal');
      if (m) m.style.display = 'none';
    });

    const archiveModal = document.getElementById('archive-modal');
    if (archiveModal) archiveModal.addEventListener('click', (e) => {
      if (e.target.id === 'archive-modal') archiveModal.style.display = 'none';
    });

    const analyticsBtn = document.getElementById('analytics-btn');
    if (analyticsBtn) analyticsBtn.addEventListener('click', openAnalytics);

    const emailTriageBtn = document.getElementById('email-triage-btn');
    if (emailTriageBtn) emailTriageBtn.addEventListener('click', openEmailTriage);

    const closeEmailTriage = document.getElementById('close-email-triage');
    if (closeEmailTriage) closeEmailTriage.addEventListener('click', () => {
      const s = document.getElementById('email-triage-section');
      if (s) s.style.display = 'none';
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
      if (e.key === 'Enter') addTalkAbout();
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

    if (createBtn) createBtn.addEventListener('click', () => {
      state.pairId = window.talkAbout ? window.talkAbout.generatePairId() : 'demo' + Date.now().toString(36).slice(-6);
      state.addedBy = 'Talia';
      savePairState();
      if (actions) actions.style.display = 'none';
      if (created) created.style.display = 'block';
      if (codeEl) codeEl.textContent = state.pairId;
    });

    if (continueBtn) continueBtn.addEventListener('click', () => {
      closeLinkPartnerModal();
      showMainApp();
    });

    if (joinBtn) joinBtn.addEventListener('click', () => {
      const code = (joinInput && joinInput.value) ? joinInput.value.trim().toLowerCase() : '';
      if (!code) { showToast('Enter a pair code'); return; }
      const asTalia = document.getElementById('link-join-talia');
      state.pairId = code;
      state.addedBy = (asTalia && asTalia.checked) ? 'Talia' : 'Garren';
      savePairState();
      closeLinkPartnerModal();
      showMainApp();
    });

    if (joinInput) joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('link-join-btn').click();
    });
  }

  function bindPairSetup() {
    const createBtn = document.getElementById('create-pair-btn');
    if (createBtn) createBtn.addEventListener('click', () => {
      state.pairId = window.talkAbout ? window.talkAbout.generatePairId() : 'demo' + Date.now().toString(36).slice(-6);
      state.addedBy = 'Talia';
      savePairState();
      document.getElementById('pair-created').style.display = 'block';
      document.querySelector('.pair-actions').style.display = 'none';
      document.getElementById('pair-code-display').textContent = state.pairId;
    });

    const continueBtn = document.getElementById('continue-after-create');
    if (continueBtn) continueBtn.addEventListener('click', () => {
      document.getElementById('pair-created').style.display = 'none';
      showMainApp();
      bindEvents();
    });

    const joinBtn = document.getElementById('join-pair-btn');
    if (joinBtn) joinBtn.addEventListener('click', () => {
      const input = document.getElementById('join-code-input');
      const code = (input && input.value) ? input.value.trim().toLowerCase() : '';
      if (!code) {
        showToast('Enter a pair code');
        return;
      }
      const asTalia = document.getElementById('join-as-talia');
      state.pairId = code;
      state.addedBy = (asTalia && asTalia.checked) ? 'Talia' : 'Garren';
      savePairState();
      document.getElementById('pair-setup').style.display = 'none';
      showMainApp();
      bindEvents();
    });

    const joinInput = document.getElementById('join-code-input');
    if (joinInput) joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('join-pair-btn').click();
    });
  }

  function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    banner.style.display = navigator.onLine ? 'none' : 'block';
  }

  function init() {
    window.addEventListener('online', () => {
      updateOfflineBanner();
      showToast('Back online — sync resumed');
      if (window.talkAbout && state.pairId) saveColumnColorsToSupabase();
    });
    window.addEventListener('offline', updateOfflineBanner);
    updateOfflineBanner();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service worker registration failed', err);
        showToast('Offline mode limited — refresh when online');
      });
    }
    loadPairState();
    if (state.pairId) {
      document.getElementById('entry-screen').style.display = 'none';
      document.getElementById('pair-setup').style.display = 'none';
      showMainApp();
      bindEvents();
    } else if (hasChosenSolo()) {
      document.getElementById('entry-screen').style.display = 'none';
      document.getElementById('pair-setup').style.display = 'none';
      showMainApp();
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
    if (soloBtn) soloBtn.addEventListener('click', () => {
      setChosenSolo();
      document.getElementById('entry-screen').style.display = 'none';
      showMainApp();
      bindEvents();
    });
    if (coupleBtn) coupleBtn.addEventListener('click', () => {
      document.getElementById('entry-screen').style.display = 'none';
      document.getElementById('pair-setup').style.display = 'block';
      bindPairSetup();
    });
  }

  bindLinkPartnerModal();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
