/**
 * Inbox triage modal — tasks in Inbox pile + untriaged unlinked notes.
 */
import { escapeHtml } from '../utils/dom.js';
import { INBOX_PILE_ID, ensureInboxPile, getPiles } from '../domain/piles-people.js';
import { getCategories, getCategoryOptionLabel } from '../domain/categories.js';
import { createItem } from '../domain/tasks.js';
import { deleteNote, triageNote } from '../domain/notes.js';

export function createInboxSession(deps) {
  const {
    state,
    saveState,
    showToast,
    markDone,
    deleteItem,
    getRenderColumns,
    getRenderTodayList
  } = deps;

  let expandingRouteId = null;

  function getInboxTasks() {
    return (state.items || []).filter(i => !i.archived && i.pileId === INBOX_PILE_ID);
  }

  function getInboxNotes() {
    return (state.notes || []).filter(n => !n.taskId && n.triaged !== true);
  }

  function buildCategoryOptions(selectedId) {
    return getCategories().map(c =>
      `<option value="${escapeHtml(c.id)}"${c.id === selectedId ? ' selected' : ''}>${escapeHtml(getCategoryOptionLabel(c.id))}</option>`
    ).join('');
  }

  function buildPileOptions(selectedId) {
    const piles = getPiles().filter(p => p.id !== INBOX_PILE_ID);
    return '<option value="">None</option>' + piles.map(p =>
      `<option value="${escapeHtml(p.id)}"${p.id === selectedId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('');
  }

  function renderRouteForm(taskId) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return '';
    const defaultPile = getPiles().find(p => p.id !== INBOX_PILE_ID)?.id || '';
    return `
      <div class="inbox-route-form" data-route-for="${escapeHtml(taskId)}">
        <label class="inbox-route-label">Life area</label>
        <select class="inbox-route-category settings-select" data-task-id="${escapeHtml(taskId)}">${buildCategoryOptions(item.category)}</select>
        <label class="inbox-route-label">Pile</label>
        <select class="inbox-route-pile settings-select" data-task-id="${escapeHtml(taskId)}">${buildPileOptions(defaultPile)}</select>
        <div class="inbox-route-form-actions">
          <button type="button" class="btn-primary btn-sm inbox-route-confirm" data-id="${escapeHtml(taskId)}">Confirm</button>
          <button type="button" class="btn-secondary btn-sm inbox-route-cancel" data-id="${escapeHtml(taskId)}">Cancel</button>
        </div>
      </div>`;
  }

  function renderInboxList() {
    const listEl = document.getElementById('inbox-session-list');
    const countEl = document.getElementById('inbox-session-count');
    if (!listEl) return;

    ensureInboxPile();
    const tasks = getInboxTasks();
    const notes = getInboxNotes();
    const total = tasks.length + notes.length;

    if (countEl) countEl.textContent = total ? String(total) : '';

    if (!total) {
      listEl.innerHTML = '<p class="settings-hint inbox-empty">Inbox is clear — nothing to triage.</p>';
      return;
    }

    const parts = [];

    tasks.forEach(item => {
      const routeOpen = expandingRouteId === item.id;
      parts.push(`
        <div class="inbox-item" data-id="${escapeHtml(item.id)}" data-type="task">
          <div class="inbox-item-text">${escapeHtml(item.text)}</div>
          <div class="inbox-item-actions">
            <button type="button" class="inbox-route-btn btn-secondary btn-sm" data-id="${escapeHtml(item.id)}">→ Route</button>
            <button type="button" class="inbox-done-btn btn-secondary btn-sm" data-id="${escapeHtml(item.id)}">✓ Done</button>
            <button type="button" class="inbox-drop-btn btn-secondary btn-sm" data-id="${escapeHtml(item.id)}">× Drop</button>
          </div>
          ${routeOpen ? renderRouteForm(item.id) : ''}
        </div>`);
    });

    notes.forEach(note => {
      parts.push(`
        <div class="inbox-item inbox-item-note" data-id="${escapeHtml(note.id)}" data-type="note">
          <div class="inbox-item-text">${escapeHtml(note.text)}</div>
          <div class="inbox-item-actions">
            <button type="button" class="inbox-to-task-btn btn-secondary btn-sm" data-id="${escapeHtml(note.id)}">→ Make task</button>
            <button type="button" class="inbox-keep-btn btn-secondary btn-sm" data-id="${escapeHtml(note.id)}">✓ Keep</button>
            <button type="button" class="inbox-drop-btn btn-secondary btn-sm" data-id="${escapeHtml(note.id)}">× Drop</button>
          </div>
        </div>`);
    });

    listEl.innerHTML = parts.join('');
    bindListEvents();
  }

  function bindListEvents() {
    const listEl = document.getElementById('inbox-session-list');
    if (!listEl) return;

    listEl.querySelectorAll('.inbox-route-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        expandingRouteId = expandingRouteId === btn.dataset.id ? null : btn.dataset.id;
        renderInboxList();
      });
    });

    listEl.querySelectorAll('.inbox-route-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        expandingRouteId = null;
        renderInboxList();
      });
    });

    listEl.querySelectorAll('.inbox-route-confirm').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.dataset.id;
        const item = state.items.find(i => i.id === taskId);
        if (!item) return;
        const form = listEl.querySelector(`.inbox-route-form[data-route-for="${taskId}"]`);
        const catSel = form?.querySelector('.inbox-route-category');
        const pileSel = form?.querySelector('.inbox-route-pile');
        if (catSel) item.category = catSel.value;
        item.pileId = pileSel?.value || null;
        state.lastCategory = item.category;
        expandingRouteId = null;
        saveState();
        getRenderColumns()?.();
        getRenderTodayList()?.();
        renderInboxList();
        showToast('Routed out of Inbox');
      });
    });

    listEl.querySelectorAll('.inbox-done-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        markDone(btn.dataset.id);
        renderInboxList();
      });
    });

    listEl.querySelectorAll('.inbox-drop-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.inbox-item');
        const type = row?.dataset.type;
        const id = btn.dataset.id;
        if (type === 'note') {
          deleteNote(id);
          saveState();
          showToast('Note dropped');
        } else {
          deleteItem(id, false);
          showToast('Dropped');
        }
        renderInboxList();
      });
    });

    listEl.querySelectorAll('.inbox-to-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const note = (state.notes || []).find(n => n.id === btn.dataset.id);
        if (!note || !note.text.trim()) return;
        ensureInboxPile();
        const item = createItem(
          note.text.trim(),
          state.lastCategory,
          null,
          'medium',
          null,
          null,
          null,
          INBOX_PILE_ID,
          null,
          null
        );
        state.items.push(item);
        triageNote(note.id);
        saveState();
        getRenderColumns()?.();
        renderInboxList();
        showToast('Added to Inbox as task');
      });
    });

    listEl.querySelectorAll('.inbox-keep-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        triageNote(btn.dataset.id);
        saveState();
        renderInboxList();
        showToast('Kept in notes');
      });
    });
  }

  function open() {
    ensureInboxPile();
    expandingRouteId = null;
    const modal = document.getElementById('inbox-session-modal');
    if (modal) modal.style.display = 'flex';
    renderInboxList();
  }

  function close() {
    expandingRouteId = null;
    const modal = document.getElementById('inbox-session-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindEvents() {
    const closeBtn = document.getElementById('close-inbox-session');
    const modal = document.getElementById('inbox-session-modal');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
    }
  }

  return { open, close, bindEvents, renderInboxList };
}
