import { state } from "../state.js";
import { coerceCategoryId } from "../domain/categories.js";
import { escapeHtml } from "../utils/dom.js";
import { getTallyDateYYYYMMDD } from "../storage/local.js";
import { saveDeviceSyncState } from "../storage/pair-device.js";
import {
  normalizeJournalDayValue,
  newEntryId,
  JOURNAL_EMPTY_ENTRY_HTML
} from "../domain/journal-daily.js";
import { showToast } from "./toast.js";
import { wireRelationships } from "./relationships.js";
import { applyThemeColors } from "../ui/theme.js";
import { attachDevicePreferencesRealtime, isLocalPrefsWritePending } from "../sync/realtime.js";

/**
 * Main app DOM wiring (search, drag-drop, sidebar, modals, settings, journal, relationships, etc.).
 * @param {Object} deps — injected handlers from the orchestrator
 */
export function wireMainEvents(deps) {
    const d = deps;
    d.ensureViewToggle();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = state.searchQuery || '';
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value;
        d.renderColumns();
      });
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      state.drillDownCategory = null;
      backBtn.style.display = 'none';
      d.renderColumns();
    });

    const viewColumnsBtn = document.getElementById('view-columns-btn');
    const viewPilesBtn = document.getElementById('view-piles-btn');
    if (viewColumnsBtn) viewColumnsBtn.addEventListener('click', () => {
      state.viewMode = 'columns';
      state.drillDownCategory = null;
      const back = document.getElementById('back-btn');
      if (back) back.style.display = 'none';
      d.saveState();
      if (window.talkAbout && state.deviceSyncId) d.saveDevicePreferencesToSupabase();
      d.renderColumns();
    });
    if (viewPilesBtn) viewPilesBtn.addEventListener('click', () => {
      state.viewMode = 'piles';
      state.openColumnNoteId = null;
      d.saveState();
      if (window.talkAbout && state.deviceSyncId) d.saveDevicePreferencesToSupabase();
      d.renderColumns();
    });

    const columnsEl = document.getElementById('columns');
    if (columnsEl) {
      columnsEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      columnsEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const column = e.target.closest('.column');
        if (!column) return;
        const id = e.dataTransfer.getData('text/plain');
        const item = state.items.find(i => i.id === id);
        if (!item) return;
        if (state.viewMode === 'piles') {
          const newPileId = column.dataset.uncategorized === 'true' ? null : (column.dataset.pileId || null);
          if (item.pileId !== newPileId) {
            item.pileId = newPileId;
            d.saveState();
            d.renderColumns();
          }
        } else {
          const raw = column.dataset.category;
          if (!raw) return;
          const newCat = coerceCategoryId(raw);
          if (item.category !== newCat) {
            item.category = newCat;
            d.saveState();
            d.renderColumns();
          }
        }
      });
    }

    const todayListEl = document.getElementById('today-list');
    if (todayListEl) {
      todayListEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        todayListEl.classList.add('drag-over');
      });
      todayListEl.addEventListener('dragleave', (e) => {
        if (!todayListEl.contains(e.relatedTarget)) todayListEl.classList.remove('drag-over');
      });
      todayListEl.addEventListener('drop', (e) => {
        e.preventDefault();
        todayListEl.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const item = state.items.find(i => i.id === id);
        if (!item || item.archived) return;
        if (state.todaySuggestionIds.includes(id)) return;
        d.processAddToTodayQueue([id]);
        d.updateAddToSuggestionsBtn();
      });
    }

    /* Plan (header + sidebar): handled by delegated listener after wireComposer() so clicks always reach openPlanningEntry */
    function openWeekViewPanel() {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay') && (document.getElementById('sidebar-overlay').style.display = 'none');
      document.body.classList.remove('sidebar-open');
      const panel = document.getElementById('week-view-panel');
      if (panel) {
        d.weekPlanningApi.renderWeekViewPanel();
        panel.style.display = 'flex';
      }
    }
    const headerWeekViewBtn = document.getElementById('header-week-view-btn');
    if (headerWeekViewBtn) headerWeekViewBtn.addEventListener('click', openWeekViewPanel);
    const sidebarWeekView = document.getElementById('sidebar-week-view');
    if (sidebarWeekView) sidebarWeekView.addEventListener('click', openWeekViewPanel);
    const closeWeekView = document.getElementById('close-week-view');
    if (closeWeekView) closeWeekView.addEventListener('click', () => {
      const panel = document.getElementById('week-view-panel');
      if (panel) panel.style.display = 'none';
    });
    const weekViewOpenPlanner = document.getElementById('week-view-open-planner');
    if (weekViewOpenPlanner) weekViewOpenPlanner.addEventListener('click', () => {
      const panel = document.getElementById('week-view-panel');
      if (panel) panel.style.display = 'none';
      d.weekPlanningApi.openPlanningEntry({});
    });
    const addToSuggestionsBtn = document.getElementById('add-to-suggestions-btn');
    if (addToSuggestionsBtn) addToSuggestionsBtn.addEventListener('click', d.addToSuggestions);
    const addToSuggestionsClear = document.getElementById('add-to-suggestions-clear');
    if (addToSuggestionsClear) addToSuggestionsClear.addEventListener('click', d.clearAddToSuggestionsSelection);

    const clearBtn = document.getElementById('clear-suggestions');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      state.todaySuggestionIds = [];
      d.saveState();
      d.renderTodayList();
      d.renderFocusList();
      d.renderColumns();
    });

    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    function openSidebar() {
      document.body.classList.add('sidebar-open');
      if (sidebarOverlay) sidebarOverlay.style.display = 'block';
      if (sidebar) sidebar.classList.add('open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    }
    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.style.display = 'none';
      document.body.classList.remove('sidebar-open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', closeSidebar);
    });

    const linkPartnerBtn = document.getElementById('link-partner-btn');
    if (linkPartnerBtn) linkPartnerBtn.addEventListener('click', () => {
      closeSidebar();
      d.openLinkPartnerModal();
    });

    const addBtn = document.getElementById('add-btn');
    if (addBtn) addBtn.addEventListener('click', () => d.modalApi.openAddModal());

    const shortcutsOverlay = document.getElementById('shortcuts-overlay');
    const closeShortcutsBtn = document.getElementById('close-shortcuts');
    function openShortcutsOverlay() {
      if (shortcutsOverlay) { shortcutsOverlay.style.display = 'flex'; shortcutsOverlay.setAttribute('aria-hidden', 'false'); }
    }
    function closeShortcutsOverlay() {
      if (shortcutsOverlay) { shortcutsOverlay.style.display = 'none'; shortcutsOverlay.setAttribute('aria-hidden', 'true'); }
    }
    if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', closeShortcutsOverlay);
    if (shortcutsOverlay) shortcutsOverlay.addEventListener('click', (e) => { if (e.target === shortcutsOverlay) closeShortcutsOverlay(); });

    function isTypingInFormField(target) {
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return false;
      if (target.matches('input, textarea, select')) return true;
      if (target.isContentEditable) return true;
      return !!(target.closest && target.closest('[contenteditable="true"]'));
    }

    document.addEventListener('keydown', (e) => {
      const mainApp = document.getElementById('main-app');
      if (!mainApp || mainApp.style.display === 'none') return;
      const inFormOrRichText = isTypingInFormField(e.target);
      if (e.key === 'n' || e.key === 'N') {
        if (inFormOrRichText) return;
        e.preventDefault();
        d.openNotesPanel?.();
      } else if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inFormOrRichText) return;
        e.preventDefault();
        d.focusBrainDumpBar?.();
      } else if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inFormOrRichText) return;
        e.preventDefault();
        d.openInboxSession?.();
      } else if (e.key === 'Escape') {
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') {
          closeShortcutsOverlay();
        } else if (document.body.classList.contains('sidebar-open')) {
          closeSidebar();
        } else if (state.boardFocusMode) {
          d.exitBoardFocusMode();
        } else {
          const modals = ['add-modal', 'edit-modal', 'add-from-talk-modal', 'archive-modal', 'settings-modal', 'link-partner-modal', 'seed-render-modal', 'session-modal', 'inbox-session-modal'];
          const panels = ['analytics-panel', 'email-triage-section'];
          for (const id of modals) {
            const m = document.getElementById(id);
            if (m && m.style.display === 'flex') {
              if (id === 'add-modal') d.modalApi.closeAddModal();
              else if (id === 'edit-modal') d.modalApi.closeEditModal();
              else if (id === 'add-from-talk-modal') d.closeAddFromTalkModal();
              else if (id === 'archive-modal') d.closeArchiveModal?.();
              else if (id === 'settings-modal') d.closeSettingsModal();
              else if (id === 'link-partner-modal') d.closeLinkPartnerModal();
              else if (id === 'seed-render-modal') d.closeSeedRenderModal();
              else if (id === 'session-modal') d.closeSessionModal?.();
              else if (id === 'inbox-session-modal') d.closeInboxSession?.();
              return;
            }
          }
          for (const id of panels) {
            const p = document.getElementById(id);
            if (p && p.style.display === 'block') { p.style.display = 'none'; return; }
          }
          const weeklyReviewOvl = document.getElementById('weekly-review-overlay');
          if (weeklyReviewOvl && weeklyReviewOvl.style.display === 'flex') {
            d.closeWeeklyReview();
            return;
          }
          const consistencyPanel = document.getElementById('consistency-panel');
          if (consistencyPanel && consistencyPanel.style.display === 'block') {
            d.closeConsistencyPanel();
            return;
          }
          const journalPanel = document.getElementById('journal-panel');
          if (journalPanel && journalPanel.style.display === 'block') {
            if (state.journalFocusMode) {
              d.setJournalFocusMode(false);
              if (document.getElementById('journal-focus-btn')) document.getElementById('journal-focus-btn').focus();
            } else {
              d.closeJournalPanel();
            }
            return;
          }
          const relationshipsPanel = document.getElementById('relationships-panel');
          if (relationshipsPanel && relationshipsPanel.style.display === 'block') {
            if (state.relationshipsDetailPersonId) {
              state.relationshipsDetailPersonId = null;
              renderRelationshipsPanel();
            } else {
              closeRelationshipsPanel();
            }
            return;
          }
          const notesPanel = document.getElementById('notes-panel');
          if (notesPanel && notesPanel.style.display === 'flex') {
            d.closeNotesPanel?.();
            return;
          }
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inFormOrRichText) return;
        e.preventDefault();
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') closeShortcutsOverlay();
        else openShortcutsOverlay();
      }
    });

    /* #focus-btn: click handled by delegation on #floating-buttons (wireComposer) so it works even if bindEvents never ran */
    const seedFab = document.getElementById('seed-fab');
    if (seedFab) seedFab.addEventListener('click', d.openSeedRenderModal);

    document.querySelectorAll('.fab-wrap').forEach(wrap => {
      wrap.addEventListener('mouseenter', () => wrap.classList.add('fab-help-visible'));
      wrap.addEventListener('mouseleave', () => wrap.classList.remove('fab-help-visible'));
    });

    const closeAdd = document.getElementById('close-add');
    if (closeAdd) closeAdd.addEventListener('click', () => d.modalApi.closeAddModal());

    const addModal = document.getElementById('add-modal');
    if (addModal) addModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-modal') d.modalApi.closeAddModal();
    });

    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.addEventListener('input', () => d.modalApi.applySmartFields());
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') d.modalApi.addSingle();
      });
    }

    const submitSingle = document.getElementById('submit-single');
    if (submitSingle) submitSingle.addEventListener('click', () => d.modalApi.addSingle());
    const submitQuick = document.getElementById('submit-quick');
    if (submitQuick) submitQuick.addEventListener('click', () => d.modalApi.addQuick());
    const tabSingle = document.getElementById('tab-single');
    const tabQuick = document.getElementById('tab-quick');
    const tabVoice = document.getElementById('tab-voice');
    if (tabSingle) tabSingle.addEventListener('click', () => {
      tabSingle.classList.add('active');
      if (tabQuick) tabQuick.classList.remove('active');
      if (tabVoice) tabVoice.classList.remove('active');
      const singleAdd = document.getElementById('single-add');
      const quickAdd = document.getElementById('quick-add');
      const voiceAdd = document.getElementById('voice-add');
      if (singleAdd) singleAdd.style.display = 'block';
      if (quickAdd) quickAdd.style.display = 'none';
      if (voiceAdd) voiceAdd.style.display = 'none';
    });
    if (tabQuick) tabQuick.addEventListener('click', () => {
      if (tabSingle) tabSingle.classList.remove('active');
      tabQuick.classList.add('active');
      if (tabVoice) tabVoice.classList.remove('active');
      const singleAdd = document.getElementById('single-add');
      const quickAdd = document.getElementById('quick-add');
      const voiceAdd = document.getElementById('voice-add');
      if (singleAdd) singleAdd.style.display = 'none';
      if (quickAdd) quickAdd.style.display = 'block';
      if (voiceAdd) voiceAdd.style.display = 'none';
    });
    if (tabVoice) tabVoice.addEventListener('click', () => {
      if (tabSingle) tabSingle.classList.remove('active');
      if (tabQuick) tabQuick.classList.remove('active');
      tabVoice.classList.add('active');
      const singleAdd = document.getElementById('single-add');
      const quickAdd = document.getElementById('quick-add');
      const voiceAdd = document.getElementById('voice-add');
      if (singleAdd) singleAdd.style.display = 'none';
      if (quickAdd) quickAdd.style.display = 'none';
      if (voiceAdd) voiceAdd.style.display = 'block';
    });
    d.modalApi.initVoiceMulti();

    const closeEdit = document.getElementById('close-edit');
    if (closeEdit) closeEdit.addEventListener('click', () => d.modalApi.closeEditModal());

    const editModal = document.getElementById('edit-modal');
    if (editModal) editModal.addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') d.modalApi.closeEditModal();
    });

    const saveEditBtn = document.getElementById('save-edit');
    if (saveEditBtn) saveEditBtn.addEventListener('click', () => d.modalApi.saveEdit());

    const closeAddFromTalk = document.getElementById('close-add-from-talk');
    if (closeAddFromTalk) closeAddFromTalk.addEventListener('click', d.closeAddFromTalkModal);
    const addFromTalkModal = document.getElementById('add-from-talk-modal');
    if (addFromTalkModal) addFromTalkModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-from-talk-modal') d.closeAddFromTalkModal();
    });
    const submitAddFromTalkBtn = document.getElementById('submit-add-from-talk');
    if (submitAddFromTalkBtn) submitAddFromTalkBtn.addEventListener('click', d.submitAddFromTalk);

    const editTextEl = document.getElementById('edit-text');
    if (editTextEl) editTextEl.addEventListener('input', () => d.modalApi.applySmartFieldsToEdit());

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', d.openSettingsModal);

    const closeSettings = document.getElementById('close-settings');
    if (closeSettings) closeSettings.addEventListener('click', d.closeSettingsModal);

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) settingsModal.addEventListener('click', (e) => {
      if (e.target.id === 'settings-modal') d.closeSettingsModal();
    });

    const saveSettings = document.getElementById('save-settings');
    if (saveSettings) saveSettings.addEventListener('click', d.saveSettingsAndClose);

    const pushNowBtn = document.getElementById('settings-push-now-btn');
    if (pushNowBtn) pushNowBtn.addEventListener('click', () => d.forcePushToCloud());

    const settingsLinkBtn = document.getElementById('settings-link-btn');
    const settingsLinkCode = document.getElementById('settings-link-code');
    if (settingsLinkBtn && settingsLinkCode) {
      settingsLinkBtn.addEventListener('click', async () => {
        const code = (settingsLinkCode.value || '').trim().toLowerCase().replace(/\s/g, '');
        if (!code || code.length < 6) {
          showToast('Enter a valid sync code (6+ chars from your other device)');
          return;
        }
        state.deviceSyncId = code;
        saveDeviceSyncState();
        try {
          if (window.talkAbout) {
            const prefs = await window.talkAbout.getDevicePreferences(state.deviceSyncId);
            if (!prefs?.error) {
              const hadData = Array.isArray(prefs.__items) || Object.keys(prefs).length > 0;
              if (!isLocalPrefsWritePending(state)) {
                d.applyDevicePreferencesToState(prefs);
              }
              attachDevicePreferencesRealtime({
                state,
                talkAbout: window.talkAbout,
                applyDevicePreferencesToState: d.applyDevicePreferencesToState,
                refreshUIAfterRemotePrefs: d.refreshUIAfterRemotePrefs
              });
              if (!isLocalPrefsWritePending(state)) d.refreshUIAfterRemotePrefs();
              const syncDisplay = document.getElementById('settings-sync-code-display');
              if (syncDisplay) syncDisplay.textContent = state.deviceSyncId;
              const syncEl = document.getElementById('settings-sync-code');
              if (syncEl) syncEl.style.display = 'block';
              showToast(hadData ? 'Device linked — tasks and settings synced' : 'Device linked. Add a task on your other device and it will sync.');
            } else {
              showToast('Device linked. Could not fetch data — check connection.');
            }
          } else {
            showToast('Device linked. Supabase not configured.');
          }
        } catch (e) {
          showToast('Could not fetch — check code and connection');
        }
        settingsLinkCode.value = '';
      });
    }

    const btnColorEl = document.getElementById('settings-button-color');
    const btnHexEl = document.getElementById('settings-button-hex');
    const textColorEl = document.getElementById('settings-text-color');
    const textHexEl = document.getElementById('settings-text-hex');
    if (btnColorEl) btnColorEl.addEventListener('input', (e) => {
      state.buttonColor = e.target.value;
      if (btnHexEl) btnHexEl.value = e.target.value;
      applyThemeColors();
      d.saveDevicePreferencesToSupabase();
    });
    if (btnHexEl) btnHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.buttonColor = val;
        if (btnColorEl) btnColorEl.value = val;
        applyThemeColors();
        d.saveDevicePreferencesToSupabase();
      }
    });
    if (textColorEl) textColorEl.addEventListener('input', (e) => {
      state.textColor = e.target.value;
      if (textHexEl) textHexEl.value = e.target.value;
      applyThemeColors();
      d.saveDevicePreferencesToSupabase();
    });
    if (textHexEl) textHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.textColor = val;
        if (textColorEl) textColorEl.value = val;
        applyThemeColors();
        d.saveDevicePreferencesToSupabase();
      }
    });

    const archiveBtn = document.getElementById('archive-btn');
    if (archiveBtn) archiveBtn.addEventListener('click', d.openArchiveModal);

    const closeSeedRender = document.getElementById('close-seed-render');
    if (closeSeedRender) closeSeedRender.addEventListener('click', d.closeSeedRenderModal);
    const seedRenderModal = document.getElementById('seed-render-modal');
    if (seedRenderModal) seedRenderModal.addEventListener('click', (e) => {
      if (e.target.id === 'seed-render-modal') d.closeSeedRenderModal();
    });
    const seedRenderSet = document.getElementById('seed-render-set');
    if (seedRenderSet) seedRenderSet.addEventListener('click', () => {
      const taskSelect = document.getElementById('seed-render-task-select');
      const questionInput = document.getElementById('seed-render-question');
      const picker = document.getElementById('seed-render-picker');
      const renderingDiv = document.getElementById('seed-render-rendering');
      const taskId = taskSelect && taskSelect.value ? taskSelect.value : '';
      const question = questionInput && questionInput.value ? questionInput.value.trim() : '';
      let seed = '';
      if (taskId) {
        const item = state.items.find(i => i.id === taskId);
        seed = item ? (item.text || '').trim() : '';
      }
      if (!seed) seed = question;
      if (!seed) {
        showToast('Pick a task or type a question');
        return;
      }
      state.lastSeed = seed;
      state.seedRenderState = 'rendering';
      d.saveState();
      if (window.talkAbout && state.deviceSyncId) d.saveDevicePreferencesToSupabase();
      if (picker) picker.style.display = 'none';
      if (renderingDiv) renderingDiv.style.display = 'block';
    });
    const seedRenderDone = document.getElementById('seed-render-done');
    if (seedRenderDone) seedRenderDone.addEventListener('click', d.closeSeedRenderModal);
    const seedRenderImBack = document.getElementById('seed-render-im-back');
    if (seedRenderImBack) seedRenderImBack.addEventListener('click', () => {
      const renderingDiv = document.getElementById('seed-render-rendering');
      const reflectionDiv = document.getElementById('seed-render-reflection');
      const reflectionInput = document.getElementById('seed-render-reflection-input');
      state.seedRenderState = 'back';
      if (renderingDiv) renderingDiv.style.display = 'none';
      if (reflectionDiv) reflectionDiv.style.display = 'block';
      if (reflectionInput) { reflectionInput.value = ''; reflectionInput.focus(); }
    });
    const seedRenderReflectionSave = document.getElementById('seed-render-reflection-save');
    if (seedRenderReflectionSave) seedRenderReflectionSave.addEventListener('click', () => {
      const reflectionInput = document.getElementById('seed-render-reflection-input');
      const text = reflectionInput && reflectionInput.value ? reflectionInput.value.trim() : '';
      if (!state.seedReflections) state.seedReflections = [];
      state.seedReflections.push({
        seed: state.lastSeed || '',
        reflectedAt: Date.now(),
        text: text
      });
      d.saveState();
      if (window.talkAbout && state.deviceSyncId) d.saveDevicePreferencesToSupabase();
      showToast('Reflection saved');
      d.closeSeedRenderModal();
    });
    const seedRenderSearch = document.getElementById('seed-render-task-search');
    if (seedRenderSearch) seedRenderSearch.addEventListener('input', () => d.renderSeedTaskOptions(seedRenderSearch.value));
    const seedRenderSearchClear = document.getElementById('seed-render-task-search-clear');
    if (seedRenderSearchClear) seedRenderSearchClear.addEventListener('click', () => {
      const input = document.getElementById('seed-render-task-search');
      if (input) input.value = '';
      d.renderSeedTaskOptions('');
    });

    const closeArchive = document.getElementById('close-archive');
    if (closeArchive) closeArchive.addEventListener('click', () => d.closeArchiveModal?.());

    const archiveModal = document.getElementById('archive-modal');
    if (archiveModal) archiveModal.addEventListener('click', (e) => {
      if (e.target.id === 'archive-modal') d.closeArchiveModal?.();
    });

    const consistencyOpenFull = document.getElementById('consistency-open-full');
    if (consistencyOpenFull) consistencyOpenFull.addEventListener('click', () => {
      closeSidebar();
      d.openConsistencyPanel();
    });
    const consistencyBtn = document.getElementById('consistency-btn');
    if (consistencyBtn) consistencyBtn.addEventListener('click', d.openConsistencyPanel);
    const closeConsistency = document.getElementById('close-consistency');
    if (closeConsistency) closeConsistency.addEventListener('click', d.closeConsistencyPanel);

    const journalBtn = document.getElementById('journal-btn');
    if (journalBtn) journalBtn.addEventListener('click', d.openJournalPanel);
    const closeJournal = document.getElementById('close-journal');
    if (closeJournal) closeJournal.addEventListener('click', d.closeJournalPanel);

    document.querySelectorAll('.journal-nav-item').forEach(function(btn) {
      if (btn.id === 'journal-focus-btn') return;
      btn.addEventListener('click', function() {
        const tab = btn.dataset.tab;
        if (!tab) return;
        d.flushJournalDailySave();
        state.journalActiveTab = tab;
        document.querySelectorAll('.journal-nav-item').forEach(function(b) {
          if (b.dataset.tab) {
            b.classList.toggle('active', b.dataset.tab === tab);
            b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
          }
        });
        d.renderJournalPanel();
      });
    });

    const journalFocusBtn = document.getElementById('journal-focus-btn');
    if (journalFocusBtn) journalFocusBtn.addEventListener('click', function() {
      d.setJournalFocusMode(!state.journalFocusMode);
    });
    const journalFocusClose = document.getElementById('journal-focus-close');
    if (journalFocusClose) journalFocusClose.addEventListener('click', function() {
      d.setJournalFocusMode(false);
      var fb = document.getElementById('journal-focus-btn');
      if (fb) fb.focus();
    });
    const journalDailySave = document.getElementById('journal-daily-save');
    if (journalDailySave) journalDailySave.addEventListener('click', function() {
      d.flushJournalDailySave();
      showToast('Saved');
    });

    const journalDailyNewEntry = document.getElementById('journal-daily-new-entry');
    if (journalDailyNewEntry) {
      journalDailyNewEntry.addEventListener('click', function() {
        const tallyStr = getTallyDateYYYYMMDD();
        d.flushJournalDailySave();
        if (!state.journalDaily) state.journalDaily = {};
        const current = normalizeJournalDayValue(state.journalDaily[tallyStr]);
        const nid = newEntryId();
        current.entries.push({ id: nid, html: JOURNAL_EMPTY_ENTRY_HTML, updatedAt: Date.now() });
        state.journalDaily[tallyStr] = current;
        state.journalDailyOpenEntryByDate[tallyStr] = nid;
        d.saveState();
        d.renderJournalDaily();
        const nb = document.querySelector('#journal-daily-active-slot .journal-entry-body');
        if (nb) nb.focus();
      });
    }

    const journalDailyDeleteEntry = document.getElementById('journal-daily-delete-entry');
    if (journalDailyDeleteEntry) {
      journalDailyDeleteEntry.addEventListener('click', function() {
        const tallyStr = getTallyDateYYYYMMDD();
        const day = normalizeJournalDayValue(state.journalDaily && state.journalDaily[tallyStr]);
        if (day.entries.length < 2) return;
        if (!window.confirm('Delete this entry? This cannot be undone.')) return;
        d.flushJournalDailySave();
        const sel = state.journalDailyOpenEntryByDate[tallyStr];
        const next = day.entries.filter((e) => e.id !== sel);
        state.journalDaily[tallyStr] = normalizeJournalDayValue({ v: 2, entries: next });
        state.journalDailyOpenEntryByDate[tallyStr] = next[0].id;
        d.saveState();
        d.renderJournalDaily();
        showToast('Entry removed');
      });
    }

    const journalAddReflBtn = document.getElementById('journal-add-reflection-btn');
    const journalAddReflForm = document.getElementById('journal-add-reflection-form');
    const journalAddReflInput = document.getElementById('journal-add-reflection-input');
    const journalAddReflSave = document.getElementById('journal-add-reflection-save');
    const journalAddReflCancel = document.getElementById('journal-add-reflection-cancel');
    if (journalAddReflBtn && journalAddReflForm) {
      journalAddReflBtn.addEventListener('click', function() {
        journalAddReflForm.style.display = 'block';
        if (journalAddReflInput) { journalAddReflInput.value = ''; journalAddReflInput.focus(); }
      });
    }
    if (journalAddReflCancel && journalAddReflForm) {
      journalAddReflCancel.addEventListener('click', function() {
        journalAddReflForm.style.display = 'none';
      });
    }
    if (journalAddReflSave && journalAddReflInput) {
      journalAddReflSave.addEventListener('click', function() {
        const text = journalAddReflInput.value.trim();
        if (!text) return;
        if (!state.seedReflections) state.seedReflections = [];
        state.seedReflections.push({ seed: '', reflectedAt: Date.now(), text: text });
        d.saveState();
        if (window.talkAbout && state.deviceSyncId) d.saveDevicePreferencesToSupabase();
        journalAddReflInput.value = '';
        if (journalAddReflForm) journalAddReflForm.style.display = 'none';
        d.renderJournalReflections();
        showToast('Reflection saved');
      });
    }

    const analyticsBtn = document.getElementById('analytics-btn');
    if (analyticsBtn) analyticsBtn.addEventListener('click', d.openAnalytics);

    const emailTriageBtn = document.getElementById('email-triage-btn');
    if (emailTriageBtn) emailTriageBtn.addEventListener('click', d.openEmailTriage);

    const emailTriageRunBtn = document.getElementById('email-triage-run-btn');
    if (emailTriageRunBtn) emailTriageRunBtn.addEventListener('click', () => {
      if (!window.talkAbout) { showToast('Supabase not configured'); return; }
      const pairId = state.pairId || 'solo_default';
      window.talkAbout.requestTriageRun(pairId, state.addedBy).then(({ error }) => {
        if (error) showToast(error === 'Supabase not configured' ? error : 'Request failed');
        else showToast('Triage run requested — agent will process when it runs.');
      });
    });

    document.querySelectorAll('.close-email-triage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = document.getElementById('email-triage-section');
        if (s) s.style.display = 'none';
      });
    });

    const closeAnalytics = document.getElementById('close-analytics');
    if (closeAnalytics) closeAnalytics.addEventListener('click', () => {
      const p = document.getElementById('analytics-panel');
      if (p) p.style.display = 'none';
    });

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', d.exportBackup);

    const importBtn = document.getElementById('import-btn');
    if (importBtn) importBtn.addEventListener('click', () => document.getElementById('import-input').click());

    const importInput = document.getElementById('import-input');
    if (importInput) importInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) d.importBackup(f);
      e.target.value = '';
    });

    const talkInput = document.getElementById('talk-about-input');
    if (talkInput) talkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); d.addTalkAbout(); }
    });

    const talkAddBtn = document.getElementById('talk-about-add-btn');
    if (talkAddBtn) talkAddBtn.addEventListener('click', d.addTalkAbout);

    const hint = document.getElementById('priority-hint');
    if (hint) hint.addEventListener('click', () => {
      alert('1. Is someone else waiting? → Critical\n2. Does money/reputation depend on it? → High\n3. Would you feel relieved dropping it? → Low (else Medium)');
    });

    document.getElementById('energy-current-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      d.toggleEnergyPicker();
    });
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.addEventListener('click', () => d.setEnergy(btn.dataset.level));
    });
    document.addEventListener('click', (e) => {
      const widget = document.getElementById('energy-widget');
      if (widget && !widget.contains(e.target)) d.toggleEnergyPicker(false);
    });

    const brainDumpInput = document.getElementById('brain-dump-input');
    const brainDumpSubmit = document.getElementById('brain-dump-submit');
    if (brainDumpInput) {
      brainDumpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); d.submitBrainDump(); }
      });
    }
    if (brainDumpSubmit) brainDumpSubmit.addEventListener('click', () => d.submitBrainDump());

    const weeklyReviewBtn = document.getElementById('weekly-review-btn');
    if (weeklyReviewBtn) weeklyReviewBtn.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay') && (document.getElementById('sidebar-overlay').style.display = 'none');
      document.body.classList.remove('sidebar-open');
      d.openWeeklyReview();
    });
    const closeWeeklyReview = document.getElementById('close-weekly-review');
    if (closeWeeklyReview) closeWeeklyReview.addEventListener('click', () => d.closeWeeklyReview());
    const weeklyReviewOverlay = document.getElementById('weekly-review-overlay');
    if (weeklyReviewOverlay) weeklyReviewOverlay.addEventListener('click', (e) => {
      if (e.target === weeklyReviewOverlay) d.closeWeeklyReview();
    });

    const micBtn = document.getElementById('mic-btn');
    if (micBtn && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.textContent = '...';
      });
      recognition.onresult = (e) => {
        taskInput.value = e.results[0][0].transcript;
        micBtn.textContent = '🎤';
        d.modalApi.applySmartFields();
      };
      recognition.onerror = recognition.onend = () => { micBtn.textContent = '🎤'; };
    }

    return wireRelationships(d);
}
