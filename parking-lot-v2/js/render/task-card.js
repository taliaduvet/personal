import { PRIORITIES } from '../constants.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { formatDeadline, formatDuration, parseLocalDate } from '../domain/tasks.js';
import { getPileName, getPersonName } from '../domain/piles-people.js';
import { getCategoryOptionLabel } from '../domain/categories.js';
import { buildTaskAiPanelHtml } from '../features/ai-research.js';

function formatSessionTime(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

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
  const isSessionActive = !!(item.activeSessionStart);
  const totalTime = (item.totalTimeSeconds || 0) > 0 ? formatSessionTime(item.totalTimeSeconds) : null;
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
          ${item.estimate ? `<span class="estimate-badge" title="Estimated time">${escapeHtml(item.estimate)}</span>` : ''}
          ${item.income ? `<span class="income-badge" title="Income-generating task">◈</span>` : ''}
          ${(item.skippedFromToday || 0) >= 3 ? `<span class="avoidance-badge" title="Removed from Today ${item.skippedFromToday} times without completing — consider breaking this down">⚠ avoided</span>` : ''}
          <span class="priority-badge">${escapeHtml(priorityLabel)}</span>
          ${item.doingDate ? `<span class="doing-badge">${escapeHtml((doingFd && doingFd.text) || item.doingDate)}</span>` : ''}
          ${fd ? `<span class="${overdue ? 'overdue-badge' : ''}">${escapeHtml(fd.text)}</span>` : ''}
          ${daysParked >= 30 ? `<span class="stale-badge" title="Parked ${daysParked} days">${daysParked}d</span>` : ''}
          ${item.recurrence ? `<span class="recurrence-badge" title="Recurs ${item.recurrence}">↻</span>` : ''}
          ${totalTime ? `<span class="task-time-total" title="Total time tracked">⏱ ${escapeHtml(totalTime)}</span>` : ''}
        </div>`;

  const firstStepHtml = item.firstStep ? `<div class="task-first-step">Start by: ${escapeHtml(item.firstStep)}</div>` : '';
  const aiPanel = buildTaskAiPanelHtml(item, {
    aiPromptTaskId: state.aiPromptTaskId || null,
    aiResultTaskId: state.aiResultTaskId || null
  });
  const aiExpanded = !!(state.aiPromptTaskId === item.id || state.aiResultTaskId === item.id || item.aiAction === 'research' || (item.aiResult && !item.aiResultRead));
  const isMultiSession = !!(item.multiSession);
  const sessionDoneCount = (item.sessions || []).filter(s => s.doneForToday).length;
  const historyCount = (item.sessions || []).length;
  const historyTitle = historyCount
    ? `View history (${historyCount} ${historyCount === 1 ? 'entry' : 'entries'}) — no timer`
    : 'View history — no timer';
  const multiSessionBadge = isMultiSession && sessionDoneCount > 0
    ? `<span class="multi-session-badge" title="${sessionDoneCount} day${sessionDoneCount !== 1 ? 's' : ''} completed">↻ ${sessionDoneCount}d</span>`
    : '';
  return `
      <div class="task-card ${overdue ? 'overdue' : ''} ${checked ? 'selected' : ''} ${daysParked >= 30 ? 'stale-nudge' : ''} ${aiExpanded ? 'task-card-ai-open' : ''} ${isMultiSession ? 'task-card-multi-session' : ''}" data-id="${item.id}"${staleNudge}>
        <div class="task-card-row">
          <span class="task-drag-handle" draggable="true" data-id="${item.id}" title="Click to select for Today · Drag to reorder" aria-label="Select or drag task">⋮⋮</span>
          <div class="task-content">
            <div class="task-text">${escapeHtml(item.text)}</div>
            ${firstStepHtml}
            ${metaRow}
            ${multiSessionBadge}
          </div>
          <div class="task-actions">
            <button type="button" class="btn-multi-session-toggle ${isMultiSession ? 'btn-multi-session-on' : ''}" data-id="${item.id}" title="${isMultiSession ? 'Multi-session task — click to turn off' : 'Mark as ongoing / multi-session task'}">↻</button>
            <button type="button" class="btn-ai-research" data-id="${item.id}" title="Queue web research for this task">⚡</button>
            <button type="button" class="btn-task-history" data-id="${item.id}" title="${historyTitle}" aria-label="${historyTitle}">📋${historyCount ? `<span class="task-history-count">${historyCount}</span>` : ''}</button>
            <button type="button" class="btn-session ${isSessionActive ? 'btn-session-active' : ''}" data-id="${item.id}" title="${isSessionActive ? 'Session in progress — click to open' : 'Start a session'}">${isSessionActive ? '■' : '▶'}</button>
            ${isMultiSession
              ? `<button class="btn-done-today" data-id="${item.id}" title="Done for today (task continues tomorrow)">✓ today</button>
                 <button class="btn-done-card" data-id="${item.id}" title="Fully complete — archive this task">✓✓</button>`
              : `<button class="btn-done-card" data-id="${item.id}" title="Done">✓</button>`}
            <button class="btn-edit" data-id="${item.id}" title="Edit">✎</button>
            <button class="btn-drop" data-id="${item.id}" title="Drop">×</button>
          </div>
        </div>
        ${aiPanel}
      </div>
    `;
}
