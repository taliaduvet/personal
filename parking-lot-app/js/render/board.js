/**
 * Main column / piles board: HTML + listeners for the #columns region.
 */
import { escapeHtml } from '../utils/dom.js';
import {
  archivePastDoingDatesIfNeeded,
  getActiveItems,
  getItemsByCategory,
  getColumnColor,
  sortByTimeBandsAndFriction,
  sortItems,
  createItem
} from '../domain/tasks.js';
import { getPiles } from '../domain/piles-people.js';
import { getOrderedCategoryIds, getCategoryLabel, getCategories } from '../domain/categories.js';
import { renderTaskCard } from './task-card.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {(msg: string) => void} d.showToast
 * @param {() => void} d.saveDevicePreferencesToSupabase
 * @param {(cat?: string, pileId?: string|null) => void} d.openAddModal
 * @param {(id: string) => void} d.openEditModal
 * @param {(id: string, showUndo?: boolean) => void} d.deleteItem
 * @param {(id: string) => void} d.markDone
 * @param {() => void} d.updateAddToSuggestionsBtn
 */
export function createBoardRenderer(d) {
  function updateColumnNoteTurnPopover(e) {
    const ta = e && e.target && e.target.classList && e.target.classList.contains('column-note-textarea') ? e.target : null;
    if (!ta) return;
    const wrap = ta.closest('.column-note-textarea-wrap');
    const popover = wrap && wrap.querySelector('.column-note-turn-popover');
    if (!popover) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const hasSelection = typeof start === 'number' && typeof end === 'number' && start < end && (ta.value.slice(start, end).trim().length > 0);
    popover.style.display = hasSelection ? 'block' : 'none';
  }

  function renderColumns() {
    archivePastDoingDatesIfNeeded();
    const container = document.getElementById('columns');
    if (!container) return;

    const isPilesView = d.state.viewMode === 'piles';
    const cats = d.state.drillDownCategory ? [d.state.drillDownCategory] : getOrderedCategoryIds();
    container.classList.toggle('single-column', !!d.state.drillDownCategory);
    container.classList.toggle('piles-view', isPilesView);

    const todayIdSet = new Set(d.state.todaySuggestionIds || []);
    const withoutToday = (items) => items.filter(i => !todayIdSet.has(i.id));

    if (isPilesView) {
      const piles = getPiles();
      const pileColumns = piles.map(p => ({ id: p.id, label: p.name, pileId: p.id }));
      pileColumns.push({ id: '__uncategorized', label: 'Uncategorized', pileId: null });
      container.innerHTML = pileColumns.map(col => {
        const items = withoutToday(getActiveItems().filter(i => (i.pileId || null) === (col.pileId || null)));
        const q = (d.state.searchQuery || '').trim().toLowerCase();
        const filtered = q ? items.filter(i => (i.text || '').toLowerCase().includes(q)) : items;
        const sorted = sortByTimeBandsAndFriction(filtered);
        const pileIdAttr = col.pileId != null ? ` data-pile-id="${col.pileId}"` : ' data-uncategorized="true"';
        return `
          <div class="column column-accent" data-category="${col.id}"${pileIdAttr} style="--column-accent: #6b7280">
            <div class="column-header" data-category="${col.id}"${pileIdAttr} role="none">
              ${escapeHtml(col.label)} <span class="count">(${sorted.length})</span>
            </div>
            <div class="column-items">
              ${sorted.length ? sorted.map(item => renderTaskCard(item, { showLifeAreaAsTag: true })).join('') : `
                <div class="empty-state column-add-hint" data-category="${col.id}"${pileIdAttr}>No tasks in this pile</div>
              `}
            </div>
            <button type="button" class="column-add-btn" data-category="${col.id}"${pileIdAttr} title="Add task">+ Add</button>
          </div>
        `;
      }).join('');
    } else {
      const canReorder = !d.state.drillDownCategory && cats.length > 1;
      container.innerHTML = cats.map(catId => {
        const items = withoutToday(sortItems(getItemsByCategory(catId)));
        const label = getCategoryLabel(catId);
        const color = getColumnColor(catId);
        const noteContent = (d.state.columnNotes && d.state.columnNotes[catId]) || '';
        const noteOpen = d.state.openColumnNoteId === catId;

        return `
          <div class="column column-accent" data-category="${catId}" style="--column-accent: ${color}">
            <div class="column-header ${canReorder ? 'column-header-draggable' : ''}" data-category="${catId}" ${canReorder ? 'draggable="true"' : ''} role="${canReorder ? 'button' : 'none'}" title="${canReorder ? 'Drag to reorder columns' : ''}">
              ${escapeHtml(label)} <span class="count">(${items.length})</span>
              <button type="button" class="column-note-btn ${noteOpen ? 'column-note-btn-close' : ''}" data-category="${catId}" title="${noteOpen ? 'Close note' : 'Column note'}" aria-label="${noteOpen ? 'Close note' : 'Open note'}">${noteOpen ? '×' : (noteContent.length ? '📝' : '✎')}</button>
            </div>
            ${noteOpen ? `
              <div class="column-note-panel column-note-full open" data-category="${catId}">
                <div class="column-note-textarea-wrap">
                  <textarea class="column-note-textarea" data-category="${catId}" placeholder="Notes for this area..." rows="3">${(noteContent || '').replace(/<\/textarea/gi, '<\\/textarea')}</textarea>
                  <div class="column-note-turn-popover" data-category="${catId}" style="display:none">
                    <button type="button" class="btn-secondary btn-sm column-turn-into-task" data-category="${catId}" title="Create task from selected text">Turn into task</button>
                  </div>
                </div>
              </div>
            ` : `
              <div class="column-items">
                ${items.length ? items.map(item => renderTaskCard(item)).join('') : `
                  <div class="empty-state column-add-hint" data-category="${catId}">Nothing here yet—click to add</div>
                `}
              </div>
              <button type="button" class="column-add-btn" data-category="${catId}" title="Add task">+ Add</button>
            `}
          </div>
        `;
      }).join('');

      container.querySelectorAll('.column-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const catId = btn.dataset.category;
          d.state.openColumnNoteId = d.state.openColumnNoteId === catId ? null : catId;
          renderColumns();
        });
      });
      container.querySelectorAll('.column-note-textarea').forEach(ta => {
        ta.addEventListener('input', () => {
          const catId = ta.dataset.category;
          if (d.state.columnNoteSaveTimeouts[catId]) clearTimeout(d.state.columnNoteSaveTimeouts[catId]);
          d.state.columnNoteSaveTimeouts[catId] = setTimeout(() => {
            if (!d.state.columnNotes) d.state.columnNotes = {};
            d.state.columnNotes[catId] = ta.value;
            delete d.state.columnNoteSaveTimeouts[catId];
            d.saveState();
            if (typeof window !== 'undefined' && window.talkAbout && d.state.deviceSyncId) d.saveDevicePreferencesToSupabase();
          }, 400);
        });
        ta.addEventListener('select', updateColumnNoteTurnPopover);
        ta.addEventListener('mouseup', updateColumnNoteTurnPopover);
        ta.addEventListener('keyup', updateColumnNoteTurnPopover);
      });
      container.querySelectorAll('.column-turn-into-task').forEach(btn => {
        btn.addEventListener('click', () => {
          const catId = btn.dataset.category;
          const ta = container.querySelector('.column-note-textarea[data-category="' + catId + '"]');
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          if (!(start < end)) {
            d.showToast('Select note text first');
            return;
          }
          const raw = ta.value.slice(start, end);
          const selected = raw.trim();
          if (!selected) {
            d.showToast('Select note text first');
            return;
          }
          const item = createItem(selected, catId, null, 'medium', null, null, null, null, null, null);
          d.state.items.push(item);
          d.state.lastCategory = catId;

          const before = ta.value.slice(0, start);
          const after = ta.value.slice(end);
          const nextValue = (before + after).replace(/\n{4,}/g, '\n\n\n');
          ta.value = nextValue;
          if (!d.state.columnNotes) d.state.columnNotes = {};
          d.state.columnNotes[catId] = nextValue;

          d.saveState();
          if (typeof window !== 'undefined' && window.talkAbout && d.state.deviceSyncId) d.saveDevicePreferencesToSupabase();
          renderColumns();
          d.showToast('Task created from note');
          const popover = container.querySelector('.column-note-turn-popover[data-category="' + catId + '"]');
          if (popover) popover.style.display = 'none';
        });
      });
    }

    let columnDragHappened = false;
    container.querySelectorAll('.column-header').forEach(el => {
      el.addEventListener('click', () => {
        if (columnDragHappened) { columnDragHappened = false; return; }
        if (d.state.drillDownCategory) {
          d.state.drillDownCategory = null;
          const back = document.getElementById('back-btn');
          if (back) back.style.display = 'none';
        } else {
          d.state.drillDownCategory = el.dataset.category;
          const back = document.getElementById('back-btn');
          if (back) back.style.display = 'inline-block';
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
        const order = d.state.columnOrder && d.state.columnOrder.length ? [...d.state.columnOrder] : getOrderedCategoryIds();
        const baseIds = getCategories().map(c => c.id);
        const fromIdx = order.indexOf(dragCat);
        const toIdx = order.indexOf(dropCat);
        if (fromIdx === -1 || toIdx === -1) return;
        order.splice(fromIdx, 1);
        order.splice(order.indexOf(dropCat), 0, dragCat);
        d.state.columnOrder = order.filter(id => baseIds.includes(id));
        d.saveState();
        renderColumns();
      });
    });

    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.task-actions') || e.target.closest('.task-meta-edit') || e.target.closest('.task-drag-handle')) return;
        const id = card.dataset.id;
        d.state.selectedIds.has(id) ? d.state.selectedIds.delete(id) : d.state.selectedIds.add(id);
        card.classList.toggle('selected', d.state.selectedIds.has(id));
        d.updateAddToSuggestionsBtn();
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
        d.openEditModal(btn.dataset.id);
      });
    });
    container.querySelectorAll('.btn-drop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        d.deleteItem(btn.dataset.id, true);
      });
    });
    container.querySelectorAll('.btn-done-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        d.markDone(btn.dataset.id);
      });
    });

    container.querySelectorAll('.task-meta-clickable').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        d.state.expandingMetaCardId = el.dataset.id;
        renderColumns();
      });
    });
    container.querySelectorAll('.meta-priority').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = d.state.items.find(i => i.id === id);
        if (item) {
          item.priority = e.target.value;
          d.saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-doing-date').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = d.state.items.find(i => i.id === id);
        if (item) {
          item.doingDate = e.target.value || null;
          d.saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-deadline').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = d.state.items.find(i => i.id === id);
        if (item) {
          item.deadline = e.target.value || null;
          d.saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-done-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        d.state.expandingMetaCardId = null;
        renderColumns();
      });
    });

    container.querySelectorAll('.column-add-btn, .column-add-hint').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (d.state.viewMode === 'piles') {
          const pileId = el.dataset.pileId != null ? el.dataset.pileId : null;
          d.openAddModal(d.state.lastCategory || getOrderedCategoryIds()[0], pileId);
        } else {
          const cat = el.dataset.category;
          if (cat) d.openAddModal(cat);
        }
      });
    });

    const viewColumnsBtn = document.getElementById('view-columns-btn');
    const viewPilesBtn = document.getElementById('view-piles-btn');
    if (viewColumnsBtn) {
      viewColumnsBtn.classList.toggle('active', d.state.viewMode === 'columns');
      viewColumnsBtn.setAttribute('aria-selected', d.state.viewMode === 'columns' ? 'true' : 'false');
    }
    if (viewPilesBtn) {
      viewPilesBtn.classList.toggle('active', d.state.viewMode === 'piles');
      viewPilesBtn.setAttribute('aria-selected', d.state.viewMode === 'piles' ? 'true' : 'false');
    }
  }

  return { renderColumns, updateColumnNoteTurnPopover };
}
