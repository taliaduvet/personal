/**
 * Email triage section UI (tasks from agent runs).
 */
import { escapeHtml } from '../utils/dom.js';
import { getCategories, getCategoryLabel, getCategoryOptionLabel } from '../domain/categories.js';
import { createItem, detectCategory, extractDeadline, extractPriority } from '../domain/tasks.js';
import { hasSupabaseConfig } from '../config/supabase-env.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {(msg: string) => void} d.showToast
 * @param {() => void} d.saveState
 * @param {() => void} d.renderColumns
 */
export function createEmailTriageUI(d) {
  function renderEmailTriage(showPanel = false) {
    const section = document.getElementById('email-triage-section');
    const list = document.getElementById('email-triage-list');
    const statusEl = document.getElementById('email-triage-status');
    const emptyEl = document.getElementById('email-triage-empty');
    if (!section || !list) return;
    if (typeof window === 'undefined' || !window.talkAbout || !hasSupabaseConfig()) {
      section.style.display = 'none';
      return;
    }
    if (showPanel) section.style.display = 'block';
    const items = d.state.emailTriageItems || [];
    if (statusEl) {
      const run = d.state.lastAgentRun;
      if (run) {
        const rd = run.run_at ? new Date(run.run_at) : null;
        const ago = rd ? (Math.round((Date.now() - rd) / 60000) + ' min ago') : '';
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
        const run = d.state.lastAgentRun;
        if (!run) {
          emptyEl.textContent = 'Run the triage agent to extract tasks from your inbox. See email-management/README.md';
        } else {
          const rd = run.run_at ? new Date(run.run_at) : null;
          const hoursAgo = rd ? Math.round((Date.now() - rd) / 3600000) : null;
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
            <select class="email-triage-category" data-id="${t.id}">${getCategories().map(c => `<option value="${c.id}" ${c.id === t.category ? 'selected' : ''}>${escapeHtml(getCategoryOptionLabel(c.id))}</option>`).join('')}</select>
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
    const t = d.state.emailTriageItems.find(x => x.id === id);
    if (!t || typeof window === 'undefined' || !window.talkAbout) return;
    const input = document.querySelector(`.email-triage-task-input[data-id="${id}"]`);
    const text = input?.value?.trim() || t.text;
    const cat = detectCategory(text) || document.querySelector(`.email-triage-category[data-id="${id}"]`)?.value || t.category;
    const deadline = extractDeadline(text) || t.deadline;
    const priority = extractPriority(text) || t.priority || 'medium';
    const item = createItem(text, cat, deadline, priority, null, null, null, null, null, null);
    d.state.items.push(item);
    d.state.lastCategory = cat;
    d.saveState();
    window.talkAbout.approveEmailTask(id).then(({ error }) => {
      if (error) d.showToast('Failed to approve');
      else {
        d.state.emailTriageItems = d.state.emailTriageItems.filter(x => x.id !== id);
        renderEmailTriage();
        d.renderColumns();
        d.showToast('Added to ' + getCategoryLabel(cat));
      }
    });
  }

  function dismissEmailTask(id) {
    if (typeof window === 'undefined' || !window.talkAbout) return;
    window.talkAbout.deleteEmailTask(id).then(({ error }) => {
      if (error) d.showToast('Failed to dismiss');
      else {
        d.state.emailTriageItems = d.state.emailTriageItems.filter(x => x.id !== id);
        renderEmailTriage();
        d.showToast('Dismissed');
      }
    });
  }

  return { renderEmailTriage, addEmailTaskToParkingLot, dismissEmailTask };
}
