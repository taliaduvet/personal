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

  function getOrderedCategoryIds() {
    const baseIds = getCategories().map(c => c.id);
    if (state.columnOrder && state.columnOrder.length) {
      const order = state.columnOrder.filter(id => baseIds.includes(id));
      const rest = baseIds.filter(id => !order.includes(id));
      return [...order, ...rest];
    }
    return baseIds;
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
    deviceSyncId: null,
    talkAboutItems: [],
    talkAboutUnsubscribe: null,
    prefsUnsubscribe: null,
    customLabels: {},
    columnColors: {},
    columnOrder: null,
    categoryPreset: 'generic',
    buttonColor: null,
    textColor: null,
    displayName: '',
    emailTriageItems: [],
    lastAgentRun: null,
    emailTriageUnsubscribe: null,
    savePrefsTimeout: null,
    processingIds: new Set(),
    expandingMetaCardId: null,
    addFromTalkItem: null,
    tallyResetHour: 3
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

  function loadDeviceSyncState() {
    state.deviceSyncId = localStorage.getItem(STORAGE_PREFIX + 'deviceSyncId');
  }

  function saveDeviceSyncState() {
    if (state.deviceSyncId) localStorage.setItem(STORAGE_PREFIX + 'deviceSyncId', state.deviceSyncId);
  }

  function getTallyDate() {
    const n = new Date();
    const hour = (state.tallyResetHour != null && state.tallyResetHour >= 0 && state.tallyResetHour <= 23)
      ? state.tallyResetHour : 3;
    if (n.getHours() < hour) n.setDate(n.getDate() - 1);
    return n.toDateString();
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'data');
      if (stored) {
        const parsed = JSON.parse(stored);
        state.items = (parsed.items || []).map(i => ({ ...i, doingDate: i.doingDate || null }));
        state.todaySuggestionIds = parsed.todaySuggestionIds || [];
        state.lastCategory = parsed.lastCategory || 'life';
        state.customLabels = parsed.customLabels || {};
        state.categoryPreset = parsed.categoryPreset || 'generic';
        state.buttonColor = parsed.buttonColor || null;
        state.textColor = parsed.textColor || null;
        state.displayName = parsed.displayName || '';
        if (parsed.columnColors && Object.keys(parsed.columnColors).length) state.columnColors = parsed.columnColors;
        if (Array.isArray(parsed.columnOrder) && parsed.columnOrder.length) state.columnOrder = parsed.columnOrder;
        if (typeof parsed.tallyResetHour === 'number' && parsed.tallyResetHour >= 0 && parsed.tallyResetHour <= 23) state.tallyResetHour = parsed.tallyResetHour;
      }
      const tally = localStorage.getItem(STORAGE_PREFIX + 'tally');
      if (tally) {
        const { count, date } = JSON.parse(tally);
        const tallyToday = getTallyDate();
        if (date === tallyToday) state.completedTodayCount = count;
        else state.completedTodayCount = 0;
      }
    } catch (e) {
      console.warn('Load failed', e);
      showToast('Could not load saved data — starting fresh');
    }
  }

  function saveState(skipCloudSync, useRemoteTallyDate) {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'data', JSON.stringify({
        items: state.items,
        todaySuggestionIds: state.todaySuggestionIds,
        lastCategory: state.lastCategory,
        customLabels: state.customLabels,
        categoryPreset: state.categoryPreset || 'generic',
        buttonColor: state.buttonColor,
        textColor: state.textColor,
        displayName: state.displayName || '',
        columnColors: state.columnColors || {},
        columnOrder: state.columnOrder || null,
        tallyResetHour: state.tallyResetHour != null ? state.tallyResetHour : 3
      }));
      const tallyDate = useRemoteTallyDate && state.lastCompletedDate ? state.lastCompletedDate : getTallyDate();
      localStorage.setItem(STORAGE_PREFIX + 'tally', JSON.stringify({
        count: state.completedTodayCount,
        date: tallyDate
      }));
      if (!skipCloudSync && window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
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

  function extractPriority(text) {
    const t = (text || '').toLowerCase();
    if (/\b(critical|urgent|asap|as\s+ap|emergency|rush|top\s+priority)\b/.test(t)) return 'critical';
    if (/\b(high\s+priority|high\s+prio|important|must\s+do|must\s+be)\b/.test(t)) return 'high';
    if (/\b(low\s+priority|low\s+prio|whenever|nice\s+to\s+have|optional|backlog)\b/.test(t)) return 'low';
    if (/\b(medium|normal|regular)\b/.test(t)) return 'medium';
    return null;
  }

  function stripAutoExtractedFromText(text, category, deadline, priority) {
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
    if (priority === 'critical') {
      result = result.replace(/\b(critical|urgent|asap|as\s+ap|emergency|rush|top\s+priority)\b/gi, '');
    } else if (priority === 'high') {
      result = result.replace(/\b(high\s+priority|high\s+prio|important|must\s+do|must\s+be)\b/gi, '');
    } else if (priority === 'low') {
      result = result.replace(/\b(low\s+priority|low\s+prio|whenever|nice\s+to\s+have|optional|backlog)\b/gi, '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  function createItem(text, category, deadline, priority, recurrence, reminderAt, doingDate) {
    const cleanText = stripAutoExtractedFromText(text, category, deadline, priority) || text.trim();
    return {
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      text: cleanText || text.trim(),
      category: category || state.lastCategory,
      parkedAt: Date.now(),
      deadline: deadline || null,
      doingDate: doingDate || null,
      priority: priority || 'medium',
      recurrence: recurrence || null,
      reminderAt: reminderAt || null,
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

  function archivePastDoingDatesIfNeeded() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let changed = false;
    state.items.forEach(i => {
      if (!i.archived && i.doingDate && new Date(i.doingDate) < today) {
        i.archived = true;
        i.archivedAt = i.archivedAt || Date.now();
        changed = true;
      }
    });
    if (changed) saveState();
    return changed;
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
    if (state.buttonColor) {
      root.style.setProperty('--accent-button', state.buttonColor);
      root.style.setProperty('--header-accent', state.buttonColor);
    } else {
      root.style.removeProperty('--accent-button');
      root.style.removeProperty('--header-accent');
    }
    if (state.textColor) root.style.setProperty('--accent-text', state.textColor);
    else root.style.removeProperty('--accent-text');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', state.buttonColor || '#e07a5f');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

  function renderColumns() {
    archivePastDoingDatesIfNeeded();
    const container = document.getElementById('columns');
    if (!container) return;
    const cats = state.drillDownCategory ? [state.drillDownCategory] : getOrderedCategoryIds();
    container.classList.toggle('single-column', !!state.drillDownCategory);

    const canReorder = !state.drillDownCategory && cats.length > 1;
    container.innerHTML = cats.map(catId => {
      const items = sortItems(getItemsByCategory(catId));
      const label = getCategoryLabel(catId);
      const color = getColumnColor(catId);

      return `
        <div class="column column-accent" data-category="${catId}" style="--column-accent: ${color}">
          <div class="column-header ${canReorder ? 'column-header-draggable' : ''}" data-category="${catId}" ${canReorder ? 'draggable="true"' : ''} role="${canReorder ? 'button' : 'none'}" title="${canReorder ? 'Drag to reorder columns' : ''}">
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

    let columnDragHappened = false;
    container.querySelectorAll('.column-header').forEach(el => {
      el.addEventListener('click', () => {
        if (columnDragHappened) { columnDragHappened = false; return; }
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
    container.querySelectorAll('.column-header-draggable').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        columnDragHappened = true;
        e.dataTransfer.setData('text/plain', el.dataset.category);
        e.dataTransfer.effectAllowed = 'move';
        el.classList.add('column-dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('column-dragging');
      });
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        const dragCat = e.dataTransfer.getData('text/plain');
        const dropCat = el.dataset.category;
        if (!dragCat || !dropCat || dragCat === dropCat) return;
        const order = state.columnOrder && state.columnOrder.length ? [...state.columnOrder] : getOrderedCategoryIds();
        const baseIds = getCategories().map(c => c.id);
        const fromIdx = order.indexOf(dragCat);
        const toIdx = order.indexOf(dropCat);
        if (fromIdx === -1 || toIdx === -1) return;
        order.splice(fromIdx, 1);
        order.splice(order.indexOf(dropCat), 0, dragCat);
        state.columnOrder = order.filter(id => baseIds.includes(id));
        saveState();
        renderColumns();
      });
    });

    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.task-actions') || e.target.closest('.task-meta-edit') || e.target.closest('.task-drag-handle')) return;
        const id = card.dataset.id;
        state.selectedIds.has(id) ? state.selectedIds.delete(id) : state.selectedIds.add(id);
        card.classList.toggle('selected', state.selectedIds.has(id));
        updateAddToSuggestionsBtn();
      });
    });
    container.querySelectorAll('.task-drag-handle').forEach(handle => {
      handle.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', handle.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        const card = handle.closest('.task-card');
        if (card) card.classList.add('dragging');
      });
      handle.addEventListener('dragend', () => {
        const card = handle.closest('.task-card');
        if (card) card.classList.remove('dragging');
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
    container.querySelectorAll('.btn-done-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        markDone(btn.dataset.id);
      });
    });

    container.querySelectorAll('.task-meta-clickable').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        state.expandingMetaCardId = el.dataset.id;
        renderColumns();
      });
    });
    container.querySelectorAll('.meta-priority').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.priority = e.target.value;
          saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-doing-date').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.doingDate = e.target.value || null;
          saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-deadline').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.deadline = e.target.value || null;
          saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-done-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.expandingMetaCardId = null;
        renderColumns();
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

  function formatDoingDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diff = (d - today) / 86400000;
    if (diff < 0) return { text: 'Doing past', overdue: true };
    if (diff === 0) return { text: 'Aiming to complete today', overdue: false };
    if (diff <= 7) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      return { text: 'Aiming to complete by ' + dayName, overdue: false };
    }
    return { text: 'Aiming to complete in ' + Math.floor(diff) + 'd', overdue: false };
  }

  function renderTaskCard(item) {
    const fd = formatDeadline(item.deadline);
    const doingFd = formatDoingDate(item.doingDate);
    const duration = formatDuration(Date.now() - item.parkedAt);
    const checked = state.selectedIds.has(item.id);
    const overdue = fd && fd.overdue;
    const metaExpanded = state.expandingMetaCardId === item.id;

    const daysParked = Math.floor((Date.now() - item.parkedAt) / 86400000);
    const staleNudge = daysParked >= 30 ? ` title="Parked ${daysParked} days — consider doing it or dropping it"` : '';

    const priorityLabel = (item.priority || 'medium').charAt(0).toUpperCase() + (item.priority || 'medium').slice(1);
    const metaRow = metaExpanded
      ? `<div class="task-meta-edit" data-id="${item.id}">
          <select class="meta-priority" data-id="${item.id}" title="Priority">
            ${PRIORITIES.map(p => `<option value="${p}" ${p === (item.priority || 'medium') ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
          <label class="meta-date-label">Doing by</label>
          <input type="date" class="meta-doing-date" data-id="${item.id}" value="${item.doingDate || ''}" title="Doing by">
          <label class="meta-date-label">Due date</label>
          <input type="date" class="meta-deadline" data-id="${item.id}" value="${item.deadline || ''}" title="Due date">
          <button type="button" class="meta-done-edit btn-meta-done" data-id="${item.id}" title="Done editing">✓</button>
        </div>`
      : `<div class="task-meta task-meta-clickable" data-id="${item.id}" title="Click to edit priority and dates">
          <span>Parked ${duration}</span>
          <span class="priority-badge">${escapeHtml(priorityLabel)}</span>
          ${item.doingDate ? `<span class="doing-badge">${escapeHtml((doingFd && doingFd.text) || item.doingDate)}</span>` : ''}
          ${fd ? `<span class="${overdue ? 'overdue-badge' : ''}">${escapeHtml(fd.text)}</span>` : ''}
          ${daysParked >= 30 ? `<span class="stale-badge" title="Parked ${daysParked} days">${daysParked}d</span>` : ''}
          ${item.recurrence ? `<span class="recurrence-badge" title="Recurs ${item.recurrence}">↻</span>` : ''}
        </div>`;

    return `
      <div class="task-card ${overdue ? 'overdue' : ''} ${checked ? 'selected' : ''} ${daysParked >= 30 ? 'stale-nudge' : ''}" data-id="${item.id}"${staleNudge}>
        <span class="task-drag-handle" draggable="true" data-id="${item.id}" title="Drag to move or add to Today" aria-label="Drag task">⋮⋮</span>
        <div class="task-content">
          <div class="task-text">${escapeHtml(item.text)}</div>
          ${metaRow}
        </div>
        <div class="task-actions">
          <button class="btn-done-card" data-id="${item.id}" title="Done">✓</button>
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
        <button class="btn-add-to-lot-talk" data-id="${item.id}" title="Add as task to parking lot">Add to lot</button>
        <button class="btn-resolve-talk" data-id="${item.id}" title="Mark discussed">✓</button>
      </div>
    `).join('') : '<div class="empty-state">Nothing to discuss yet—add something above</div>';

    list.querySelectorAll('.btn-resolve-talk').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        resolveTalkAbout(btn.dataset.id);
      });
    });
    list.querySelectorAll('.btn-add-to-lot-talk').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = items.find(i => i.id === btn.dataset.id);
        if (!item) return;
        openAddFromTalkModal(item);
      });
    });
  }

  function openAddFromTalkModal(talkItem) {
    state.addFromTalkItem = { id: talkItem.id, text: talkItem.text };
    const textEl = document.getElementById('add-from-talk-text');
    if (textEl) textEl.textContent = talkItem.text;
    const catSel = document.getElementById('add-from-talk-category');
    if (catSel) {
      catSel.innerHTML = getCategories().map(c =>
        `<option value="${c.id}">${escapeHtml(getCategoryLabel(c.id))}</option>`
      ).join('');
      catSel.value = state.lastCategory || 'life';
    }
    const doingEl = document.getElementById('add-from-talk-doing-date');
    if (doingEl) doingEl.value = '';
    const deadlineEl = document.getElementById('add-from-talk-deadline');
    if (deadlineEl) deadlineEl.value = '';
    const prioritySel = document.getElementById('add-from-talk-priority');
    if (prioritySel) prioritySel.value = 'medium';
    const modal = document.getElementById('add-from-talk-modal');
    if (modal) modal.style.display = 'flex';
  }

  function closeAddFromTalkModal() {
    state.addFromTalkItem = null;
    const modal = document.getElementById('add-from-talk-modal');
    if (modal) modal.style.display = 'none';
  }

  function submitAddFromTalk() {
    if (!state.addFromTalkItem) return;
    const text = state.addFromTalkItem.text;
    const category = document.getElementById('add-from-talk-category')?.value || state.lastCategory;
    const doingDateEl = document.getElementById('add-from-talk-doing-date');
    const doingDate = (doingDateEl && doingDateEl.value) ? doingDateEl.value : null;
    const deadlineEl = document.getElementById('add-from-talk-deadline');
    const deadline = (deadlineEl && deadlineEl.value) ? deadlineEl.value : null;
    const priority = document.getElementById('add-from-talk-priority')?.value || 'medium';
    const item = createItem(text, category, deadline, priority, null, null, doingDate);
    state.items.push(item);
    state.lastCategory = category;
    saveState();
    closeAddFromTalkModal();
    renderColumns();
    showToast('Added to parking lot');
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
        <button class="btn-done btn-done-check" title="Done">✓</button>
        <button class="btn-remove" title="Remove from suggestions">Remove</button>
      </div>`;
    }).join('') || '<div class="empty-state">Select tasks below and click Add to Today, or drag tasks here</div>';

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
        <button class="btn-done btn-done-check" title="Done">✓</button>
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
    const tallyToday = getTallyDate();
    try {
      const tally = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'tally') || '{}');
      if (tally.date && tally.date !== tallyToday) {
        state.completedTodayCount = 0;
        saveState(true);
      }
    } catch (e) { /* ignore */ }
    const str = 'Completed today: ' + state.completedTodayCount;
    const tallyEl = document.getElementById('completed-tally');
    if (tallyEl) tallyEl.textContent = str;
    const focusTally = document.getElementById('focus-tally');
    if (focusTally) focusTally.textContent = str;
  }

  function updateAddToSuggestionsBtn() {
    const btn = document.getElementById('add-to-suggestions-btn');
    const float = document.getElementById('add-to-suggestions-float');
    if (!btn) return;
    const count = state.selectedIds.size;
    const remaining = 5 - state.todaySuggestionIds.length;
    const show = count > 0 && remaining > 0;
    if (float) float.classList.toggle('visible', show);
    btn.disabled = !show;
    btn.textContent = show ? `Add ${Math.min(count, remaining)} to Today` : 'Add to Today';
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

  function clearAddToSuggestionsSelection() {
    state.selectedIds.clear();
    updateAddToSuggestionsBtn();
    renderColumns();
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
    const newItem = createItem(item.text, item.category, nextDeadline, item.priority, item.recurrence, null, item.doingDate);
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
    const doingDateInput = document.getElementById('doing-date-input');
    if (doingDateInput) doingDateInput.value = '';
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
      const priority = extractPriority(line) || 'medium';
      const item = createItem(line, cat, deadline, priority);
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
      const item = createItem(line, cat, deadline, priority);
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
    const pushStatus = document.getElementById('settings-push-status');
    if (pushStatus) pushStatus.textContent = '';
    const displayNameEl = document.getElementById('settings-display-name');
    if (displayNameEl) displayNameEl.value = state.displayName || '';

    const tallyResetEl = document.getElementById('settings-tally-reset-hour');
    if (tallyResetEl) tallyResetEl.value = String(state.tallyResetHour != null ? state.tallyResetHour : 3);

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
    document.getElementById('settings-modal').style.display = 'flex';
  }

  function getPreferencesForDevice() {
    const prefs = { ...getActiveColumnColors() };
    if (state.buttonColor) prefs.__button = state.buttonColor;
    if (state.textColor) prefs.__text = state.textColor;
    prefs.custom_labels = { ...(state.customLabels || {}) };
    prefs.category_preset = state.categoryPreset || 'generic';
    prefs.__items = state.items;
    prefs.__todaySuggestionIds = state.todaySuggestionIds;
    prefs.__completedTodayCount = state.completedTodayCount;
    if (Array.isArray(state.columnOrder) && state.columnOrder.length) prefs.__columnOrder = state.columnOrder;
    prefs.__tallyResetHour = state.tallyResetHour != null ? state.tallyResetHour : 3;
    const tally = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'tally') || '{}');
    prefs.__lastCompletedDate = tally.date || getTallyDate();
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
    if (typeof prefs.__completedTodayCount === 'number') { state.completedTodayCount = prefs.__completedTodayCount; delete prefs.__completedTodayCount; }
    if (prefs.__lastCompletedDate) { state.lastCompletedDate = prefs.__lastCompletedDate; delete prefs.__lastCompletedDate; }
    if (Array.isArray(prefs.__columnOrder)) { state.columnOrder = prefs.__columnOrder; delete prefs.__columnOrder; }
    if (typeof prefs.__tallyResetHour === 'number' && prefs.__tallyResetHour >= 0 && prefs.__tallyResetHour <= 23) { state.tallyResetHour = prefs.__tallyResetHour; delete prefs.__tallyResetHour; }
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
    if (submitBtn) submitBtn.disabled = true;
    state.lastCategory = category;
    const item = createItem(text, category, deadline, priority, recurrence, null, doingDate);
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
    if (!window.talkAbout || typeof SUPABASE_URL === 'undefined') {
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
        const prefs = await window.talkAbout.getDevicePreferences(state.deviceSyncId);
        if (prefs?.error) {
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
    renderColumns();
    renderTodayList();
    renderTalkAbout();
    renderEmailTriage(false);
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
    if (window.talkAbout && state.deviceSyncId) {
      if (state.prefsUnsubscribe) state.prefsUnsubscribe();
      state.prefsUnsubscribe = window.talkAbout.subscribeDevicePreferences(state.deviceSyncId, (prefs) => {
        applyDevicePreferencesToState(prefs);
        applyThemeColors();
        updateCategorySelectOptions();
        renderColumns();
        renderTodayList();
        updateTally();
        updateAddToSuggestionsBtn();
      });
    } else if (state.prefsUnsubscribe) {
      state.prefsUnsubscribe();
      state.prefsUnsubscribe = null;
    }
    const triagePairId = state.pairId || 'solo_default';
    const triageAddedBy = state.addedBy;
    if (window.talkAbout) {
      window.talkAbout.getLastAgentRun(triagePairId, triageAddedBy).then(run => {
        state.lastAgentRun = run;
        renderEmailTriage(false);
      });
      if (state.emailTriageUnsubscribe) state.emailTriageUnsubscribe();
      state.emailTriageUnsubscribe = window.talkAbout.subscribeEmailTasks(triagePairId, triageAddedBy, items => {
        state.emailTriageItems = items;
        renderEmailTriage(false);
      });
    }
  }

  function renderEmailTriage(showPanel = false) {
    const section = document.getElementById('email-triage-section');
    const list = document.getElementById('email-triage-list');
    const statusEl = document.getElementById('email-triage-status');
    const emptyEl = document.getElementById('email-triage-empty');
    if (!section || !list) return;
    if (!window.talkAbout || typeof SUPABASE_URL === 'undefined') {
      section.style.display = 'none';
      return;
    }
    if (showPanel) section.style.display = 'block';
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
      if (emptyEl) {
        emptyEl.style.display = 'block';
        const run = state.lastAgentRun;
        if (!run) {
          emptyEl.textContent = 'Run the triage agent to extract tasks from your inbox. See email-management/README.md';
        } else {
          const d = run.run_at ? new Date(run.run_at) : null;
          const hoursAgo = d ? Math.round((Date.now() - d) / 3600000) : null;
          const hint = hoursAgo !== null && hoursAgo >= 24
            ? ` Last run was ${hoursAgo}h ago — run the agent to scan for new emails.`
            : ' Run the triage agent to scan your inbox.';
          emptyEl.textContent = 'No tasks from last run.' + hint;
        }
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    list.innerHTML = items.map(t => {
      const gmailUrl = t.thread_id
        ? 'https://mail.google.com/mail/u/0/#inbox/' + encodeURIComponent(t.thread_id)
        : 'https://mail.google.com/mail/u/0/#inbox';
      const subj = escapeHtml((t.subject || '').slice(0, 60));
      const text = (t.text || '').slice(0, 500);
      const draft = t.draft_reply ? '<details class="email-triage-draft"><summary>Draft reply</summary><pre>' + escapeHtml(t.draft_reply.slice(0, 500)) + '</pre></details>' : '';
      return `<div class="email-triage-card" data-id="${t.id}">
        <div class="email-triage-card-main">
          <strong>${subj}</strong>
          <input type="text" class="email-triage-task-input" data-id="${t.id}" value="${escapeHtml(text)}" placeholder="Task name (edit before adding)">
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
    const input = document.querySelector(`.email-triage-task-input[data-id="${id}"]`);
    const text = input?.value?.trim() || t.text;
    const cat = detectCategory(text) || document.querySelector(`.email-triage-category[data-id="${id}"]`)?.value || t.category;
    const deadline = extractDeadline(text) || t.deadline;
    const priority = extractPriority(text) || t.priority || 'medium';
    const item = createItem(text, cat, deadline, priority);
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
        const newCat = column.dataset.category;
        const item = state.items.find(i => i.id === id);
        if (item && newCat && item.category !== newCat) {
          item.category = newCat;
          saveState();
          renderColumns();
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
        const remaining = 5 - state.todaySuggestionIds.length;
        if (remaining <= 0) return;
        state.todaySuggestionIds.push(id);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
        updateAddToSuggestionsBtn();
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
          const modals = ['add-modal', 'edit-modal', 'add-from-talk-modal', 'archive-modal', 'settings-modal', 'link-partner-modal'];
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

    const closeAddFromTalk = document.getElementById('close-add-from-talk');
    if (closeAddFromTalk) closeAddFromTalk.addEventListener('click', closeAddFromTalkModal);
    const addFromTalkModal = document.getElementById('add-from-talk-modal');
    if (addFromTalkModal) addFromTalkModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-from-talk-modal') closeAddFromTalkModal();
    });
    const submitAddFromTalk = document.getElementById('submit-add-from-talk');
    if (submitAddFromTalk) submitAddFromTalk.addEventListener('click', submitAddFromTalk);

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
              if (state.prefsUnsubscribe) state.prefsUnsubscribe();
              state.prefsUnsubscribe = window.talkAbout.subscribeDevicePreferences(state.deviceSyncId, (p) => {
                applyDevicePreferencesToState(p);
                applyThemeColors();
                updateCategorySelectOptions();
                renderColumns();
                renderTodayList();
                updateTally();
                updateAddToSuggestionsBtn();
              });
              applyThemeColors();
              updateCategorySelectOptions();
              renderColumns();
              renderTodayList();
              updateTally();
              updateAddToSuggestionsBtn();
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

  function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    banner.style.display = navigator.onLine ? 'none' : 'block';
  }

  async function init() {
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
          reg.update();
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

  bindLinkPartnerModal();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(e => console.error('Init failed', e)));
  } else {
    init().catch(e => console.error('Init failed', e));
  }
})();
