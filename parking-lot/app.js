(function() {
  'use strict';

  const CATEGORIES = [
    { id: 'misfit', label: 'Misfit' },
    { id: 'stop2030barclay', label: 'Stop 2030 Barclay' },
    { id: 'cycles', label: 'Cycles' },
    { id: 'life', label: 'Life' }
  ];

  const PRIORITIES = ['critical', 'high', 'medium', 'low'];
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

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
    editingId: null
  };

  function loadState() {
    try {
      const stored = localStorage.getItem('parkingLot');
      if (stored) {
        const parsed = JSON.parse(stored);
        state.items = parsed.items || [];
        state.todaySuggestionIds = parsed.todaySuggestionIds || [];
        state.lastCategory = parsed.lastCategory || 'life';
      }
      const tally = localStorage.getItem('parkingLotTally');
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
      localStorage.setItem('parkingLot', JSON.stringify({
        items: state.items,
        todaySuggestionIds: state.todaySuggestionIds,
        lastCategory: state.lastCategory
      }));
      localStorage.setItem('parkingLotTally', JSON.stringify({
        count: state.completedTodayCount,
        date: new Date().toDateString()
      }));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  function detectCategory(text) {
    const t = (text || '').toLowerCase();
    if (t.includes('misfit')) return 'misfit';
    if (t.includes('barclay') || t.includes('stop 2030') || t.includes('stop2030')) return 'stop2030barclay';
    if (t.includes('cycles')) return 'cycles';
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
      if (category === 'misfit') result = result.replace(/\bmisfit\b/gi, '');
      else if (category === 'stop2030barclay') {
        result = result.replace(/\bstop\s*2030\b/gi, '').replace(/\bbarclay\b/gi, '');
      }
      else if (category === 'cycles') result = result.replace(/\bcycles\b/gi, '');
      else if (category === 'life') result = result.replace(/\blife\b/gi, '');
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

  function renderColumns() {
    const container = document.getElementById('columns');
    if (!container) return;
    const cats = state.drillDownCategory ? [state.drillDownCategory] : CATEGORIES.map(c => c.id);
    container.classList.toggle('single-column', !!state.drillDownCategory);

    container.innerHTML = cats.map(catId => {
      const cat = CATEGORIES.find(c => c.id === catId);
      const items = sortItems(getItemsByCategory(catId));
      const label = cat ? cat.label : catId;

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
        card.querySelector('input[type="checkbox"]').checked = state.selectedIds.has(id);
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

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderTodayList() {
    const list = document.getElementById('today-list');
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
    document.getElementById('completed-tally').textContent = str;
    const focusTally = document.getElementById('focus-tally');
    if (focusTally) focusTally.textContent = str;
  }

  function updateAddToSuggestionsBtn() {
    const btn = document.getElementById('add-to-suggestions-btn');
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
    toast.innerHTML = message + (onUndo ? '<span class="undo-btn">Undo</span>' : '');
    toast.classList.add('visible');
    if (onUndo) {
      toast.querySelector('.undo-btn').onclick = () => {
        onUndo();
        toast.classList.remove('visible');
      };
    }
    setTimeout(() => toast.classList.remove('visible'), 5000);
  }

  function openAddModal() {
    document.getElementById('add-modal').style.display = 'flex';
    document.getElementById('tab-single').classList.add('active');
    document.getElementById('tab-quick').classList.remove('active');
    const tv = document.getElementById('tab-voice');
    if (tv) tv.classList.remove('active');
    document.getElementById('single-add').style.display = 'block';
    document.getElementById('quick-add').style.display = 'none';
    const va = document.getElementById('voice-add');
    if (va) va.style.display = 'none';
    document.getElementById('voice-transcript').textContent = '';
    const sv = document.getElementById('submit-voice');
    if (sv) sv.disabled = true;
    document.getElementById('task-input').value = '';
    document.getElementById('deadline-input').value = '';
    document.getElementById('priority-select').value = 'medium';
    document.getElementById('category-select').value = state.lastCategory;
    document.getElementById('quick-input').value = '';
    document.getElementById('task-input').focus();
  }

  function closeAddModal() {
    document.getElementById('add-modal').style.display = 'none';
  }

  function applySmartFields() {
    const text = document.getElementById('task-input').value;
    const cat = detectCategory(text);
    if (cat) document.getElementById('category-select').value = cat;
    const deadline = extractDeadline(text);
    if (deadline) document.getElementById('deadline-input').value = deadline;
  }

  function addSingle() {
    const text = document.getElementById('task-input').value.trim();
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

  function addQuick() {
    const lines = document.getElementById('quick-input').value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
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
  }

  function openEditModal(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.editingId = id;
    document.getElementById('edit-text').value = item.text;
    document.getElementById('edit-category').innerHTML = CATEGORIES.map(c =>
      `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${c.label}</option>`
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
    list.innerHTML = archived.length ? archived.map(item => {
      const date = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const cat = CATEGORIES.find(c => c.id === item.category);
      return `<div class="archive-item">${escapeHtml(item.text)} <span class="archive-date">${cat ? cat.label : ''} — ${date}</span></div>`;
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
      const c = CATEGORIES.find(x => x.id === k);
      return `${c ? c.label : k}: ${v}`;
    }).join(', ');
    return `Parked this week: ${parked}\nCompleted from Today's Suggestions: ${completed}${catStr ? '\nBy category: ' + catStr : ''}`;
  }

  function openAnalytics() {
    document.getElementById('analytics-text').textContent = computeAnalytics();
    document.getElementById('analytics-panel').style.display = 'block';
  }

  function addVoiceMultiple() {
    let transcript = document.getElementById('voice-transcript').textContent.trim();
    transcript = transcript.replace(/\s+comma\s+/gi, ',');
    const lines = transcript.split(/,\s*|\s+next\s+/i).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    lines.forEach(line => {
      const cat = detectCategory(line) || state.lastCategory;
      state.lastCategory = cat;
      const deadline = extractDeadline(line);
      const item = createItem(line, cat, deadline, 'medium');
      state.items.push(item);
    });
    saveState();
    document.getElementById('voice-transcript').textContent = '';
    document.getElementById('submit-voice').disabled = true;
    closeAddModal();
    renderColumns();
    showToast('Added ' + lines.length + ' items');
  }

  function initVoiceMulti() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById('voice-multi-btn');
    const transcriptEl = document.getElementById('voice-transcript');
    const submitBtn = document.getElementById('submit-voice');
    if (!SpeechRecognition || !btn) {
      if (document.getElementById('tab-voice')) document.getElementById('tab-voice').style.display = 'none';
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
            const t = transcriptEl.textContent + (transcriptEl.textContent ? ' ' : '') + e.results[i][0].transcript;
            transcriptEl.textContent = t.trim();
          }
        }
        submitBtn.disabled = !transcriptEl.textContent.trim();
      };
      recognition.onend = () => { recognition = null; btn.textContent = 'Start speaking'; };
      recognition.onerror = () => { recognition = null; btn.textContent = 'Start speaking'; };
      recognition.start();
      btn.textContent = 'Stop';
    });
    if (submitBtn) submitBtn.addEventListener('click', addVoiceMultiple);
  }

  function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      document.getElementById('mic-btn').style.display = 'none';
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    document.getElementById('mic-btn').addEventListener('click', () => {
      recognition.start();
      document.getElementById('mic-btn').textContent = '...';
    });
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      document.getElementById('task-input').value = text;
      document.getElementById('mic-btn').textContent = '🎤';
      applySmartFields();
    };
    recognition.onerror = () => {
      document.getElementById('mic-btn').textContent = '🎤';
    };
    recognition.onend = () => {
      document.getElementById('mic-btn').textContent = '🎤';
    };
  }

  function bindEvents() {
    document.getElementById('back-btn').addEventListener('click', () => {
      state.drillDownCategory = null;
      document.getElementById('back-btn').style.display = 'none';
      renderColumns();
    });

    document.getElementById('add-to-suggestions-btn').addEventListener('click', addToSuggestions);
    document.getElementById('clear-suggestions').addEventListener('click', () => {
      state.todaySuggestionIds = [];
      saveState();
      renderTodayList();
      renderFocusList();
      renderColumns();
    });

    document.getElementById('add-btn').addEventListener('click', openAddModal);
    document.getElementById('focus-btn').addEventListener('click', toggleFocusMode);

    document.getElementById('close-add').addEventListener('click', closeAddModal);
    document.getElementById('add-modal').addEventListener('click', (e) => {
      if (e.target.id === 'add-modal') closeAddModal();
    });
    document.getElementById('task-input').addEventListener('input', applySmartFields);
    document.getElementById('task-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addSingle();
    });
    document.getElementById('submit-single').addEventListener('click', addSingle);

    document.getElementById('tab-single').addEventListener('click', () => {
      document.getElementById('tab-single').classList.add('active');
      document.getElementById('tab-quick').classList.remove('active');
      const tv = document.getElementById('tab-voice');
      if (tv) tv.classList.remove('active');
      document.getElementById('single-add').style.display = 'block';
      document.getElementById('quick-add').style.display = 'none';
      const va = document.getElementById('voice-add');
      if (va) va.style.display = 'none';
    });
    document.getElementById('tab-quick').addEventListener('click', () => {
      document.getElementById('tab-quick').classList.add('active');
      document.getElementById('tab-single').classList.remove('active');
      document.getElementById('tab-voice').classList.remove('active');
      document.getElementById('quick-add').style.display = 'block';
      document.getElementById('single-add').style.display = 'none';
      document.getElementById('voice-add').style.display = 'none';
    });
    const tabVoice = document.getElementById('tab-voice');
    if (tabVoice) tabVoice.addEventListener('click', () => {
      tabVoice.classList.add('active');
      document.getElementById('tab-single').classList.remove('active');
      document.getElementById('tab-quick').classList.remove('active');
      document.getElementById('voice-add').style.display = 'block';
      document.getElementById('single-add').style.display = 'none';
      document.getElementById('quick-add').style.display = 'none';
    });
    document.getElementById('tab-single').addEventListener('click', () => {
      document.getElementById('tab-single').classList.add('active');
      document.getElementById('tab-quick').classList.remove('active');
      if (tabVoice) tabVoice.classList.remove('active');
      document.getElementById('single-add').style.display = 'block';
      document.getElementById('quick-add').style.display = 'none';
      document.getElementById('voice-add').style.display = 'none';
    });
    document.getElementById('submit-quick').addEventListener('click', addQuick);

    document.getElementById('close-edit').addEventListener('click', () => {
      document.getElementById('edit-modal').style.display = 'none';
      state.editingId = null;
    });
    document.getElementById('edit-modal').addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') {
        document.getElementById('edit-modal').style.display = 'none';
        state.editingId = null;
      }
    });
    document.getElementById('save-edit').addEventListener('click', saveEdit);

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
    const sheetsBtn = document.getElementById('sheets-btn');
    if (sheetsBtn) sheetsBtn.addEventListener('click', () => {
      const headers = 'Text,Category,Deadline,Priority,Parked At,Archived\n';
      const rows = state.items.map(i => {
        const date = i.parkedAt ? new Date(i.parkedAt).toLocaleDateString() : '';
        return `"${(i.text || '').replace(/"/g, '""')}",${i.category || ''},${i.deadline || ''},${i.priority || ''},${date},${i.archived ? 'Yes' : 'No'}`;
      }).join('\n');
      const csv = headers + rows;
      navigator.clipboard.writeText(csv).then(() => showToast('Copied to clipboard — paste into Google Sheets')).catch(() => showToast('Copy failed'));
    });
    document.getElementById('export-btn').addEventListener('click', exportBackup);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-input').click());
    document.getElementById('import-input').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) importBackup(f);
      e.target.value = '';
    });

    const hint = document.getElementById('priority-hint');
    if (hint) {
      hint.addEventListener('click', () => {
        alert('1. Is someone else waiting? → Critical\n2. Does money/reputation depend on it? → High\n3. Would you feel relieved dropping it? → Low (else Medium)');
      });
    }
  }

  function init() {
    try {
      loadState();
      renderColumns();
      renderTodayList();
      updateTally();
      updateAddToSuggestionsBtn();
      bindEvents();
      initVoice();
      initVoiceMulti();
    } catch (e) {
      console.error('Parking Lot init error:', e);
      const container = document.getElementById('columns');
      if (container) container.innerHTML = '<div class="empty-state" style="color:var(--accent-coral)">Something went wrong. Open DevTools (F12) → Console to see the error.</div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
