/**
 * Relationships panel — list, hierarchy, person detail (LunaTask-style CRM lite).
 */
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import {
  getPeople,
  getPerson,
  getPeopleGroups,
  renamePeopleGroup,
  deletePeopleGroup,
  addPerson,
  updatePerson,
  appendPersonHistory,
  deletePerson,
  isOverdueToReconnect,
  isAgreedReconnectSnoozed,
  getNextReconnectDueYmd,
  getUpcomingBirthdays,
  getDefaultBirthdayReminderDays,
  getPersonBirthdayDaysUntil,
  addPeopleGroup,
  formatYmdFromMs,
  parseYmdToMs
} from '../domain/piles-people.js';
import { showToast } from './toast.js';

/**
 * @param {object} deps
 * @param {import('./events.js').wireMainEvents} deps — partial orchestrator deps
 */
export function wireRelationships(deps) {
  const d = deps;

  function syncPrefsIfNeeded() {
    if (window.talkAbout && state.deviceSyncId) d.saveDevicePreferencesToSupabase();
  }

  function fillRelationshipGroupSelect(selectEl, selectedId) {
    if (!selectEl) return;
    const groups = getPeopleGroups();
    selectEl.innerHTML = groups
      .map(function (g) {
        return (
          '<option value="' +
          escapeHtml(g.id) +
          '"' +
          (g.id === selectedId ? ' selected' : '') +
          '>' +
          escapeHtml(g.label) +
          '</option>'
        );
      })
      .join('');
  }

  function birthdayWhenLabel(daysUntil) {
    if (daysUntil === 0) return 'today';
    if (daysUntil === 1) return 'tomorrow';
    return 'in ' + daysUntil + ' days';
  }

  function renderRelationshipsBirthdayBanner() {
    const banner = document.getElementById('relationships-birthday-banner');
    if (!banner) return;
    const withinDays = getDefaultBirthdayReminderDays();
    const upcoming = getUpcomingBirthdays(withinDays);
    if (!upcoming.length) {
      banner.style.display = 'none';
      banner.innerHTML = '';
      return;
    }
    const items = upcoming
      .map(function (u) {
        return (
          '<button type="button" class="relationships-birthday-chip" data-person-id="' +
          escapeHtml(u.person.id) +
          '">🎂 ' +
          escapeHtml(u.person.name) +
          ' (' +
          escapeHtml(birthdayWhenLabel(u.daysUntil)) +
          ')</button>'
        );
      })
      .join('');
    banner.innerHTML =
      '<p class="relationships-birthday-banner-title"><strong>Upcoming birthdays</strong></p><div class="relationships-birthday-chips">' +
      items +
      '</div>';
    banner.style.display = 'block';
    banner.querySelectorAll('.relationships-birthday-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.relationshipsDetailPersonId = chip.dataset.personId;
        renderRelationshipsPanel();
      });
    });
  }

  function personRowMetaHtml(p) {
    const withinDays = getDefaultBirthdayReminderDays();
    const bdays = getPersonBirthdayDaysUntil(p, withinDays);
    const lastStr =
      p.lastConnected == null ? 'Never' : formatYmdFromMs(p.lastConnected);
    const nextDue = getNextReconnectDueYmd(p);
    const due = isOverdueToReconnect(p);
    const snoozed = isAgreedReconnectSnoozed(p);
    const improve = !!p.wantToImprove;
    let badges = '';
    if (improve) badges += '<span class="relationships-improve-badge" title="Want to improve">↑</span>';
    if (bdays != null) {
      badges +=
        '<span class="relationships-birthday-badge" title="Birthday coming up">🎂 ' +
        escapeHtml(birthdayWhenLabel(bdays)) +
        '</span>';
    }
    if (snoozed && p.agreedReconnectOn != null) {
      const agreedStr =
        typeof p.agreedReconnectOn === 'number'
          ? formatYmdFromMs(p.agreedReconnectOn)
          : String(p.agreedReconnectOn).slice(0, 10);
      badges +=
        '<span class="relationships-meeting-badge">Meet ' + escapeHtml(agreedStr) + '</span>';
    } else if (due) {
      badges += '<span class="relationships-due-badge">Due to reconnect</span>';
    }
  const nextLine = nextDue
      ? '<span class="relationships-person-meta">Next: ' + escapeHtml(nextDue) + '</span>'
      : '';
    return (
      '<span class="relationships-person-name">' +
      escapeHtml(p.name) +
      badges +
      '</span>' +
      '<span class="relationships-person-meta">Last: ' +
      escapeHtml(lastStr) +
      '</span>' +
      nextLine
    );
  }

  function bindPersonRowClicks(container) {
    if (!container) return;
    container.querySelectorAll('.relationships-person-row').forEach(function (row) {
      row.addEventListener('click', function () {
        state.relationshipsDetailPersonId = row.dataset.personId;
        renderRelationshipsPanel();
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          state.relationshipsDetailPersonId = row.dataset.personId;
          renderRelationshipsPanel();
        }
      });
    });
  }

  function setRelationshipsViewMode(mode) {
    state.relationshipsViewMode = mode === 'hierarchy' ? 'hierarchy' : 'list';
    const listTab = document.getElementById('relationships-tab-list');
    const hierTab = document.getElementById('relationships-tab-hierarchy');
    const listContainer = document.getElementById('relationships-list-container');
    const hierView = document.getElementById('relationships-hierarchy-view');
    if (listTab) listTab.classList.toggle('active', state.relationshipsViewMode === 'list');
    if (hierTab) hierTab.classList.toggle('active', state.relationshipsViewMode === 'hierarchy');
    if (listContainer) listContainer.style.display = state.relationshipsViewMode === 'list' ? 'block' : 'none';
    if (hierView) hierView.style.display = state.relationshipsViewMode === 'hierarchy' ? 'block' : 'none';
    if (state.relationshipsViewMode === 'list') renderRelationshipsList();
    else renderRelationshipsHierarchy();
  }

  function renderRelationshipsList() {
    const container = document.getElementById('relationships-group-list');
    if (!container) return;
    const addGrpEl = document.getElementById('relationships-add-group');
    const prevSel = addGrpEl && addGrpEl.value ? addGrpEl.value : 'friends';
    fillRelationshipGroupSelect(addGrpEl, prevSel);
    const people = getPeople();
    const groups = getPeopleGroups();
    const byGroup = {};
    groups.forEach(function (g) {
      byGroup[g.id] = people.filter(function (p) {
        return p.group === g.id;
      });
    });
    container.innerHTML =
      people.length === 0
        ? '<p class="empty-state">No people yet. Add someone to stay in touch.</p>'
        : groups
            .map(function (g) {
              const list = byGroup[g.id] || [];
              if (list.length === 0) return '';
              return (
                '<div class="relationships-group-section"><h4 class="relationships-group-title">' +
                escapeHtml(g.label) +
                ' (' +
                list.length +
                ')</h4><div class="relationships-person-list">' +
                list
                  .map(function (p) {
                    return (
                      '<div class="relationships-person-row' +
                      (isOverdueToReconnect(p) ? ' relationships-person-row--due' : '') +
                      (p.wantToImprove ? ' relationships-person-row--improve' : '') +
                      '" data-person-id="' +
                      escapeHtml(p.id) +
                      '" role="button" tabindex="0">' +
                      personRowMetaHtml(p) +
                      '</div>'
                    );
                  })
                  .join('') +
                '</div></div>'
              );
            })
            .join('');
    bindPersonRowClicks(container);
    renderRelationshipsBirthdayBanner();
  }

  function renderRelationshipsHierarchy() {
    const container = document.getElementById('relationships-hierarchy-view');
    if (!container) return;
    if (!state.relationshipsCollapsedGroupIds) state.relationshipsCollapsedGroupIds = {};
    const people = getPeople();
    const groups = getPeopleGroups();
    if (!people.length) {
      container.innerHTML = '<p class="empty-state">No people yet. Add someone to see your hierarchy.</p>';
      return;
    }
    const overdueCount = people.filter(isOverdueToReconnect).length;
    const improveCount = people.filter(function (p) {
      return p.wantToImprove;
    }).length;
    let summary = '<p class="relationships-hierarchy-summary">';
    if (overdueCount) summary += '<span class="relationships-due-badge">' + overdueCount + ' due</span> ';
    if (improveCount) summary += '<span class="relationships-improve-badge">' + improveCount + ' to improve</span>';
    summary += '</p>';
    container.innerHTML =
      summary +
      '<div class="relationships-hierarchy-stack">' +
      groups
        .map(function (g, tierIndex) {
          const list = people.filter(function (p) {
            return p.group === g.id;
          });
          if (!list.length) return '';
          const collapsed = !!state.relationshipsCollapsedGroupIds[g.id];
          const dueInTier = list.filter(isOverdueToReconnect).length;
          return (
            '<section class="relationships-hierarchy-tier relationships-hierarchy-tier--' +
            escapeHtml(g.id) +
            '" data-tier="' +
            tierIndex +
            '" style="--tier-index:' +
            tierIndex +
            '">' +
            '<button type="button" class="relationships-hierarchy-tier-head" data-group-id="' +
            escapeHtml(g.id) +
            '" aria-expanded="' +
            (!collapsed) +
            '">' +
            '<span class="relationships-hierarchy-chevron">' +
            (collapsed ? '▸' : '▾') +
            '</span> ' +
            escapeHtml(g.label) +
            ' <span class="badge-count">' +
            list.length +
            '</span>' +
            (dueInTier ? ' <span class="relationships-due-badge">' + dueInTier + ' due</span>' : '') +
            '</button>' +
            '<div class="relationships-hierarchy-tier-body"' +
            (collapsed ? ' hidden' : '') +
            '>' +
            '<div class="relationships-hierarchy-chips">' +
            list
              .map(function (p) {
                return (
                  '<button type="button" class="relationships-hierarchy-chip' +
                  (isOverdueToReconnect(p) ? ' relationships-hierarchy-chip--due' : '') +
                  (p.wantToImprove ? ' relationships-hierarchy-chip--improve' : '') +
                  '" data-person-id="' +
                  escapeHtml(p.id) +
                  '">' +
                  (p.wantToImprove ? '<span class="relationships-improve-badge">↑</span> ' : '') +
                  escapeHtml(p.name) +
                  (isOverdueToReconnect(p) ? ' •' : '') +
                  '</button>'
                );
              })
              .join('') +
            '</div></div></section>'
          );
        })
        .join('') +
      '</div>';
    container.querySelectorAll('.relationships-hierarchy-tier-head').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const gid = btn.dataset.groupId;
        if (!gid) return;
        if (!state.relationshipsCollapsedGroupIds) state.relationshipsCollapsedGroupIds = {};
        state.relationshipsCollapsedGroupIds[gid] = !state.relationshipsCollapsedGroupIds[gid];
        renderRelationshipsHierarchy();
      });
    });
    container.querySelectorAll('.relationships-hierarchy-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.relationshipsDetailPersonId = chip.dataset.personId;
        renderRelationshipsPanel();
      });
    });
    renderRelationshipsBirthdayBanner();
  }

  function markPersonConnectedToday(personId) {
    updatePerson(personId, { lastConnected: Date.now(), agreedReconnectOn: null });
    appendPersonHistory(personId, 'Marked connected');
    showToast('Marked connected');
    syncPrefsIfNeeded();
  }

  function renderRelationshipsDetail(personId) {
    const content = document.getElementById('relationships-detail-content');
    if (!content) return;
    const person = getPerson(personId);
    if (!person) {
      state.relationshipsDetailPersonId = null;
      renderRelationshipsPanel();
      return;
    }
    const lastDateVal = person.lastConnected != null ? formatYmdFromMs(person.lastConnected) : '';
    const agreedVal =
      person.agreedReconnectOn != null
        ? typeof person.agreedReconnectOn === 'number'
          ? formatYmdFromMs(person.agreedReconnectOn)
          : String(person.agreedReconnectOn).slice(0, 10)
        : '';
    const nextDue = getNextReconnectDueYmd(person);
    const due = isOverdueToReconnect(person);
    const snoozed = isAgreedReconnectSnoozed(person);
    let statusHtml = '';
    if (person.reconnectRule && person.reconnectRule.interval) {
      if (snoozed && agreedVal) {
        statusHtml =
          '<p class="relationships-status-line relationships-status--snooze">Meeting scheduled for <strong>' +
          escapeHtml(agreedVal) +
          '</strong></p>';
      } else if (due) {
        statusHtml =
          '<p class="relationships-status-line relationships-status--due"><strong>Due to reconnect</strong>' +
          (nextDue ? ' (since ' + escapeHtml(nextDue) + ')' : '') +
          '</p>';
      } else if (nextDue) {
        statusHtml =
          '<p class="relationships-status-line">Next reconnect: <strong>' + escapeHtml(nextDue) + '</strong></p>';
      }
    }
    const hist = (person.history || []).slice().sort(function (a, b) {
      return (b.at || 0) - (a.at || 0);
    });
    const historyHtml = hist.length
      ? hist
          .map(function (h) {
            const dt = new Date(h.at);
            return (
              '<div class="relationships-history-row"><span class="relationships-history-date">' +
              escapeHtml(dt.toLocaleString()) +
              '</span><p class="relationships-history-text">' +
              escapeHtml(h.text) +
              '</p></div>'
            );
          })
          .join('')
      : '<p class="empty-state">No history yet — add notes as you go.</p>';
    const linked = (state.items || []).filter(function (i) {
      return !i.archived && i.personId === personId;
    });
    const emailVal = person.email || '';
    const phoneVal = person.phone || '';
    const birthdayVal = person.birthday || '';
    const talkVal = person.talkAboutNext || '';

    content.innerHTML =
      statusHtml +
      '<div class="relationships-detail-block relationships-detail-form">' +
      '<label>Name</label><input type="text" id="relationships-detail-name" class="settings-name-input" maxlength="120" value="' +
      escapeHtml(person.name) +
      '">' +
      '<label class="relationships-checkbox-label"><input type="checkbox" id="relationships-detail-improve"' +
      (person.wantToImprove ? ' checked' : '') +
      '> Want to improve this relationship</label>' +
      '<label>Group</label><select id="relationships-detail-group" class="settings-select"></select>' +
      '<label>Email</label><input type="email" id="relationships-detail-email" class="settings-name-input" maxlength="120" value="' +
      escapeHtml(emailVal) +
      '" placeholder="optional">' +
      '<label>Phone</label><input type="tel" id="relationships-detail-phone" class="settings-name-input" maxlength="40" value="' +
      escapeHtml(phoneVal) +
      '" placeholder="optional">' +
      '<label>Birthday</label><input type="date" id="relationships-detail-birthday" class="settings-name-input" value="' +
      escapeHtml(birthdayVal) +
      '">' +
      '<label>Talk about next time</label><textarea id="relationships-detail-talk" class="settings-name-input" rows="2" placeholder="Topics for your next chat">' +
      escapeHtml(talkVal) +
      '</textarea>' +
      '<label>Last connected</label><input type="date" id="relationships-detail-last" class="settings-name-input" value="' +
      escapeHtml(lastDateVal) +
      '">' +
      '<label>Reconnect reminder</label><select id="relationships-detail-reconnect" class="settings-select">' +
      '<option value="">No reminder</option><option value="1w">Every week</option><option value="2w">Every 2 weeks</option>' +
      '<option value="1m">Every month</option><option value="3m">Every 3 months</option></select>' +
      '<label>Agreed to meet on (optional)</label><input type="date" id="relationships-detail-agreed" class="settings-name-input" value="' +
      escapeHtml(agreedVal) +
      '"><p class="settings-hint">Clears the “due” badge until after this date.</p>' +
      '<label>General notes</label><textarea id="relationships-detail-notes" class="settings-name-input" rows="3" placeholder="Things to remember">' +
      escapeHtml(person.notes || '') +
      '</textarea>' +
      '<div class="relationships-detail-save-row">' +
      '<button type="button" id="relationships-detail-save" class="btn-primary btn-sm">Save changes</button>' +
      '<button type="button" id="relationships-mark-connected" class="btn-secondary btn-sm">Mark connected today</button>' +
      '</div><p class="settings-hint relationships-shortcut-hint">Tip: press <kbd>R</kbd> to mark connected.</p></div>' +
      '<h4>History</h4>' +
      '<div class="relationships-history-list">' +
      historyHtml +
      '</div>' +
      '<label class="relationships-history-add-label">Add to history</label>' +
      '<textarea id="relationships-history-new" class="settings-name-input" rows="2" placeholder="e.g. Video call, sent a card, deep talk about…"></textarea>' +
      '<button type="button" id="relationships-history-add" class="btn-secondary btn-sm">Add note</button>' +
      '<h4>Linked tasks</h4>' +
      (linked.length
        ? '<ul class="relationships-linked-tasks">' +
          linked
            .map(function (i) {
              return (
                '<li><button type="button" class="btn-link relationships-open-task" data-id="' +
                escapeHtml(i.id) +
                '">' +
                escapeHtml((i.text || '').slice(0, 60)) +
                (i.text && i.text.length > 60 ? '…' : '') +
                '</button></li>'
              );
            })
            .join('') +
          '</ul>'
        : '<p class="empty-state">No tasks linked.</p>') +
      '<div class="relationships-detail-actions">' +
      '<button type="button" id="relationships-delete-person" class="btn-secondary btn-sm">Delete person</button></div>';

    fillRelationshipGroupSelect(document.getElementById('relationships-detail-group'), person.group);
    const recSel = document.getElementById('relationships-detail-reconnect');
    if (recSel && person.reconnectRule && person.reconnectRule.interval) recSel.value = person.reconnectRule.interval;

    document.getElementById('relationships-detail-save')?.addEventListener('click', function () {
      const name = (document.getElementById('relationships-detail-name') || {}).value.trim();
      const group = (document.getElementById('relationships-detail-group') || {}).value;
      const lastVal = (document.getElementById('relationships-detail-last') || {}).value;
      const lastMs = lastVal ? parseYmdToMs(lastVal) : null;
      const rec = (document.getElementById('relationships-detail-reconnect') || {}).value;
      const reconnectRule = rec ? { interval: rec } : null;
      const agreedRaw = (document.getElementById('relationships-detail-agreed') || {}).value;
      const agreedReconnectOn = agreedRaw ? parseYmdToMs(agreedRaw) : null;
      const notesRaw = (document.getElementById('relationships-detail-notes') || {}).value;
      const notes = (notesRaw || '').trim() || null;
      const wantToImprove = !!(document.getElementById('relationships-detail-improve') || {}).checked;
      const email = (document.getElementById('relationships-detail-email') || {}).value.trim() || null;
      const phone = (document.getElementById('relationships-detail-phone') || {}).value.trim() || null;
      const birthday = (document.getElementById('relationships-detail-birthday') || {}).value || null;
      const talkAboutNext = (document.getElementById('relationships-detail-talk') || {}).value.trim() || null;
      if (!name) {
        showToast('Name required');
        return;
      }
      updatePerson(personId, {
        name,
        group,
        lastConnected: lastMs,
        reconnectRule,
        agreedReconnectOn,
        wantToImprove,
        email,
        phone,
        birthday,
        talkAboutNext,
        notes
      });
      showToast('Saved');
      renderRelationshipsDetail(personId);
      syncPrefsIfNeeded();
    });

    document.getElementById('relationships-mark-connected')?.addEventListener('click', function () {
      markPersonConnectedToday(personId);
      renderRelationshipsDetail(personId);
    });

    document.getElementById('relationships-history-add')?.addEventListener('click', function () {
      const t = (document.getElementById('relationships-history-new') || {}).value.trim();
      if (!t) return;
      appendPersonHistory(personId, t);
      document.getElementById('relationships-history-new').value = '';
      renderRelationshipsDetail(personId);
      showToast('History updated');
      syncPrefsIfNeeded();
    });

    content.querySelectorAll('.relationships-open-task').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeRelationshipsPanel();
        d.modalApi.openEditModal(btn.dataset.id);
      });
    });

    document.getElementById('relationships-delete-person')?.addEventListener('click', function () {
      const count = linked.length;
      if (
        !window.confirm(
          'Delete this person? ' +
            (count ? count + ' task(s) will no longer be linked to them.' : '')
        )
      )
        return;
      deletePerson(personId);
      state.relationshipsDetailPersonId = null;
      renderRelationshipsPanel();
      d.renderColumns();
      showToast('Person removed');
    });
  }

  function renderRelationshipsPanel() {
    const listView = document.getElementById('relationships-list-view');
    const detailView = document.getElementById('relationships-detail-view');
    const backBtn = document.getElementById('relationships-back');
    const headerH3 = document.querySelector('#relationships-header h3');
    const tabsRow = document.getElementById('relationships-view-tabs');
    if (state.relationshipsDetailPersonId) {
      if (listView) listView.style.display = 'none';
      if (detailView) detailView.style.display = 'block';
      if (backBtn) backBtn.style.display = 'inline-block';
      if (headerH3) headerH3.style.display = 'none';
      if (tabsRow) tabsRow.style.display = 'none';
      const bdayBanner = document.getElementById('relationships-birthday-banner');
      if (bdayBanner) bdayBanner.style.display = 'none';
      renderRelationshipsDetail(state.relationshipsDetailPersonId);
    } else {
      if (listView) listView.style.display = 'block';
      if (detailView) detailView.style.display = 'none';
      if (backBtn) backBtn.style.display = 'none';
      if (headerH3) headerH3.style.display = 'block';
      if (tabsRow) tabsRow.style.display = 'flex';
      setRelationshipsViewMode(state.relationshipsViewMode || 'list');
    }
  }

  function renderRelationshipsGroupsPanel() {
    const panel = document.getElementById('relationships-groups-panel');
    const listEl = document.getElementById('relationships-groups-list');
    if (!panel || !listEl) return;
    const groups = getPeopleGroups();
    listEl.innerHTML = groups
      .map(function (g) {
        const count = getPeople().filter(function (p) {
          return p.group === g.id;
        }).length;
        return (
          '<li class="relationships-group-edit-row" data-group-id="' +
          escapeHtml(g.id) +
          '">' +
          '<input type="text" class="settings-name-input relationships-group-rename" value="' +
          escapeHtml(g.label) +
          '" maxlength="48" aria-label="Group name">' +
          '<span class="relationships-group-count">' +
          count +
          ' people</span>' +
          '<button type="button" class="btn-secondary btn-sm relationships-group-save">Rename</button>' +
          '<button type="button" class="btn-secondary btn-sm relationships-group-delete">Delete</button>' +
          '</li>'
        );
      })
      .join('');
    listEl.querySelectorAll('.relationships-group-save').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const row = btn.closest('.relationships-group-edit-row');
        const id = row && row.dataset.groupId;
        const inp = row && row.querySelector('.relationships-group-rename');
        if (!id || !inp) return;
        renamePeopleGroup(id, inp.value);
        renderRelationshipsGroupsPanel();
        fillRelationshipGroupSelect(document.getElementById('relationships-add-group'), id);
        showToast('Group updated');
      });
    });
    listEl.querySelectorAll('.relationships-group-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const row = btn.closest('.relationships-group-edit-row');
        const id = row && row.dataset.groupId;
        if (!id) return;
        if (!window.confirm('Delete this group? People in it move to Friends.')) return;
        deletePeopleGroup(id);
        renderRelationshipsGroupsPanel();
        fillRelationshipGroupSelect(document.getElementById('relationships-add-group'), 'friends');
        renderRelationshipsPanel();
        showToast('Group removed');
      });
    });
  }

  function openRelationshipsPanel(personId) {
    state.relationshipsDetailPersonId = personId || null;
    const panel = document.getElementById('relationships-panel');
    if (!panel) return;
    panel.style.display = 'block';
    renderRelationshipsPanel();
  }

  function closeRelationshipsPanel() {
    state.relationshipsDetailPersonId = null;
    const panel = document.getElementById('relationships-panel');
    if (panel) panel.style.display = 'none';
  }

  document.getElementById('relationships-tab-list')?.addEventListener('click', function () {
    setRelationshipsViewMode('list');
  });
  document.getElementById('relationships-tab-hierarchy')?.addEventListener('click', function () {
    setRelationshipsViewMode('hierarchy');
  });

  document.getElementById('relationships-back')?.addEventListener('click', function () {
    state.relationshipsDetailPersonId = null;
    renderRelationshipsPanel();
  });
  document.getElementById('close-relationships')?.addEventListener('click', closeRelationshipsPanel);
  document.getElementById('relationships-btn')?.addEventListener('click', function () {
    openRelationshipsPanel();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'r' && e.key !== 'R') return;
    if (!state.relationshipsDetailPersonId) return;
    const panel = document.getElementById('relationships-panel');
    if (!panel || panel.style.display !== 'block') return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    const pid = state.relationshipsDetailPersonId;
    markPersonConnectedToday(pid);
    renderRelationshipsDetail(pid);
  });

  const relAddBtn = document.getElementById('relationships-add-person');
  const relAddForm = document.getElementById('relationships-add-form');
  const relAddName = document.getElementById('relationships-add-name');
  const relAddGroup = document.getElementById('relationships-add-group');
  const relAddLast = document.getElementById('relationships-add-last-connected');
  const relAddReconnect = document.getElementById('relationships-add-reconnect');
  const relAddNotes = document.getElementById('relationships-add-notes');
  const relAddBirthday = document.getElementById('relationships-add-birthday');
  const relAddSave = document.getElementById('relationships-add-save');
  const relAddCancel = document.getElementById('relationships-add-cancel');
  if (relAddBtn && relAddForm) {
    relAddBtn.addEventListener('click', function () {
      relAddForm.style.display = 'block';
      fillRelationshipGroupSelect(relAddGroup, relAddGroup && relAddGroup.value ? relAddGroup.value : 'friends');
      if (relAddName) {
        relAddName.value = '';
        relAddName.focus();
      }
      if (relAddLast) relAddLast.value = '';
      if (relAddReconnect) relAddReconnect.value = '';
      if (relAddNotes) relAddNotes.value = '';
      if (relAddBirthday) relAddBirthday.value = '';
    });
  }
  if (relAddCancel && relAddForm) {
    relAddCancel.addEventListener('click', function () {
      relAddForm.style.display = 'none';
    });
  }
  if (relAddSave && relAddName) {
    relAddSave.addEventListener('click', function () {
      const name = (relAddName.value || '').trim();
      if (!name) return;
      const group = relAddGroup && relAddGroup.value ? relAddGroup.value : 'friends';
      const lastVal = relAddLast && relAddLast.value ? relAddLast.value : null;
      const lastMs = lastVal ? parseYmdToMs(lastVal) : null;
      const reconnectVal = relAddReconnect && relAddReconnect.value ? relAddReconnect.value : null;
      const reconnectRule = reconnectVal ? { interval: reconnectVal } : null;
      const notes = relAddNotes && relAddNotes.value ? relAddNotes.value.trim() : null;
      const birthday = relAddBirthday && relAddBirthday.value ? relAddBirthday.value : null;
      addPerson({ name, group, lastConnected: lastMs, reconnectRule, notes, birthday });
      relAddForm.style.display = 'none';
      relAddName.value = '';
      renderRelationshipsPanel();
      showToast('Person added');
      syncPrefsIfNeeded();
    });
  }

  const relToggleGroups = document.getElementById('relationships-toggle-groups');
  const relGroupsPanel = document.getElementById('relationships-groups-panel');
  if (relToggleGroups && relGroupsPanel) {
    relToggleGroups.addEventListener('click', function () {
      const open = relGroupsPanel.style.display !== 'block';
      relGroupsPanel.style.display = open ? 'block' : 'none';
      if (open) renderRelationshipsGroupsPanel();
    });
  }
  document.getElementById('relationships-new-group-add')?.addEventListener('click', function () {
    const inp = document.getElementById('relationships-new-group-name');
    const id = addPeopleGroup(inp && inp.value);
    if (!id) {
      showToast('Enter a group name');
      return;
    }
    if (inp) inp.value = '';
    renderRelationshipsGroupsPanel();
    fillRelationshipGroupSelect(document.getElementById('relationships-add-group'), id);
    showToast('Group added');
    syncPrefsIfNeeded();
  });

  return { openRelationshipsPanel, closeRelationshipsPanel };
}
