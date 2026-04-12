export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeHtmlAttr(s) {
  return escapeHtml(s).replace(/`/g, '&#96;');
}

export function showAppToast(message, isError) {
  const el = document.createElement('div');
  el.className = 'app-toast' + (isError ? ' app-toast-error' : '');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 4500);
}

/**
 * @param {HTMLElement | null} triggerEl
 * @param {string} message
 * @param {() => void} onConfirm
 * @param {{ confirmLabel?: string, cancelLabel?: string }} [options]
 */
export function showInlineConfirm(triggerEl, message, onConfirm, options) {
  const opts = options || {};
  const confirmLabel = opts.confirmLabel !== null && opts.confirmLabel !== undefined ? opts.confirmLabel : 'Delete';
  const cancelLabel = opts.cancelLabel !== null && opts.cancelLabel !== undefined ? opts.cancelLabel : 'Cancel';
  document.querySelectorAll('.inline-confirm').forEach(el => el.remove());
  if (!triggerEl) {
    onConfirm();
    return;
  }
  const div = document.createElement('div');
  div.className = 'inline-confirm';
  div.setAttribute('role', 'alertdialog');
  div.setAttribute('aria-modal', 'false');
  div.innerHTML =
    '<span class="inline-confirm-msg">' + escapeHtml(message) + '</span>' +
    '<button type="button" class="btn btn-danger btn-sm inline-confirm-yes">' + escapeHtml(confirmLabel) + '</button>' +
    '<button type="button" class="btn btn-secondary btn-sm inline-confirm-no">' + escapeHtml(cancelLabel) + '</button>';
  triggerEl.insertAdjacentElement('afterend', div);
  div.querySelector('.inline-confirm-yes').addEventListener('click', () => {
    div.remove();
    onConfirm();
  });
  div.querySelector('.inline-confirm-no').addEventListener('click', () => div.remove());
  setTimeout(() => {
    document.addEventListener('click', function dismiss(e) {
      if (!div.contains(e.target) && e.target !== triggerEl) {
        div.remove();
        document.removeEventListener('click', dismiss);
      }
    });
  }, 0);
}

export function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}
