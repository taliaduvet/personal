/**
 * Shared: text selection in a note → "Turn into task".
 */
import { createItem } from '../domain/tasks.js';

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root Container for popover
 * @param {HTMLElement} opts.editor textarea or contenteditable
 * @param {string} opts.defaultCategory
 * @param {import('../types.js').AppState} opts.state
 * @param {() => void} opts.saveState
 * @param {(msg: string) => void} opts.showToast
 * @param {() => void} [opts.onTaskCreated]
 * @param {boolean} [opts.readOnly] still allow selection → task
 */
export function wireNoteToTask(opts) {
  const { root, editor, defaultCategory, state, saveState, showToast, onTaskCreated, readOnly } = opts;
  let popover = root.querySelector('.note-turn-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.className = 'note-turn-popover column-note-turn-popover';
    popover.style.display = 'none';
    popover.innerHTML =
      '<button type="button" class="btn-secondary btn-sm note-turn-into-task-btn">Turn into task</button>';
    root.appendChild(popover);
  }

  const btn = popover.querySelector('.note-turn-into-task-btn');

  function getSelectionText() {
    if (editor.tagName === 'TEXTAREA') {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      if (start >= end) return '';
      return editor.value.slice(start, end).trim();
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return '';
    return sel.toString().trim();
  }

  function updatePopover() {
    const text = getSelectionText();
    if (!text) {
      popover.style.display = 'none';
      return;
    }
    popover.style.display = 'block';
  }

  ['select', 'mouseup', 'keyup'].forEach((ev) => {
    editor.addEventListener(ev, updatePopover);
  });

  btn.addEventListener('click', () => {
    const selected = getSelectionText();
    if (!selected) {
      showToast('Select note text first');
      return;
    }
    const cat = defaultCategory || 'todos';
    const item = createItem(selected, cat, null, 'medium', null, null, null, null, null, null);
    state.items.push(item);
    state.lastCategory = cat;

    if (!readOnly && editor.tagName === 'TEXTAREA') {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const before = editor.value.slice(0, start);
      const after = editor.value.slice(end);
      editor.value = (before + after).replace(/\n{4,}/g, '\n\n\n');
    }

    saveState();
    showToast('Task created from note');
    popover.style.display = 'none';
    if (onTaskCreated) onTaskCreated();
  });

  return { updatePopover, hide: () => { popover.style.display = 'none'; } };
}
