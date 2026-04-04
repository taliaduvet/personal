/**
 * Talk about list + add-from-talk modal.
 */
import { escapeHtml } from '../utils/dom.js';
import { getCategories, getCategoryLabel } from '../domain/categories.js';
import { createItem } from '../domain/tasks.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {(msg: string) => void} d.showToast
 * @param {() => void} d.saveState
 * @param {() => void} d.renderColumns
 * @param {(selectId: string, pileId: string) => void} d.updatePileSelectOptions
 */
export function createTalkAboutUI(d) {
  function renderTalkAbout() {
    const list = document.getElementById('talk-about-list');
    if (!list) return;
    const items = d.state.talkAboutItems;
    list.innerHTML = items.length ? items.map(item => `
      <div class="talk-about-item" data-id="${item.id}">
        <span class="task-text">${escapeHtml(item.text)}</span>
        <span class="added-by">(${escapeHtml(item.added_by)})</span>
        <button class="btn-secondary btn-sm btn-add-to-lot-talk" data-id="${item.id}" title="Add as task to parking lot">Add to parking lot</button>
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
    d.state.addFromTalkItem = { id: talkItem.id, text: talkItem.text };
    const textInput = document.getElementById('add-from-talk-text-input');
    if (textInput) textInput.value = talkItem.text || '';
    const catSel = document.getElementById('add-from-talk-category');
    if (catSel) {
      catSel.innerHTML = getCategories().map(c =>
        `<option value="${c.id}">${escapeHtml(getCategoryLabel(c.id))}</option>`
      ).join('');
      catSel.value = d.state.lastCategory || 'life';
    }
    d.updatePileSelectOptions('add-from-talk-pile', '');
    const addFromTalkFriction = document.getElementById('add-from-talk-friction');
    if (addFromTalkFriction) addFromTalkFriction.value = '';
    const addFromTalkFirstStep = document.getElementById('add-from-talk-first-step');
    if (addFromTalkFirstStep) addFromTalkFirstStep.value = '';
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
    d.state.addFromTalkItem = null;
    const modal = document.getElementById('add-from-talk-modal');
    if (modal) modal.style.display = 'none';
  }

  function submitAddFromTalk() {
    if (!d.state.addFromTalkItem) return;
    const textInput = document.getElementById('add-from-talk-text-input');
    const text = (textInput && textInput.value ? textInput.value.trim() : d.state.addFromTalkItem.text || '').trim();
    if (!text) {
      d.showToast('Task name cannot be empty');
      return;
    }
    const category = document.getElementById('add-from-talk-category')?.value || d.state.lastCategory;
    const pileEl = document.getElementById('add-from-talk-pile');
    const pileId = (pileEl && pileEl.value) ? pileEl.value : null;
    const frictionEl = document.getElementById('add-from-talk-friction');
    const friction = (frictionEl && frictionEl.value) ? frictionEl.value : null;
    const doingDateEl = document.getElementById('add-from-talk-doing-date');
    const doingDate = (doingDateEl && doingDateEl.value) ? doingDateEl.value : null;
    const deadlineEl = document.getElementById('add-from-talk-deadline');
    const deadline = (deadlineEl && deadlineEl.value) ? deadlineEl.value : null;
    const priority = document.getElementById('add-from-talk-priority')?.value || 'medium';
    const addFromTalkFirstStepEl = document.getElementById('add-from-talk-first-step');
    const firstStep = (addFromTalkFirstStepEl && addFromTalkFirstStepEl.value.trim()) ? addFromTalkFirstStepEl.value.trim() : null;
    const item = createItem(text, category, deadline, priority, null, null, doingDate, pileId, friction, null);
    if (firstStep) item.firstStep = firstStep;
    d.state.items.push(item);
    d.state.lastCategory = category;
    d.saveState();
    closeAddFromTalkModal();
    d.renderColumns();
    d.showToast('Added to parking lot');
  }

  async function resolveTalkAbout(id) {
    if (typeof window === 'undefined' || !window.talkAbout) return;
    const { error } = await window.talkAbout.resolveTalkAbout(id);
    if (error) d.showToast('Failed to resolve');
    else d.state.talkAboutItems = d.state.talkAboutItems.filter(i => i.id !== id);
    renderTalkAbout();
  }

  return {
    renderTalkAbout,
    openAddFromTalkModal,
    closeAddFromTalkModal,
    submitAddFromTalk,
    resolveTalkAbout
  };
}
