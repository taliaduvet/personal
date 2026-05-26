import { PRIORITIES } from '../constants.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { formatDeadline, formatDuration, parseLocalDate } from '../domain/tasks.js';
import { getPileName, getPersonName } from '../domain/piles-people.js';
import { getCategoryOptionLabel } from '../domain/categories.js';

export function formatDoingDate(iso) {
  if (!iso) return null;
  const d = parseLocalDate(iso);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (d - today) / 86400000;
  if (diff < 0) return { text: 'Doing past', overdue: true };
  if (diff === 0) return { text: 'Aiming to complete today', overdue: false };
  if (diff <= 7) {
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    return { text: 'Aiming to complete by ' + dayName, overdue: false };
  }
  return { text: 'Aiming to complete in ' + Math.floor(diff) + 'd', overdue: false };
}

export function renderTaskCard(item, opts) {
  opts = opts || {};
  const showLifeAreaAsTag = opts.showLifeAreaAsTag === true;
  const fd = formatDeadline(item.deadline);
  const doingFd = formatDoingDate(item.doingDate);
  const duration = formatDuration(Date.now() - item.parkedAt);
  const checked = state.selectedIds.has(item.id);
  const overdue = fd && fd.overdue;
  const metaExpanded = state.expandingMetaCardId === item.id;

  const daysParked = Math.floor((Date.now() - item.parkedAt) / 86400000);
  const staleNudge = daysParked >= 30 ? ` title="Parked ${daysParked} days — consider doing it or dropping it"` : '';

  const priorityLabel = (item.priority || 'medium').charAt(0).toUpperCase() + (item.priority || 'medium').slice(1);
  const pileName = showLifeAreaAsTag ? null : getPileName(item.pileId);
  const personName = getPersonName(item.personId);
  const lifeAreaTag = showLifeAreaAsTag ? getCategoryOptionLabel(item.category) : null;
  const frictionLabel = item.friction ? (item.friction.charAt(0).toUpperCase() + item.friction.slice(1)) : null;
  const metaRow = metaExpanded
    ? `<div class="task-meta-edit" data-id="${item.id}">
          <select class="meta-priority" data-id="${item.id}" title="Priority">
            ${PRIORITIES.map(p => `<option value="${p}" ${p === (item.priority || 'medium') ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
          <span class="meta-date-group"><label class="meta-date-label">Doing by</label><input type="date" class="meta-doing-date" data-id="${item.id}" value="${item.doingDate || ''}" title="Doing by"></span>
          <span class="meta-date-group"><label class="meta-date-label">Due date</label><input type="date" class="meta-deadline" data-id="${item.id}" value="${item.deadline || ''}" title="Due date"></span>
          <button type="button" class="meta-done-edit btn-meta-done" data-id="${item.id}" title="Done editing">✓</button>
        </div>`
    : `<div class="task-meta task-meta-clickable" data-id="${item.id}" title="Click to edit priority and dates">
          <span>Parked ${duration}</span>
          ${lifeAreaTag ? `<span class="life-area-tag" title="Life area">${escapeHtml(lifeAreaTag)}</span>` : ''}
          ${pileName ? `<span class="pile-tag" title="Pile: ${escapeHtml(pileName)}">${escapeHtml(pileName)}</span>` : ''}
          ${personName ? `<span class="person-tag" title="For: ${escapeHtml(personName)}">For ${escapeHtml(personName)}</span>` : ''}
          ${frictionLabel ? `<span class="friction-badge" title="Friction: ${escapeHtml(frictionLabel)}">${escapeHtml(frictionLabel)}</span>` : ''}
          <span class="priority-badge">${escapeHtml(priorityLabel)}</span>
          ${item.doingDate ? `<span class="doing-badge">${escapeHtml((doingFd && doingFd.text) || item.doingDate)}</span>` : ''}
          ${fd ? `<span class="${overdue ? 'overdue-badge' : ''}">${escapeHtml(fd.text)}</span>` : ''}
          ${daysParked >= 30 ? `<span class="stale-badge" title="Parked ${daysParked} days">${daysParked}d</span>` : ''}
          ${item.recurrence ? `<span class="recurrence-badge" title="Recurs ${item.recurrence}">↻</span>` : ''}
        </div>`;

  const firstStepHtml = item.firstStep ? `<div class="task-first-step">Start by: ${escapeHtml(item.firstStep)}</div>` : '';
  return `
      <div class="task-card ${overdue ? 'overdue' : ''} ${checked ? 'selected' : ''} ${daysParked >= 30 ? 'stale-nudge' : ''}" data-id="${item.id}"${staleNudge}>
        <span class="task-drag-handle" draggable="true" data-id="${item.id}" title="Drag to move or add to Today" aria-label="Drag task">⋮⋮</span>
        <div class="task-content">
          <div class="task-text">${escapeHtml(item.text)}</div>
          ${firstStepHtml}
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
