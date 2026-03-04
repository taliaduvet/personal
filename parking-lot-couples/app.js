(function() {
  'use strict';

  const CATEGORIES = [
    { id: 'work', label: 'Work' },
    { id: 'hobbies', label: 'Hobbies' },
    { id: 'life', label: 'Life' },
    { id: 'other', label: 'Other' }
  ];

  const PRIORITIES = ['critical', 'high', 'medium', 'low'];
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  const STORAGE_PREFIX = 'parkingLotCouples_';

  let state = {
    items: [],
    todaySuggestionIds: [],
    completedTodayCount: 0,
    lastCompletedDate: null,
    lastCategory: 'life',
    drillDownCategory: null,
    selectedIds: new Set(),
    undoItem: null,
    undoTimeout: null,
    editingId: null,
    pairId: null,
    addedBy: null,
    talkAboutItems: [],
    talkAboutUnsubscribe: null,
    customLabels: {}
  };

  function loadPairState() {
    state.pairId = localStorage.getItem(STORAGE_PREFIX + 'pairId');
    state.addedBy = localStorage.getItem(STORAGE_PREFIX + 'addedBy') || 'you';
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
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'data', JSON.stringify({
        items: state.items,
        todaySuggestionIds: state.todaySuggestionIds,
        lastCategory: state.lastCategory,
        customLabels: state.customLabels
      }));
      localStorage.setItem(STORAGE_PREFIX + 'tally', JSON.stringify({
        count: state.completedTodayCount,
        date: new Date().toDateString()
      }));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  function detectCategory(text) {
    const t = (text || '').toLowerCase();
    if (t.includes('work')) return 'work';
    if (t.includes('hobbi') || t.includes('hobby')) return 'hobbies';
    if (t.includes('life')) return 'life';
    return null;
  }

  function extractDeadline(text) {
    const t = (text || '').toLowerCase();
    const year = new Date().getFullYear();
    const monthDay = t.match(/(?:due\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?/i);
    if (monthDay) {
      const m = MONTHS[monthDay[1].toLowerCase().slice(0,3)];
      const d = parseInt(monthDay[2], 10);
      const y = monthDay[3] ? parseInt(monthDay[3], 10) : year;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
    const slash = t.match(/(?:due\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (slash) {
      const m = parseInt(slash[1], 10);
      const d = parseInt(slash[2], 10);
      const y = slash[3] ? (slash[3].length === 2 ? 2000 + parseInt(slash[3], 10) : parseInt(slash[3], 10)) : year;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
    return null;
  }

  function stripAutoExtractedFromText(text, category, deadline) {
    let result = (text || '').trim();
    if (!result) return result;
    if (deadline) {
      result = result.replace(/(?:due\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:\s+\d{4})?/gi, '');
      result = result.replace(/(?:due\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/gi, '');
    }
    if (category) {
      if (category === 'work') result = result.replace(/\bwork\b/gi, '');
      if (category === 'hobbies') result = result.replace(/\bhobbies?\b/gi, '');
      if (category === 'life') result = result.replace(/\blife\b/gi, '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  function createItem(text, category, deadline, priority) {
    const cleanText = stripAutoExtractedFromText(text, category, deadline) || text.trim();
    return {
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      text: cleanText || text.trim(),
      category: category || state.lastCategory,
      parkedAt: Date.now(),
      deadline: deadline || null,
      priority: priority || 'medium',
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
    return getActiveItems().filter(i => i.category === cat);
  }

  function getCategoryLabel(catId) {
    if (state.customLabels[catId]) return state.customLabels[catId];
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? cat.label : catId;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderColumns() {
    const container = document.getElementById('columns');
    if (!container) return;
    const cats = state.drillDownCategory ? [state.drillDownCategory] : CATEGORIES.map(c => c.id);
    container.classList.toggle('single-column', !!state.drillDownCategory);

    container.innerHTML = cats.map(catId => {
      const items = sortItems(getItemsByCategory(catId));
      const label = getCategoryLabel(catId);

      return `
        <div class="column" data-category="${catId}">
          <div class="column-header" data-category="${catId}">
            ${label} <span class="count">(${items.length})</span>
          </div>
          <div class="column-items">
            ${items.length ? items.map(item => renderTaskCard(item)).join('') : `
              <div class="empty-state">Nothing here yet—add something when you're ready</div>
            `}
          </div>
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
  }

  function renderTaskCard(item) {
    const fd = formatDeadline(item.deadline);
    const duration = formatDuration(Date.now() - item.parkedAt);
    const checked = state.selectedIds.has(item.id);
    const overdue = fd && fd.overdue;

    return `
      <div class="task-card ${overdue ? 'overdue' : ''} ${checked ? 'selected' : ''}" data-id="${item.id}">
        <input type="checkbox" ${checked ? 'checked' : ''}>
        <div class="task-content">
          <div class="task-text">${escapeHtml(item.text)}</div>
          <div class="task-meta">
            <span>Parked ${duration}</span>
            ${fd ? `<span class="${overdue ? 'overdue-badge' : ''}">${escapeHtml(fd.text)}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
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

  function renderTodayList() {
    const list = document.getElementById('today-list');
    if (!list) return;
    const ids = state.todaySuggestionIds;
    const items = ids.map(id => state.items.find(i => i.id === id)).filter(Boolean);

    list.innerHTML = items.map(item => `
      <div class="today-item" data-id="${item.id}">
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done" title="Done">Done</button>
        <button class="btn-remove" title="Remove from suggestions">Remove</button>
      </div>
    `).join('') || '<div class="empty-state">Pick items from the columns below, then click "Add selected to Today\'s Suggestions"</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
    });
  }

  function renderFocusList() {
    const list = document.getElementById('focus-list');
    if (!list) return;
    const items = state.todaySuggestionIds
      .map(id => state.items.find(i => i.id === id))
      .filter(Boolean);

    list.innerHTML = items.map(item => `
      <div class="today-item task-card" data-id="${item.id}">
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done">Done</button>
        <button class="btn-remove">Remove from suggestions</button>
      </div>
    `).join('') || '<div class="empty-state">Add items from the overview to get started</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
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

  function markDone(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.archived = true;
    item.archivedAt = item.archivedAt || Date.now();
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    state.completedTodayCount++;
    saveState();
    updateTally();
    renderTodayList();
    renderFocusList();
    renderColumns();
  }

  function deleteItem(id, showUndo = true) {
    const idx = state.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const item = state.items[idx];
    state.items.splice(idx, 1);
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    state.selectedIds.delete(id);
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();

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
    sel.innerHTML = CATEGORIES.map(c =>
      `<option value="${c.id}">${escapeHtml(getCategoryLabel(c.id))}</option>`
    ).join('');
  }

  function openAddModal() {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'flex';
    updateCategorySelectOptions();
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.value = '';
      taskInput.focus();
    }
    document.getElementById('deadline-input').value = '';
    document.getElementById('priority-select').value = 'medium';
    document.getElementById('category-select').value = state.lastCategory;
  }

  function closeAddModal() {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'none';
  }

  function openSettingsModal() {
    const container = document.getElementById('settings-column-inputs');
    if (!container) return;
    container.innerHTML = CATEGORIES.map(c => {
      const val = (state.customLabels[c.id] || c.label);
      return `<label>${escapeHtml(c.label)}<input type="text" data-cat="${c.id}" value="${escapeHtml(val)}" placeholder="${escapeHtml(c.label)}"></label>`;
    }).join('');
    document.getElementById('settings-modal').style.display = 'flex';
  }

  function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
  }

  function saveSettingsAndClose() {
    const inputs = document.querySelectorAll('#settings-column-inputs input[data-cat]');
    inputs.forEach(inp => {
      const val = inp.value.trim();
      if (val) state.customLabels[inp.dataset.cat] = val;
      else delete state.customLabels[inp.dataset.cat];
    });
    saveState();
    updateCategorySelectOptions();
    renderColumns();
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
    const textEl = document.getElementById('task-input');
    if (!textEl) return;
    const text = textEl.value.trim();
    if (!text) return;
    const category = document.getElementById('category-select').value;
    const deadline = document.getElementById('deadline-input').value || null;
    const priority = document.getElementById('priority-select').value;
    state.lastCategory = category;
    const item = createItem(text, category, deadline, priority);
    state.items.push(item);
    saveState();
    closeAddModal();
    renderColumns();
  }

  function openEditModal(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.editingId = id;
    document.getElementById('edit-text').value = item.text;
    document.getElementById('edit-category').innerHTML = CATEGORIES.map(c =>
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
    a.download = 'parking-lot-couples-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.items) state.items = data.items;
        if (data.todaySuggestionIds) state.todaySuggestionIds = data.todaySuggestionIds;
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
        showToast('Import complete');
      } catch (e) {
        showToast('Import failed: invalid file');
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
      const cat = CATEGORIES.find(c => c.id === item.category);
      return `<div class="archive-item">${escapeHtml(item.text)} <span class="archive-date">${getCategoryLabel(item.category)} — ${date}</span></div>`;
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

  function showMainApp() {
    document.getElementById('pair-setup').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('floating-buttons').style.display = 'flex';
    const badge = document.getElementById('pair-badge');
    if (badge) badge.textContent = state.pairId + ' · ' + state.addedBy;
    loadState();
    updateCategorySelectOptions();
    renderColumns();
    renderTodayList();
    renderTalkAbout();
    updateTally();
    updateAddToSuggestionsBtn();
    if (window.talkAbout && state.pairId) {
      state.talkAboutUnsubscribe = window.talkAbout.subscribeTalkAbout(state.pairId, (items) => {
        state.talkAboutItems = items;
        renderTalkAbout();
      });
    }
  }

  function bindEvents() {
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

    const moreBtn = document.getElementById('more-btn');
    const moreMenu = document.getElementById('more-menu');
    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle('open');
      });
      moreMenu.querySelectorAll('.more-menu-item').forEach(item => {
        item.addEventListener('click', () => moreMenu.classList.remove('open'));
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.more-menu-wrap')) moreMenu.classList.remove('open');
      });
    }

    const addBtn = document.getElementById('add-btn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

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

  function bindPairSetup() {
    const createBtn = document.getElementById('create-pair-btn');
    if (createBtn) createBtn.addEventListener('click', () => {
      state.pairId = window.talkAbout ? window.talkAbout.generatePairId() : 'demo' + Date.now().toString(36).slice(-6);
      state.addedBy = 'you';
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
      const asYou = document.getElementById('join-as-you');
      state.pairId = code;
      state.addedBy = (asYou && asYou.checked) ? 'you' : 'him';
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

  function init() {
    loadPairState();
    if (state.pairId) {
      showMainApp();
      bindEvents();
    } else {
      bindPairSetup();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
