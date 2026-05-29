/**
 * Per-task AI research queue UI (inline on cards + edit modal).
 */
import { escapeHtml } from '../utils/dom.js';

/**
 * @param {object|null} result
 * @returns {string}
 */
export function formatAiResultHtml(result) {
  if (!result || typeof result !== 'object') return '';
  const summary = (result.summary || '').trim();
  const links = Array.isArray(result.links) ? result.links : [];
  const linkRows = links.map((link) => {
    const title = escapeHtml(link.title || link.url || 'Link');
    const url = escapeHtml(link.url || '#');
    const note = link.note ? `<span class="task-ai-link-note">${escapeHtml(link.note)}</span>` : '';
    return `<div class="task-ai-link-row"><a href="${url}" target="_blank" rel="noopener noreferrer" class="task-ai-link">${title}</a>${note}</div>`;
  }).join('');
  return `
    <div class="task-ai-result-block">
      <div class="task-ai-result-title">⚡ Claude found:</div>
      ${summary ? `<div class="task-ai-result-summary">${escapeHtml(summary)}</div>` : ''}
      ${linkRows ? `<div class="task-ai-result-links">${linkRows}</div>` : ''}
    </div>`;
}

/**
 * Inline panel HTML below task card row.
 * @param {import('../types.js').Task} item
 * @param {{ aiPromptTaskId: string|null, aiResultTaskId: string|null }} ui
 */
export function buildTaskAiPanelHtml(item, ui) {
  const promptOpen = ui.aiPromptTaskId === item.id;
  const resultOpen = ui.aiResultTaskId === item.id;
  const queued = item.aiAction === 'research';
  const hasResult = item.aiResult && typeof item.aiResult === 'object';
  const showResultChip = hasResult && !item.aiResultRead && !resultOpen;

  const parts = [];

  if (promptOpen) {
    parts.push(`
      <div class="task-ai-panel task-ai-prompt" data-id="${escapeHtml(item.id)}">
        <label class="task-ai-prompt-label">What do you need?</label>
        <div class="task-ai-prompt-row">
          <input type="text" class="task-ai-prompt-input" data-id="${escapeHtml(item.id)}" placeholder="e.g. find me 3 options under $100" autocomplete="off" aria-label="Research request">
          <button type="button" class="btn-primary btn-sm btn-ai-send" data-id="${escapeHtml(item.id)}">Send</button>
        </div>
      </div>`);
  }

  if (queued && !hasResult) {
    parts.push(`<div class="task-ai-panel task-ai-status"><span class="task-ai-queued-badge">⏳ Queued for Claude</span></div>`);
  }

  if (showResultChip) {
    parts.push(`
      <div class="task-ai-panel task-ai-status">
        <button type="button" class="task-ai-result-chip btn-ai-result-open" data-id="${escapeHtml(item.id)}">⚡ Result ready</button>
      </div>`);
  }

  if (resultOpen && hasResult) {
    parts.push(`
      <div class="task-ai-panel task-ai-result-wrap" data-id="${escapeHtml(item.id)}">
        ${formatAiResultHtml(item.aiResult)}
        <button type="button" class="btn-secondary btn-sm btn-ai-dismiss" data-id="${escapeHtml(item.id)}">Dismiss</button>
      </div>`);
  }

  if (!parts.length) return '';
  return parts.join('');
}

export function createAiResearch(deps) {
  const { state, saveState, showToast, getRenderColumns, getRenderTodayList } = deps;

  function refresh() {
    getRenderColumns()?.();
    getRenderTodayList()?.();
  }

  function togglePrompt(taskId) {
    state.aiPromptTaskId = state.aiPromptTaskId === taskId ? null : taskId;
    if (state.aiPromptTaskId) state.aiResultTaskId = null;
    refresh();
    if (state.aiPromptTaskId) {
      requestAnimationFrame(() => {
        const input = document.querySelector(`.task-ai-prompt-input[data-id="${taskId}"]`);
        if (input) input.focus();
      });
    }
  }

  function submitResearch(taskId, text) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return;
    const prompt = (text || '').trim();
    if (!prompt) {
      showToast('Type what you need researched');
      return;
    }
    item.aiAction = 'research';
    item.aiActionPrompt = prompt;
    state.aiPromptTaskId = null;
    saveState();
    refresh();
    showToast('Queued for Claude');
  }

  function openResult(taskId) {
    state.aiResultTaskId = taskId;
    state.aiPromptTaskId = null;
    refresh();
  }

  function dismissResult(taskId) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return;
    item.aiResultRead = true;
    state.aiResultTaskId = null;
    saveState();
    refresh();
  }

  function bindCardEvents(container) {
    if (!container) return;

    container.querySelectorAll('.btn-ai-research').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePrompt(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-ai-send').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const input = container.querySelector(`.task-ai-prompt-input[data-id="${id}"]`);
        submitResearch(id, input?.value || '');
      });
    });

    container.querySelectorAll('.task-ai-prompt-input').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          submitResearch(inp.dataset.id, inp.value);
        } else if (e.key === 'Escape') {
          e.stopPropagation();
          state.aiPromptTaskId = null;
          refresh();
        }
      });
    });

    container.querySelectorAll('.btn-ai-result-open').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openResult(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-ai-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissResult(btn.dataset.id);
      });
    });
  }

  function renderEditModalAiResult(item) {
    const el = document.getElementById('edit-ai-result');
    if (!el) return;
    if (item?.aiResult && typeof item.aiResult === 'object') {
      el.innerHTML = formatAiResultHtml(item.aiResult) +
        `<button type="button" class="btn-secondary btn-sm btn-ai-dismiss-edit" data-id="${escapeHtml(item.id)}">Dismiss</button>`;
      el.style.display = 'block';
      const dismissBtn = el.querySelector('.btn-ai-dismiss-edit');
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          dismissResult(item.id);
          el.style.display = 'none';
          el.innerHTML = '';
        };
      }
    } else {
      el.innerHTML = '';
      el.style.display = 'none';
    }
  }

  return {
    togglePrompt,
    submitResearch,
    openResult,
    dismissResult,
    bindCardEvents,
    renderEditModalAiResult,
    formatAiResultHtml
  };
}
