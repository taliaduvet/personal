(function() {
  'use strict';

  const CATEGORY_PRESETS = {
    generic: [
      { id: 'work', label: 'Work' },
      { id: 'hobbies', label: 'Hobbies' },
      { id: 'life', label: 'Life' },
      { id: 'other', label: 'Other' }
    ],
    creative: [
      { id: 'misfit', label: 'Misfit' },
      { id: 'stop2030barclay', label: 'Stop 2030 Barclay' },
      { id: 'cycles', label: 'Cycles' },
      { id: 'life', label: 'Life' }
    ]
  };

  function getCategories() {
    const preset = state.categoryPreset || 'generic';
    return CATEGORY_PRESETS[preset] || CATEGORY_PRESETS.generic;
  }

  function getOrderedCategoryIds() {
    const baseIds = getCategories().map(c => c.id);
    if (state.columnOrder && state.columnOrder.length) {
      const order = state.columnOrder.filter(id => baseIds.includes(id));
      const rest = baseIds.filter(id => !order.includes(id));
      return [...order, ...rest];
    }
    return baseIds;
  }

  const PRESET_MIGRATION = {
    generic_to_creative: { work: 'misfit', hobbies: 'stop2030barclay', life: 'life', other: 'cycles' },
    creative_to_generic: { misfit: 'work', stop2030barclay: 'hobbies', life: 'life', cycles: 'other' }
  };

  const PRIORITIES = ['critical', 'high', 'medium', 'low'];
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  const STORAGE_PREFIX = 'parkingLotCouples_';
  const HAS_CHOSEN_SOLO_KEY = STORAGE_PREFIX + 'hasChosenSolo';

  const DEFAULT_COLUMN_COLORS = {
    work: '#e07a5f',
    hobbies: '#81b29a',
    life: '#f2cc8f',
    other: '#9ca3af',
    misfit: '#e07a5f',
    stop2030barclay: '#81b29a',
    cycles: '#f2cc8f'
  };

  let state = {
    items: [],
    todaySuggestionIds: [],
    completedTodayCount: 0,
    lastCompletedDate: null,
    lastCategory: 'life',
    drillDownCategory: null,
    selectedIds: new Set(),
    searchQuery: '',
    undoItem: null,
    undoTimeout: null,
    editingId: null,
    pairId: null,
    addedBy: null,
    deviceSyncId: null,
    talkAboutItems: [],
    talkAboutUnsubscribe: null,
    prefsUnsubscribe: null,
    customLabels: {},
    columnColors: {},
    columnOrder: null,
    categoryPreset: 'generic',
    buttonColor: null,
    textColor: null,
    displayName: '',
    emailTriageItems: [],
    lastAgentRun: null,
    emailTriageUnsubscribe: null,
    savePrefsTimeout: null,
    processingIds: new Set(),
    expandingMetaCardId: null,
    addFromTalkItem: null,
    tallyResetHour: 3,
    piles: [],
    viewMode: 'columns',
    showSuggestNext: true,
    suggestNextStripTimeout: null,
    columnNotes: {},
    openColumnNoteId: null,
    columnNoteSaveTimeouts: {},
    lastSeed: null,
    seedRenderTaskCache: [],
    seedRenderState: null,
    seedReflections: [],
    habits: [],
    habitCompletions: [],
    journalDaily: {},
    journalActiveTab: 'daily',
    journalFocusMode: false,
    journalDailySaveTimeout: null,
    people: [],
    relationshipsDetailPersonId: null
  };

  function loadPairState() {
    state.pairId = localStorage.getItem(STORAGE_PREFIX + 'pairId');
    state.addedBy = localStorage.getItem(STORAGE_PREFIX + 'addedBy') || 'Talia';
  }

  function hasChosenSolo() {
    return localStorage.getItem(HAS_CHOSEN_SOLO_KEY) === 'true';
  }

  function setChosenSolo() {
    localStorage.setItem(HAS_CHOSEN_SOLO_KEY, 'true');
  }

  function savePairState() {
    if (state.pairId) localStorage.setItem(STORAGE_PREFIX + 'pairId', state.pairId);
    if (state.addedBy) localStorage.setItem(STORAGE_PREFIX + 'addedBy', state.addedBy);
  }

  function loadDeviceSyncState() {
    state.deviceSyncId = localStorage.getItem(STORAGE_PREFIX + 'deviceSyncId');
  }

  function saveDeviceSyncState() {
    if (state.deviceSyncId) localStorage.setItem(STORAGE_PREFIX + 'deviceSyncId', state.deviceSyncId);
  }

  function getTallyDate() {
    const n = new Date();
    const hour = (state.tallyResetHour != null && state.tallyResetHour >= 0 && state.tallyResetHour <= 23)
      ? state.tallyResetHour : 3;
    if (n.getHours() < hour) n.setDate(n.getDate() - 1);
    return n.toDateString();
  }

  function getTallyDateYYYYMMDD() {
    const n = new Date();
    const hour = (state.tallyResetHour != null && state.tallyResetHour >= 0 && state.tallyResetHour <= 23)
      ? state.tallyResetHour : 3;
    if (n.getHours() < hour) n.setDate(n.getDate() - 1);
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function countCompletedInTallyDay() {
    const hour = (state.tallyResetHour != null && state.tallyResetHour >= 0 && state.tallyResetHour <= 23)
      ? state.tallyResetHour : 3;
    const now = new Date();
    const start = new Date(now);
    start.setHours(hour, 0, 0, 0);
    if (now.getHours() < hour) start.setDate(start.getDate() - 1);
    const startMs = start.getTime();
    return state.items.filter(i => i.completedAt && i.completedAt >= startMs).length;
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'data');
      if (stored) {
        const parsed = JSON.parse(stored);
        state.items = (parsed.items || []).map(i => ({ ...i, doingDate: i.doingDate || null }));
        state.todaySuggestionIds = parsed.todaySuggestionIds || [];
        state.lastCategory = parsed.lastCategory || 'life';
        state.customLabels = parsed.customLabels || {};
        state.categoryPreset = parsed.categoryPreset || 'generic';
        state.buttonColor = parsed.buttonColor || null;
        state.textColor = parsed.textColor || null;
        state.displayName = parsed.displayName || '';
        if (parsed.columnColors && Object.keys(parsed.columnColors).length) state.columnColors = parsed.columnColors;
        if (Array.isArray(parsed.columnOrder) && parsed.columnOrder.length) state.columnOrder = parsed.columnOrder;
        if (typeof parsed.tallyResetHour === 'number' && parsed.tallyResetHour >= 0 && parsed.tallyResetHour <= 23) state.tallyResetHour = parsed.tallyResetHour;
        if (Array.isArray(parsed.piles)) state.piles = parsed.piles;
        if (parsed.viewMode === 'piles' || parsed.viewMode === 'columns') state.viewMode = parsed.viewMode;
        if (typeof parsed.showSuggestNext === 'boolean') state.showSuggestNext = parsed.showSuggestNext;
        if (parsed.columnNotes && typeof parsed.columnNotes === 'object') state.columnNotes = parsed.columnNotes;
        if (typeof parsed.lastSeed === 'string') state.lastSeed = parsed.lastSeed;
        if (Array.isArray(parsed.seedReflections)) state.seedReflections = parsed.seedReflections;
        if (Array.isArray(parsed.habits)) state.habits = parsed.habits;
        if (Array.isArray(parsed.habitCompletions)) state.habitCompletions = parsed.habitCompletions;
        if (parsed.journalDaily && typeof parsed.journalDaily === 'object') {
          state.journalDaily = {};
          const keyRe = /^\d{4}-\d{2}-\d{2}$/;
          Object.keys(parsed.journalDaily).forEach(function(k) {
            if (keyRe.test(k)) state.journalDaily[k] = parsed.journalDaily[k];
          });
        }
        if (Array.isArray(parsed.people)) state.people = parsed.people;
      }
      if (!state.journalDaily || typeof state.journalDaily !== 'object') state.journalDaily = {};
      if (!Array.isArray(state.people)) state.people = [];
      var peopleIds = (state.people || []).map(function(p) { return p.id; });
      state.items = (state.items || []).map(i => ({
        ...i,
        pileId: i.pileId != null ? i.pileId : null,
        friction: i.friction && ['quick', 'medium', 'deep'].includes(i.friction) ? i.friction : null,
        firstStep: typeof i.firstStep === 'string' ? i.firstStep : null,
        personId: (i.personId && peopleIds.indexOf(i.personId) >= 0) ? i.personId : null
      }));
      state.completedTodayCount = countCompletedInTallyDay();
    } catch (e) {
      console.warn('Load failed', e);
      showToast('Could not load saved data — starting fresh');
    }
  }

  function saveState(skipCloudSync, useRemoteTallyDate) {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'data', JSON.stringify({
        items: state.items,
        todaySuggestionIds: state.todaySuggestionIds,
        lastCategory: state.lastCategory,
        customLabels: state.customLabels,
        categoryPreset: state.categoryPreset || 'generic',
        buttonColor: state.buttonColor,
        textColor: state.textColor,
        displayName: state.displayName || '',
        columnColors: state.columnColors || {},
        columnOrder: state.columnOrder || null,
        tallyResetHour: state.tallyResetHour != null ? state.tallyResetHour : 3,
        piles: state.piles || [],
        viewMode: state.viewMode || 'columns',
        showSuggestNext: state.showSuggestNext !== false,
        columnNotes: state.columnNotes || {},
        lastSeed: state.lastSeed || null,
        seedReflections: state.seedReflections || [],
        habits: state.habits || [],
        habitCompletions: state.habitCompletions || [],
        journalDaily: state.journalDaily || {},
        people: state.people || []
      }));
      const tallyDate = useRemoteTallyDate && state.lastCompletedDate ? state.lastCompletedDate : getTallyDate();
      localStorage.setItem(STORAGE_PREFIX + 'tally', JSON.stringify({
        count: state.completedTodayCount,
        date: tallyDate
      }));
      if (!skipCloudSync && window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
    } catch (e) {
      console.warn('Save failed', e);
      showToast('Could not save — check storage or try again');
    }
  }

  function detectCategory(text) {
    const t = (text || '').toLowerCase();
    const preset = state.categoryPreset || 'generic';
    if (preset === 'creative') {
      if (t.includes('misfit')) return 'misfit';
      if (t.includes('barclay') || t.includes('stop 2030') || t.includes('stop2030')) return 'stop2030barclay';
      if (t.includes('cycles')) return 'cycles';
      if (t.includes('life')) return 'life';
    } else {
      if (t.includes('work')) return 'work';
      if (t.includes('hobbi') || t.includes('hobby')) return 'hobbies';
      if (t.includes('life')) return 'life';
    }
    return null;
  }

  function extractDeadline(text) {
    const t = (text || '').toLowerCase();
    const now = new Date();
    const year = now.getFullYear();

    const monthDay = t.match(/(?:due\s+)?(?:by\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?/i);
    if (monthDay) {
      const m = MONTHS[monthDay[1].toLowerCase().slice(0,3)];
      const d = parseInt(monthDay[2], 10);
      const y = monthDay[3] ? parseInt(monthDay[3], 10) : year;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
    const slash = t.match(/(?:due\s+)?(?:by\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (slash) {
      const m = parseInt(slash[1], 10);
      const d = parseInt(slash[2], 10);
      const y = slash[3] ? (slash[3].length === 2 ? 2000 + parseInt(slash[3], 10) : parseInt(slash[3], 10)) : year;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }

    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const nextDay = t.match(/(?:due\s+)?(?:by\s+)?(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (nextDay) {
      const targetDay = dayNames.indexOf(nextDay[1].toLowerCase());
      const isThis = /this\s+/.test(t);
      let d = new Date(now);
      const currentDay = d.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0 && !isThis) diff += 7;
      else if (diff < 0 && isThis) diff += 7;
      else if (diff === 0 && isThis) diff = 0;
      else if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }

    const endOfMonth = t.match(/(?:due\s+)?(?:by\s+)?(?:the\s+)?(?:end\s+of\s+(?:the\s+)?month|eom)/i);
    if (endOfMonth) {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return d.toISOString().slice(0, 10);
    }

    const inWeeks = t.match(/(?:due\s+)?(?:by\s+)?(?:in\s+)?(\d+)\s+weeks?(?:\s+from\s+now)?/i);
    if (inWeeks) {
      const d = new Date(now);
      d.setDate(d.getDate() + parseInt(inWeeks[1], 10) * 7);
      return d.toISOString().slice(0, 10);
    }

    const inDays = t.match(/(?:due\s+)?(?:by\s+)?(?:in\s+)?(\d+)\s+days?(?:\s+from\s+now)?/i);
    if (inDays) {
      const d = new Date(now);
      d.setDate(d.getDate() + parseInt(inDays[1], 10));
      return d.toISOString().slice(0, 10);
    }

    if (/\b(?:due\s+)?(?:by\s+)?tomorrow\b/i.test(t)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }

    if (/\b(?:due\s+)?(?:by\s+)?next\s+week\b/i.test(t)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    }

    if (typeof window !== 'undefined' && window.chrono) {
      try {
        const parsed = window.chrono.parseDate(t);
        if (parsed && !isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      } catch (e) { /* fallback to null */ }
    }
    return null;
  }

  function extractPriority(text) {
    const t = (text || '').toLowerCase();
    if (/\b(critical|urgent|asap|as\s+ap|emergency|rush|top\s+priority)\b/.test(t)) return 'critical';
    if (/\b(high\s+priority|high\s+prio|important|must\s+do|must\s+be)\b/.test(t)) return 'high';
    if (/\b(low\s+priority|low\s+prio|whenever|nice\s+to\s+have|optional|backlog)\b/.test(t)) return 'low';
    if (/\b(medium|normal|regular)\b/.test(t)) return 'medium';
    return null;
  }

  function stripAutoExtractedFromText(text, category, deadline, priority) {
    let result = (text || '').trim();
    if (!result) return result;
    if (deadline) {
      result = result.replace(/(?:due\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:\s+\d{4})?/gi, '');
      result = result.replace(/(?:due\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?(?:the\s+)?end\s+of\s+(?:the\s+)?(?:next\s+)?month/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?eom\b/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?(?:next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?(?:in\s+)?\d+\s+(?:days?|weeks?)(?:\s+from\s+now)?/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?tomorrow\b/gi, '');
      result = result.replace(/(?:due\s+)?(?:by\s+)?next\s+week\b/gi, '');
    }
    if (category) {
      if (category === 'work') result = result.replace(/\bwork\b/gi, '');
      if (category === 'hobbies') result = result.replace(/\bhobbies?\b/gi, '');
      if (category === 'life') result = result.replace(/\blife\b/gi, '');
      if (category === 'misfit') result = result.replace(/\bmisfit\b/gi, '');
      if (category === 'stop2030barclay') result = result.replace(/\b(barclay|stop\s*2030|stop2030)\b/gi, '');
      if (category === 'cycles') result = result.replace(/\bcycles\b/gi, '');
    }
    if (priority === 'critical') {
      result = result.replace(/\b(critical|urgent|asap|as\s+ap|emergency|rush|top\s+priority)\b/gi, '');
    } else if (priority === 'high') {
      result = result.replace(/\b(high\s+priority|high\s+prio|important|must\s+do|must\s+be)\b/gi, '');
    } else if (priority === 'low') {
      result = result.replace(/\b(low\s+priority|low\s+prio|whenever|nice\s+to\s+have|optional|backlog)\b/gi, '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  function createItem(text, category, deadline, priority, recurrence, reminderAt, doingDate, pileId, friction, personId) {
    const cleanText = stripAutoExtractedFromText(text, category, deadline, priority) || text.trim();
    return {
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      text: cleanText || text.trim(),
      category: category || state.lastCategory,
      parkedAt: Date.now(),
      deadline: deadline || null,
      doingDate: doingDate || null,
      priority: priority || 'medium',
      recurrence: recurrence || null,
      reminderAt: reminderAt || null,
      archived: false,
      pileId: pileId != null ? pileId : null,
      friction: friction && ['quick', 'medium', 'deep'].includes(friction) ? friction : null,
      firstStep: null,
      personId: personId != null ? personId : null
    };
  }

  function getPiles() {
    return (state.piles || []).slice();
  }

  function getPileName(pileId) {
    if (!pileId) return null;
    const p = (state.piles || []).find(pi => pi.id === pileId);
    return p ? p.name : pileId;
  }

  const PEOPLE_GROUPS = [
    { id: 'family', label: 'Family' },
    { id: 'romantic', label: 'Romantic' },
    { id: 'close_friends', label: 'Close friends' },
    { id: 'friends', label: 'Friends' },
    { id: 'acquaintances', label: 'Acquaintances' },
    { id: 'work', label: 'Work' }
  ];

  function getPeople() {
    return (state.people || []).slice();
  }

  function getPerson(id) {
    if (!id) return null;
    return (state.people || []).find(p => p.id === id) || null;
  }

  function getPersonName(id) {
    const p = getPerson(id);
    return p ? p.name : (id || null);
  }

  function addPerson(attrs) {
    var name = (attrs && attrs.name != null) ? String(attrs.name).trim() : '';
    if (!name) return null;
    var group = (attrs && attrs.group && PEOPLE_GROUPS.some(function(g) { return g.id === attrs.group; })) ? attrs.group : 'friends';
    var id = 'person_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var person = {
      id: id,
      name: name,
      group: group,
      lastConnected: attrs && attrs.lastConnected != null ? attrs.lastConnected : null,
      reconnectRule: attrs && attrs.reconnectRule && { interval: attrs.reconnectRule.interval } ? attrs.reconnectRule : null,
      notes: (attrs && attrs.notes != null) ? String(attrs.notes) : null
    };
    state.people = (state.people || []).concat(person);
    saveState();
    return id;
  }

  function updatePerson(id, updates) {
    var p = getPerson(id);
    if (!p) return;
    if (updates && updates.name != null) {
      var n = String(updates.name).trim();
      if (n) p.name = n;
    }
    if (updates && updates.group != null && PEOPLE_GROUPS.some(function(g) { return g.id === updates.group; })) p.group = updates.group;
    if (updates && updates.lastConnected !== undefined) p.lastConnected = updates.lastConnected;
    if (updates && updates.reconnectRule !== undefined) p.reconnectRule = updates.reconnectRule;
    if (updates && updates.notes !== undefined) p.notes = updates.notes;
    saveState();
  }

  function deletePerson(id) {
    state.items.forEach(function(item) {
      if (item.personId === id) item.personId = null;
    });
    state.people = (state.people || []).filter(p => p.id !== id);
    saveState();
  }

  function getReconnectIntervalMs(interval) {
    if (interval === '1w') return 7 * 24 * 60 * 60 * 1000;
    if (interval === '2w') return 14 * 24 * 60 * 60 * 1000;
    if (interval === '1m') return 30 * 24 * 60 * 60 * 1000;
    if (interval === '3m') return 90 * 24 * 60 * 60 * 1000;
    return 0;
  }

  function isOverdueToReconnect(person) {
    if (!person || person.lastConnected == null || !person.reconnectRule || !person.reconnectRule.interval) return false;
    var lc = person.lastConnected;
    if (typeof lc !== 'number' || isNaN(lc) || lc <= 0) return false;
    var dueMs = lc + getReconnectIntervalMs(person.reconnectRule.interval);
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var dueDate = new Date(dueMs);
    var dueStr = dueDate.getFullYear() + '-' + String(dueDate.getMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getDate()).padStart(2, '0');
    return todayStr >= dueStr;
  }

  function addPile(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const id = 'pile_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const list = state.piles || [];
    list.push({ id, name: trimmed });
    state.piles = list;
    saveState();
    return id;
  }

  function updatePile(id, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const p = (state.piles || []).find(pi => pi.id === id);
    if (p) {
      p.name = trimmed;
      saveState();
    }
  }

  function deletePile(id) {
    const list = (state.piles || []).filter(pi => pi.id !== id);
    const count = (state.items || []).filter(i => i.pileId === id).length;
    state.items.forEach(i => { if (i.pileId === id) i.pileId = null; });
    state.piles = list;
    saveState();
    return count;
  }

  function formatDuration(ms) {
    const days = Math.floor(ms / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1d';
    if (days < 7) return days + 'd';
    if (days < 30) return Math.floor(days / 7) + 'w';
    if (days < 365) return Math.floor(days / 30) + 'mo';
    return Math.floor(days / 365) + 'y';
  }

  function parseLocalDate(iso) {
    if (!iso || typeof iso !== 'string') return null;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    return new Date(y, mo - 1, d);
  }

  function getSortReferenceDate(item) {
    // Doing-by date is the execution target, so it outranks due date for sorting.
    return parseLocalDate(item.doingDate) || parseLocalDate(item.deadline);
  }

  function formatDeadline(iso) {
    if (!iso) return null;
    const d = parseLocalDate(iso);
    if (!d) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = (d - today) / 86400000;
    if (diff < 0) return { text: 'OVERDUE (' + Math.abs(Math.floor(diff)) + 'd)', overdue: true };
    if (diff === 0) return { text: 'Today', overdue: false };
    if (diff <= 7) return { text: 'In ' + Math.floor(diff) + 'd', overdue: false };
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
  }

  const FRICTION_ORDER = { quick: 0, medium: 1, deep: 2 };

  function getTodayLocalYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function getHabits() {
    return (state.habits || []).slice();
  }

  function getCompletionsForDate(date) {
    return (state.habitCompletions || []).filter(c => c.date === date);
  }

  function recordCompletion(habitId, date, source, taskId) {
    if (!state.habitCompletions) state.habitCompletions = [];
    state.habitCompletions.push({ habitId, date, source, taskId: taskId || undefined });
  }

  function removeCompletionsForTask(taskId, date) {
    if (!state.habitCompletions) return;
    state.habitCompletions = state.habitCompletions.filter(c => !(c.date === date && c.taskId === taskId));
  }

  function isHabitDoneOnDate(habitId, date) {
    return (state.habitCompletions || []).some(c => c.habitId === habitId && c.date === date);
  }

  function computeWeightedPct(date) {
    const habits = getHabits();
    if (habits.length === 0) return 0;
    const totalWeight = habits.reduce((s, h) => s + (h.weight || 1), 0);
    const doneWeight = habits.filter(h => isHabitDoneOnDate(h.id, date)).reduce((s, h) => s + (h.weight || 1), 0);
    return totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0;
  }

  function compute7DayRolling() {
    const today = getTodayLocalYYYYMMDD();
    let sum = 0;
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      sum += computeWeightedPct(dateStr);
      count++;
    }
    return count ? Math.round(sum / count) : 0;
  }

  function getZoneLabel(pct) {
    if (pct >= 70 && pct <= 85) return 'Strong';
    if (pct >= 50 && pct < 70) return 'Unstable but recoverable';
    if (pct < 50) return 'Reduce volume';
    if (pct > 85) return 'Check minimums';
    return '—';
  }

  function addHabit(name, weight, linkedCategoryId, linkedPileId) {
    const id = 'habit_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    (state.habits || []).push({
      id,
      name: (name || '').trim() || 'Habit',
      weight: Math.max(1, Math.min(5, parseInt(weight, 10) || 3)),
      linkedCategoryId: linkedCategoryId || null,
      linkedPileId: linkedPileId || null
    });
    saveState();
    return id;
  }

  function updateHabit(id, name, weight, linkedCategoryId, linkedPileId) {
    const h = (state.habits || []).find(x => x.id === id);
    if (!h) return;
    if (name != null) h.name = (name || '').trim() || h.name;
    if (weight != null) h.weight = Math.max(1, Math.min(5, parseInt(weight, 10) || 3));
    if (linkedCategoryId !== undefined) h.linkedCategoryId = linkedCategoryId || null;
    if (linkedPileId !== undefined) h.linkedPileId = linkedPileId || null;
    saveState();
  }

  function deleteHabit(id) {
    state.habits = (state.habits || []).filter(h => h.id !== id);
    state.habitCompletions = (state.habitCompletions || []).filter(c => c.habitId !== id);
    saveState();
  }

  function toggleHabitManual(habitId, date) {
    if (isHabitDoneOnDate(habitId, date)) {
      const list = state.habitCompletions || [];
      const idx = list.findIndex(c => c.habitId === habitId && c.date === date && c.source === 'manual');
      if (idx !== -1) {
        list.splice(idx, 1);
        state.habitCompletions = list;
      }
    } else {
      recordCompletion(habitId, date, 'manual');
    }
    saveState();
  }

  function getTimeBand(item) {
    const d = getSortReferenceDate(item);
    if (!d || isNaN(d.getTime())) return 3;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 8);
    if (d < now) return 0;
    if (d < todayEnd) return 1;
    if (d < weekEnd) return 2;
    return 4;
  }

  function sortByTimeBandsAndFriction(items) {
    return [...items].sort((a, b) => {
      const bandA = getTimeBand(a);
      const bandB = getTimeBand(b);
      if (bandA !== bandB) return bandA - bandB;
      const priorityA = PRIORITY_ORDER[a.priority] ?? 2;
      const priorityB = PRIORITY_ORDER[b.priority] ?? 2;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const frictionA = FRICTION_ORDER[a.friction] ?? 1;
      const frictionB = FRICTION_ORDER[b.friction] ?? 1;
      if (frictionA !== frictionB) return frictionA - frictionB;
      const dateA = getSortReferenceDate(a);
      const dateB = getSortReferenceDate(b);
      if (dateA && dateB) return dateA - dateB;
      return (a.parkedAt || 0) - (b.parkedAt || 0);
    });
  }

  function sortItems(items) {
    return sortByTimeBandsAndFriction(items);
  }

  function archivePastDoingDatesIfNeeded() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let changed = false;
    state.items.forEach(i => {
      const doing = parseLocalDate(i.doingDate);
      if (!i.archived && doing && doing < today) {
        i.archived = true;
        i.archivedAt = i.archivedAt || Date.now();
        changed = true;
      }
    });
    if (changed) saveState();
    return changed;
  }

  function getActiveItems() {
    return state.items.filter(i => !i.archived);
  }

  function getItemsByCategory(cat) {
    let items = getActiveItems().filter(i => i.category === cat);
    const q = (state.searchQuery || '').trim().toLowerCase();
    if (q) items = items.filter(i => (i.text || '').toLowerCase().includes(q));
    return items;
  }

  function getCategoryLabel(catId) {
    if (state.customLabels[catId]) return state.customLabels[catId];
    const cat = getCategories().find(c => c.id === catId);
    return cat ? cat.label : catId;
  }

  function getColumnColor(catId) {
    if (catId === '__button' || catId === '__text') return null;
    return state.columnColors[catId] || DEFAULT_COLUMN_COLORS[catId] || '#6b7280';
  }

  function getActiveColumnColors() {
    const out = {};
    Object.keys(state.columnColors || {}).forEach(k => {
      if (k !== '__button' && k !== '__text') out[k] = state.columnColors[k];
    });
    return out;
  }

  function applyThemeColors() {
    const root = document.documentElement;
    if (state.buttonColor) {
      root.style.setProperty('--accent-button', state.buttonColor);
      root.style.setProperty('--header-accent', state.buttonColor);
    } else {
      root.style.removeProperty('--accent-button');
      root.style.removeProperty('--header-accent');
    }
    if (state.textColor) root.style.setProperty('--accent-text', state.textColor);
    else root.style.removeProperty('--accent-text');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', state.buttonColor || '#e07a5f');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

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

    const isPilesView = state.viewMode === 'piles';
    const cats = state.drillDownCategory ? [state.drillDownCategory] : getOrderedCategoryIds();
    container.classList.toggle('single-column', !!state.drillDownCategory);
    container.classList.toggle('piles-view', isPilesView);

    if (isPilesView) {
      const piles = getPiles();
      const pileColumns = piles.map(p => ({ id: p.id, label: p.name, pileId: p.id }));
      pileColumns.push({ id: '__uncategorized', label: 'Uncategorized', pileId: null });
      const canReorder = false;
      container.innerHTML = pileColumns.map(col => {
        const items = getActiveItems().filter(i => (i.pileId || null) === (col.pileId || null));
        const q = (state.searchQuery || '').trim().toLowerCase();
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
      const canReorder = !state.drillDownCategory && cats.length > 1;
      container.innerHTML = cats.map(catId => {
        const items = sortItems(getItemsByCategory(catId));
        const label = getCategoryLabel(catId);
        const color = getColumnColor(catId);
        const noteContent = (state.columnNotes && state.columnNotes[catId]) || '';
        const noteOpen = state.openColumnNoteId === catId;

        return `
          <div class="column column-accent" data-category="${catId}" style="--column-accent: ${color}">
            <div class="column-header ${canReorder ? 'column-header-draggable' : ''}" data-category="${catId}" ${canReorder ? 'draggable="true"' : ''} role="${canReorder ? 'button' : 'none'}" title="${canReorder ? 'Drag to reorder columns' : ''}">
              ${escapeHtml(label)} <span class="count">(${items.length})</span>
              <button type="button" class="column-note-btn ${noteOpen ? 'column-note-btn-close' : ''}" data-category="${catId}" title="${noteOpen ? 'Close note' : 'Column note'}" aria-label="${noteOpen ? 'Close note' : 'Open note'}">${noteOpen ? '×' : (noteContent.length ? '📝' : '✎')}</button>
            </div>
            ${noteOpen ? `
              <div class="column-note-panel column-note-full open" data-category="${catId}">
                <div class="column-note-textarea-wrap">
                  <textarea class="column-note-textarea" data-category="${catId}" placeholder="Notes for this area..." rows="3">${escapeHtml(noteContent)}</textarea>
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
          state.openColumnNoteId = state.openColumnNoteId === catId ? null : catId;
          renderColumns();
        });
      });
      container.querySelectorAll('.column-note-textarea').forEach(ta => {
        ta.addEventListener('input', () => {
          const catId = ta.dataset.category;
          if (state.columnNoteSaveTimeouts[catId]) clearTimeout(state.columnNoteSaveTimeouts[catId]);
          state.columnNoteSaveTimeouts[catId] = setTimeout(() => {
            if (!state.columnNotes) state.columnNotes = {};
            state.columnNotes[catId] = ta.value;
            delete state.columnNoteSaveTimeouts[catId];
            saveState();
            if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
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
            showToast('Select note text first');
            return;
          }
          const raw = ta.value.slice(start, end);
          const selected = raw.trim();
          if (!selected) {
            showToast('Select note text first');
            return;
          }
          const item = createItem(selected, catId, null, 'medium', null, null, null, null, null, null);
          state.items.push(item);
          state.lastCategory = catId;

          const before = ta.value.slice(0, start);
          const after = ta.value.slice(end);
          const nextValue = (before + after).replace(/\n{3,}/g, '\n\n').trim();
          ta.value = nextValue;
          if (!state.columnNotes) state.columnNotes = {};
          state.columnNotes[catId] = nextValue;

          saveState();
          if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
          renderColumns();
          showToast('Task created from note');
          const popover = container.querySelector('.column-note-turn-popover[data-category="' + catId + '"]');
          if (popover) popover.style.display = 'none';
        });
      });
    }

    let columnDragHappened = false;
    container.querySelectorAll('.column-header').forEach(el => {
      el.addEventListener('click', () => {
        if (columnDragHappened) { columnDragHappened = false; return; }
        if (state.drillDownCategory) {
          state.drillDownCategory = null;
          document.getElementById('back-btn').style.display = 'none';
        } else {
          state.drillDownCategory = el.dataset.category;
          document.getElementById('back-btn').style.display = 'inline-block';
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
        const order = state.columnOrder && state.columnOrder.length ? [...state.columnOrder] : getOrderedCategoryIds();
        const baseIds = getCategories().map(c => c.id);
        const fromIdx = order.indexOf(dragCat);
        const toIdx = order.indexOf(dropCat);
        if (fromIdx === -1 || toIdx === -1) return;
        order.splice(fromIdx, 1);
        order.splice(order.indexOf(dropCat), 0, dragCat);
        state.columnOrder = order.filter(id => baseIds.includes(id));
        saveState();
        renderColumns();
      });
    });

    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.task-actions') || e.target.closest('.task-meta-edit') || e.target.closest('.task-drag-handle')) return;
        const id = card.dataset.id;
        state.selectedIds.has(id) ? state.selectedIds.delete(id) : state.selectedIds.add(id);
        card.classList.toggle('selected', state.selectedIds.has(id));
        updateAddToSuggestionsBtn();
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
        openEditModal(btn.dataset.id);
      });
    });
    container.querySelectorAll('.btn-drop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteItem(btn.dataset.id, true);
      });
    });
    container.querySelectorAll('.btn-done-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        markDone(btn.dataset.id);
      });
    });

    container.querySelectorAll('.task-meta-clickable').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        state.expandingMetaCardId = el.dataset.id;
        renderColumns();
      });
    });
    container.querySelectorAll('.meta-priority').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.priority = e.target.value;
          saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-doing-date').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.doingDate = e.target.value || null;
          saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-deadline').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.deadline = e.target.value || null;
          saveState();
          renderColumns();
        }
      });
    });
    container.querySelectorAll('.meta-done-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.expandingMetaCardId = null;
        renderColumns();
      });
    });

    container.querySelectorAll('.column-add-btn, .column-add-hint').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.viewMode === 'piles') {
          const pileId = el.dataset.pileId != null ? el.dataset.pileId : null;
          openAddModal(state.lastCategory || getOrderedCategoryIds()[0], pileId);
        } else {
          const cat = el.dataset.category;
          if (cat) openAddModal(cat);
        }
      });
    });

    const viewColumnsBtn = document.getElementById('view-columns-btn');
    const viewPilesBtn = document.getElementById('view-piles-btn');
    if (viewColumnsBtn) {
      viewColumnsBtn.classList.toggle('active', state.viewMode === 'columns');
      viewColumnsBtn.setAttribute('aria-selected', state.viewMode === 'columns' ? 'true' : 'false');
    }
    if (viewPilesBtn) {
      viewPilesBtn.classList.toggle('active', state.viewMode === 'piles');
      viewPilesBtn.setAttribute('aria-selected', state.viewMode === 'piles' ? 'true' : 'false');
    }
  }

  function formatDoingDate(iso) {
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

  function renderTaskCard(item, opts) {
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
    const lifeAreaTag = showLifeAreaAsTag ? getCategoryLabel(item.category) : null;
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

  function renderTalkAbout() {
    const list = document.getElementById('talk-about-list');
    if (!list) return;
    const items = state.talkAboutItems;
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
    state.addFromTalkItem = { id: talkItem.id, text: talkItem.text };
    const textInput = document.getElementById('add-from-talk-text-input');
    if (textInput) textInput.value = talkItem.text || '';
    const catSel = document.getElementById('add-from-talk-category');
    if (catSel) {
      catSel.innerHTML = getCategories().map(c =>
        `<option value="${c.id}">${escapeHtml(getCategoryLabel(c.id))}</option>`
      ).join('');
      catSel.value = state.lastCategory || 'life';
    }
    updatePileSelectOptions('add-from-talk-pile', '');
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
    state.addFromTalkItem = null;
    const modal = document.getElementById('add-from-talk-modal');
    if (modal) modal.style.display = 'none';
  }

  function submitAddFromTalk() {
    if (!state.addFromTalkItem) return;
    const textInput = document.getElementById('add-from-talk-text-input');
    const text = (textInput && textInput.value ? textInput.value.trim() : state.addFromTalkItem.text || '').trim();
    if (!text) {
      showToast('Task name cannot be empty');
      return;
    }
    const category = document.getElementById('add-from-talk-category')?.value || state.lastCategory;
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
    state.items.push(item);
    state.lastCategory = category;
    saveState();
    closeAddFromTalkModal();
    renderColumns();
    showToast('Added to parking lot');
  }

  async function resolveTalkAbout(id) {
    if (!window.talkAbout) return;
    const { error } = await window.talkAbout.resolveTalkAbout(id);
    if (error) showToast('Failed to resolve');
    else state.talkAboutItems = state.talkAboutItems.filter(i => i.id !== id);
    renderTalkAbout();
  }

  function moveTodayUp(id) {
    const idx = state.todaySuggestionIds.indexOf(id);
    if (idx <= 0) return;
    state.todaySuggestionIds.splice(idx, 1);
    state.todaySuggestionIds.splice(idx - 1, 0, id);
    saveState();
    renderTodayList();
    renderFocusList();
  }

  function moveTodayDown(id) {
    const idx = state.todaySuggestionIds.indexOf(id);
    if (idx < 0 || idx >= state.todaySuggestionIds.length - 1) return;
    state.todaySuggestionIds.splice(idx, 1);
    state.todaySuggestionIds.splice(idx + 1, 0, id);
    saveState();
    renderTodayList();
    renderFocusList();
  }

  function renderTodayList() {
    const list = document.getElementById('today-list');
    if (!list) return;
    const ids = state.todaySuggestionIds;
    const items = ids.map(id => state.items.find(i => i.id === id)).filter(Boolean);

    list.innerHTML = items.map((item, idx) => {
      const accent = getColumnColor(item.category);
      const canUp = idx > 0;
      const canDown = idx < items.length - 1;
      return `<div class="today-item today-item-accent" data-id="${item.id}" style="--today-accent: ${accent}">
        <div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!canUp ? 'disabled' : ''} title="Move up">↑</button>
          <button type="button" class="btn-order" data-action="down" ${!canDown ? 'disabled' : ''} title="Move down">↓</button>
        </div>
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done btn-done-check" title="Done">✓</button>
        <button class="btn-remove" title="Remove from suggestions">Remove</button>
      </div>`;
    }).join('') || '<div class="empty-state">Select tasks below and click Add to Today, or drag tasks here</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.today-item').dataset.id;
        if (e.target.dataset.action === 'up') moveTodayUp(id);
        else moveTodayDown(id);
      });
    });
    renderConsistencySmall();
  }

  function renderConsistencySmall() {
    const block = document.getElementById('consistency-small');
    const metricsEl = block?.querySelector('.consistency-small-metrics');
    const habitsEl = document.getElementById('consistency-small-habits');
    if (!block) return;
    const habits = getHabits();
    if (habits.length === 0) {
      block.style.display = 'none';
      return;
    }
    block.style.display = 'block';
    const todayStr = getTodayLocalYYYYMMDD();
    const pct = computeWeightedPct(todayStr);
    const rolling = compute7DayRolling();
    const zone = getZoneLabel(pct);
    if (metricsEl) metricsEl.textContent = 'Weighted: ' + pct + '% · 7-day: ' + rolling + '% · ' + zone;
    if (habitsEl) {
      habitsEl.innerHTML = habits.map(h => {
        const done = isHabitDoneOnDate(h.id, todayStr);
        return `<label class="consistency-small-habit"><input type="checkbox" data-habit-id="${h.id}" ${done ? 'checked' : ''}> ${escapeHtml(h.name)}</label>`;
      }).join('');
      habitsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          toggleHabitManual(cb.dataset.habitId, todayStr);
          renderConsistencySmall();
          if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
        });
      });
    }
  }

  function renderFocusList() {
    const list = document.getElementById('focus-list');
    if (!list) return;
    const items = state.todaySuggestionIds
      .map(id => state.items.find(i => i.id === id))
      .filter(Boolean);

    list.innerHTML = items.map((item, idx) => {
      const accent = getColumnColor(item.category);
      const canUp = idx > 0;
      const canDown = idx < items.length - 1;
      return `<div class="today-item today-item-accent task-card" data-id="${item.id}" style="--today-accent: ${accent}">
        <div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!canUp ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-order" data-action="down" ${!canDown ? 'disabled' : ''}>↓</button>
        </div>
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done btn-done-check" title="Done">✓</button>
        <button class="btn-remove">Remove from suggestions</button>
      </div>`;
    }).join('') || '<div class="empty-state">Add items from the overview to get started</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.today-item').dataset.id;
        if (e.target.dataset.action === 'up') moveTodayUp(id);
        else moveTodayDown(id);
      });
    });
  }

  function updateTally() {
    state.completedTodayCount = countCompletedInTallyDay();
    saveState(true);
    const str = 'Completed today: ' + state.completedTodayCount;
    const tallyEl = document.getElementById('completed-tally');
    if (tallyEl) tallyEl.textContent = str;
    const focusTally = document.getElementById('focus-tally');
    if (focusTally) focusTally.textContent = str;
  }

  function updateAddToSuggestionsBtn() {
    const btn = document.getElementById('add-to-suggestions-btn');
    const float = document.getElementById('add-to-suggestions-float');
    if (!btn) return;
    const count = state.selectedIds.size;
    const remaining = 5 - state.todaySuggestionIds.length;
    const show = count > 0 && remaining > 0;
    if (float) float.classList.toggle('visible', show);
    btn.disabled = !show;
    btn.textContent = show ? `Add ${Math.min(count, remaining)} to Today` : 'Add to Today';
  }

  function addToSuggestions() {
    const remaining = 5 - state.todaySuggestionIds.length;
    const toAdd = [...state.selectedIds].slice(0, remaining);
    toAdd.forEach(id => {
      state.todaySuggestionIds.push(id);
      state.selectedIds.delete(id);
    });
    saveState();
    renderTodayList();
    renderColumns();
    updateAddToSuggestionsBtn();
  }

  function clearAddToSuggestionsSelection() {
    state.selectedIds.clear();
    updateAddToSuggestionsBtn();
    renderColumns();
  }

  function removeFromSuggestions(id) {
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();
  }

  function respawnRecurring(item) {
    const now = new Date();
    let nextDeadline = null;
    if (item.recurrence === 'daily') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      nextDeadline = d.toISOString().slice(0, 10);
    } else if (item.recurrence === 'weekly') {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      nextDeadline = d.toISOString().slice(0, 10);
    } else if (item.recurrence === 'monthly') {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      nextDeadline = d.toISOString().slice(0, 10);
    }
    const newItem = createItem(item.text, item.category, nextDeadline, item.priority, item.recurrence, null, item.doingDate, item.pileId, item.friction, item.personId || null);
    state.items.push(newItem);
    return newItem.id;
  }

  function suggestNext(completedItem) {
    const active = getActiveItems();
    const pileId = completedItem && (completedItem.pileId != null) ? completedItem.pileId : null;
    let candidates = pileId != null ? active.filter(i => (i.pileId || null) === pileId) : active;
    candidates = sortByTimeBandsAndFriction(candidates);
    if (candidates.length === 0 && pileId != null) {
      candidates = sortByTimeBandsAndFriction(active);
    }
    if (candidates.length === 0) return null;
    const top = candidates[0];
    const lifeArea = completedItem && completedItem.category;
    if (!lifeArea) return top;
    const topBand = getTimeBand(top);
    const topPriority = top.priority || 'medium';
    const sameTier = candidates.filter(i => getTimeBand(i) === topBand && (i.priority || 'medium') === topPriority);
    const sameLifeArea = sameTier.find(i => i.category === lifeArea);
    return sameLifeArea || top;
  }

  function showSuggestNextStrip(nextTask, completedItem) {
    const strip = document.getElementById('suggest-next-strip');
    if (!strip || !nextTask) return;
    const pileName = completedItem && completedItem.pileId ? getPileName(completedItem.pileId) : null;
    const label = pileName ? 'Next in ' + pileName + ': ' + nextTask.text : 'Next: ' + nextTask.text;
    const firstStepHtml = nextTask.firstStep ? `<p class="suggest-next-first-step">Start by: ${escapeHtml(nextTask.firstStep)}</p>` : '';
    strip.innerHTML = `
      <div class="suggest-next-content">
        <p class="suggest-next-label">${escapeHtml(label)}</p>
        ${firstStepHtml}
        <div class="suggest-next-actions">
          <button type="button" class="btn-primary btn-sm suggest-next-add-today" data-id="${nextTask.id}">Add to Today</button>
          <button type="button" class="btn-secondary btn-sm suggest-next-dismiss">Go</button>
        </div>
      </div>
    `;
    strip.classList.add('visible');
    strip.querySelector('.suggest-next-add-today')?.addEventListener('click', () => {
      if (!state.todaySuggestionIds.includes(nextTask.id) && state.todaySuggestionIds.length < 5) {
        state.todaySuggestionIds.push(nextTask.id);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
      }
      hideSuggestNextStrip();
    });
    strip.querySelector('.suggest-next-dismiss')?.addEventListener('click', hideSuggestNextStrip);
    if (state.suggestNextStripTimeout) clearTimeout(state.suggestNextStripTimeout);
    state.suggestNextStripTimeout = setTimeout(hideSuggestNextStrip, 8000);
  }

  function hideSuggestNextStrip() {
    const strip = document.getElementById('suggest-next-strip');
    if (strip) strip.classList.remove('visible');
    if (state.suggestNextStripTimeout) {
      clearTimeout(state.suggestNextStripTimeout);
      state.suggestNextStripTimeout = null;
    }
  }

  function markDone(id) {
    if (state.processingIds.has(id)) return;
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.processingIds.add(id);
    const wasInSuggestions = state.todaySuggestionIds.includes(id);
    const prevArchived = item.archived;
    const prevArchivedAt = item.archivedAt;
    const prevCompletedAt = item.completedAt;
    item.archived = true;
    item.archivedAt = item.archivedAt || Date.now();
    item.completedAt = Date.now();
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    const respawnedId = item.recurrence ? respawnRecurring(item) : null;
    const todayStr = getTodayLocalYYYYMMDD();
    (state.habits || []).forEach(h => {
      if (h.linkedCategoryId === item.category || h.linkedPileId === item.pileId) recordCompletion(h.id, todayStr, 'task', item.id);
    });
    saveState();
    updateTally();
    renderTodayList();
    renderFocusList();
    renderColumns();

    state.processingIds.delete(id);
    showToast('Done', () => {
      item.archived = prevArchived;
      item.archivedAt = prevArchivedAt;
      item.completedAt = prevCompletedAt;
      if (wasInSuggestions) state.todaySuggestionIds.push(id);
      if (respawnedId) state.items = state.items.filter(i => i.id !== respawnedId);
      removeCompletionsForTask(id, todayStr);
      saveState();
      updateTally();
      renderTodayList();
      renderFocusList();
      renderColumns();
    });
    if (state.undoDoneTimeout) clearTimeout(state.undoDoneTimeout);
    state.undoDoneTimeout = setTimeout(() => { /* toast hides */ }, 5000);

    if (state.showSuggestNext !== false) {
      const nextTask = suggestNext(item);
      if (nextTask) showSuggestNextStrip(nextTask, item);
    }
    renderConsistencySmall();
  }

  function deleteItem(id, showUndo = true) {
    if (state.processingIds.has(id)) return;
    const idx = state.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    state.processingIds.add(id);
    const item = state.items[idx];
    state.items.splice(idx, 1);
    state.todaySuggestionIds = state.todaySuggestionIds.filter(x => x !== id);
    state.selectedIds.delete(id);
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();

    state.processingIds.delete(id);
    if (showUndo) {
      state.undoItem = item;
      showToast('Removed', () => {
        state.items.push(state.undoItem);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
      });
      if (state.undoTimeout) clearTimeout(state.undoTimeout);
      state.undoTimeout = setTimeout(() => { state.undoItem = null; }, 5000);
    }
  }

  function showToast(message, onUndo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = message + (onUndo ? '<span class="undo-btn">Undo</span>' : '');
    toast.classList.add('visible');
    if (onUndo) {
      const undoBtn = toast.querySelector('.undo-btn');
      if (undoBtn) undoBtn.onclick = () => {
        onUndo();
        toast.classList.remove('visible');
      };
    }
    setTimeout(() => toast.classList.remove('visible'), 5000);
  }

  function updateCategorySelectOptions() {
    const sel = document.getElementById('category-select');
    if (!sel) return;
    sel.innerHTML = getCategories().map(c =>
      `<option value="${c.id}">${escapeHtml(getCategoryLabel(c.id))}</option>`
    ).join('');
  }

  function updatePileSelectOptions(selectIdOrEl, selectedPileId) {
    const el = typeof selectIdOrEl === 'string' ? document.getElementById(selectIdOrEl) : selectIdOrEl;
    if (!el) return;
    const piles = getPiles();
    el.innerHTML = '<option value="">None</option>' + piles.map(p =>
      `<option value="${p.id}" ${p.id === selectedPileId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('');
  }

  function updatePersonSelectOptions(selectIdOrEl, selectedPersonId) {
    const el = typeof selectIdOrEl === 'string' ? document.getElementById(selectIdOrEl) : selectIdOrEl;
    if (!el) return;
    const people = getPeople().slice().sort(function(a, b) {
      var ai = PEOPLE_GROUPS.findIndex(function(g) { return g.id === a.group; });
      var bi = PEOPLE_GROUPS.findIndex(function(g) { return g.id === b.group; });
      if (ai !== bi) return ai - bi;
      return (a.name || '').localeCompare(b.name || '');
    });
    el.innerHTML = '<option value="">None</option>' + people.map(function(p) {
      return '<option value="' + p.id + '"' + (p.id === selectedPersonId ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
    }).join('');
  }

  function openAddModal(presetCategory, presetPileId) {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'flex';
    updateCategorySelectOptions();
    updatePileSelectOptions('pile-select', presetPileId != null ? presetPileId : '');
    updatePersonSelectOptions('person-select', '');
    const tabSingle = document.getElementById('tab-single');
    const tabQuick = document.getElementById('tab-quick');
    const tabVoice = document.getElementById('tab-voice');
    const singleAdd = document.getElementById('single-add');
    const quickAdd = document.getElementById('quick-add');
    const voiceAdd = document.getElementById('voice-add');
    if (tabSingle) tabSingle.classList.add('active');
    if (tabQuick) tabQuick.classList.remove('active');
    if (tabVoice) tabVoice.classList.remove('active');
    if (singleAdd) singleAdd.style.display = 'block';
    if (quickAdd) quickAdd.style.display = 'none';
    if (voiceAdd) voiceAdd.style.display = 'none';
    const transcriptEl = document.getElementById('voice-transcript');
    if (transcriptEl) transcriptEl.textContent = '';
    const submitVoice = document.getElementById('submit-voice');
    if (submitVoice) submitVoice.disabled = true;
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.value = '';
      taskInput.focus();
    }
    const quickInput = document.getElementById('quick-input');
    if (quickInput) quickInput.value = '';
    const deadlineInput = document.getElementById('deadline-input');
    if (deadlineInput) deadlineInput.value = '';
    const doingDateInput = document.getElementById('doing-date-input');
    if (doingDateInput) doingDateInput.value = '';
    const recurrenceSelect = document.getElementById('recurrence-select');
    if (recurrenceSelect) recurrenceSelect.value = '';
    const prioritySelect = document.getElementById('priority-select');
    if (prioritySelect) prioritySelect.value = 'medium';
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) categorySelect.value = presetCategory || state.lastCategory;
    if (presetCategory) state.lastCategory = presetCategory;
    if (presetPileId == null) updatePileSelectOptions('pile-select', '');
    const frictionSelect = document.getElementById('friction-select');
    if (frictionSelect) frictionSelect.value = '';
    const firstStepInput = document.getElementById('first-step-input');
    if (firstStepInput) firstStepInput.value = '';
  }

  function closeAddModal() {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'none';
  }

  function addQuick() {
    const submitBtn = document.getElementById('submit-quick');
    if (submitBtn?.disabled) return;
    const el = document.getElementById('quick-input');
    const lines = (el && el.value) ? el.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
    if (!lines.length) return;
    if (submitBtn) submitBtn.disabled = true;
    lines.forEach(line => {
      const cat = detectCategory(line) || state.lastCategory;
      state.lastCategory = cat;
      const deadline = extractDeadline(line);
      const priority = extractPriority(line) || 'medium';
      const item = createItem(line, cat, deadline, priority, null, null, null, null, null, null);
      state.items.push(item);
    });
    saveState();
    closeAddModal();
    renderColumns();
    showToast('Added ' + lines.length + ' items');
    if (submitBtn) submitBtn.disabled = false;
  }

  function addVoiceMultiple() {
    const submitBtn = document.getElementById('submit-voice');
    if (submitBtn?.disabled) return;
    const transcriptEl = document.getElementById('voice-transcript');
    let transcript = (transcriptEl && transcriptEl.textContent) ? transcriptEl.textContent.trim() : '';
    transcript = transcript.replace(/\s+comma\s+/gi, ',');
    const lines = transcript.split(/,\s*|\s+next\s+/i).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    if (submitBtn) submitBtn.disabled = true;
    lines.forEach(line => {
      const cat = detectCategory(line) || state.lastCategory;
      state.lastCategory = cat;
      const deadline = extractDeadline(line);
      const priority = extractPriority(line) || 'medium';
      const item = createItem(line, cat, deadline, priority, null, null, null, null, null, null);
      state.items.push(item);
    });
    saveState();
    if (transcriptEl) transcriptEl.textContent = '';
    closeAddModal();
    renderColumns();
    showToast('Added ' + lines.length + ' items');
    if (submitBtn) submitBtn.disabled = false;
  }

  function initVoiceMulti() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById('voice-multi-btn');
    const transcriptEl = document.getElementById('voice-transcript');
    const submitBtn = document.getElementById('submit-voice');
    if (!SpeechRecognition || !btn) {
      const tabVoice = document.getElementById('tab-voice');
      if (tabVoice) tabVoice.style.display = 'none';
      return;
    }
    let recognition = null;
    btn.addEventListener('click', () => {
      if (recognition) {
        recognition.stop();
        return;
      }
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            const t = (transcriptEl.textContent || '') + (transcriptEl.textContent ? ' ' : '') + e.results[i][0].transcript;
            transcriptEl.textContent = t.trim();
          }
        }
        if (submitBtn) submitBtn.disabled = !(transcriptEl.textContent || '').trim();
      };
      recognition.onend = () => { recognition = null; btn.textContent = 'Start speaking'; };
      recognition.onerror = () => { recognition = null; btn.textContent = 'Start speaking'; };
      recognition.start();
      btn.textContent = 'Stop';
    });
    if (submitBtn) submitBtn.addEventListener('click', addVoiceMultiple);
  }

  function ensureSettingsAccordion() {
    const modalBody = document.querySelector('#settings-modal .modal-body');
    if (!modalBody || modalBody.dataset.accordionized === 'true') return;
    const saveBtn = document.getElementById('save-settings');
    if (!saveBtn) return;

    function collectRange(startNode, endNode) {
      if (!startNode || !endNode) return [];
      const nodes = [];
      let n = startNode;
      while (n) {
        const next = n.nextElementSibling;
        nodes.push(n);
        if (n === endNode) break;
        n = next;
      }
      return nodes;
    }

    function createSection(title, open, nodes) {
      if (!nodes || !nodes.length) return;
      const details = document.createElement('details');
      details.className = 'settings-accordion';
      if (open) details.open = true;
      const summary = document.createElement('summary');
      summary.className = 'settings-accordion-title';
      summary.textContent = title;
      const content = document.createElement('div');
      content.className = 'settings-accordion-content';
      nodes.forEach(node => content.appendChild(node));
      details.appendChild(summary);
      details.appendChild(content);
      modalBody.appendChild(details);
    }

    const notifications = document.getElementById('settings-push-notifications');
    const syncStart = document.getElementById('settings-sync-code');
    const syncEnd = document.getElementById('settings-pair-code');
    const nameInput = document.getElementById('settings-display-name');
    const dayReset = document.getElementById('settings-tally-reset-hour');
    const presetButtons = document.querySelector('.settings-preset-btns');
    const pilesAdd = document.querySelector('.settings-piles-add');
    const themeColors = document.querySelector('.settings-theme-colors');

    const generalStart = nameInput ? nameInput.previousElementSibling && nameInput.previousElementSibling.previousElementSibling : null;
    const workflowStart = presetButtons ? presetButtons.previousElementSibling && presetButtons.previousElementSibling.previousElementSibling : null;
    const appearanceStart = themeColors ? themeColors.previousElementSibling && themeColors.previousElementSibling.previousElementSibling : null;

    saveBtn.remove();

    createSection('General', true, collectRange(generalStart, dayReset));
    createSection('Workflow', true, collectRange(workflowStart, pilesAdd));
    createSection('Appearance', false, collectRange(appearanceStart, themeColors));
    createSection('Sync & Devices', false, collectRange(syncStart, syncEnd));
    if (notifications) createSection('Notifications', false, [notifications]);

    modalBody.appendChild(saveBtn);
    modalBody.dataset.accordionized = 'true';
  }

  function openSettingsModal() {
    ensureSettingsAccordion();
    const pushStatus = document.getElementById('settings-push-status');
    if (pushStatus) pushStatus.textContent = '';
    const displayNameEl = document.getElementById('settings-display-name');
    if (displayNameEl) displayNameEl.value = state.displayName || '';

    const tallyResetEl = document.getElementById('settings-tally-reset-hour');
    if (tallyResetEl) tallyResetEl.value = String(state.tallyResetHour != null ? state.tallyResetHour : 3);

    const showSuggestNextEl = document.getElementById('settings-show-suggest-next');
    if (showSuggestNextEl) showSuggestNextEl.checked = state.showSuggestNext !== false;

    const presetRadios = document.querySelectorAll('input[name="category-preset"]');
    presetRadios.forEach(r => {
      r.checked = (r.value === (state.categoryPreset || 'generic'));
    });
    const container = document.getElementById('settings-column-inputs');
    if (!container) return;
    container.innerHTML = getCategories().map(c => {
      const val = (state.customLabels[c.id] || c.label);
      return `<label>${escapeHtml(c.label)}<input type="text" data-cat="${c.id}" value="${escapeHtml(val)}" placeholder="${escapeHtml(c.label)}"></label>`;
    }).join('');

    const colorsContainer = document.getElementById('settings-column-colors');
    if (colorsContainer) {
      colorsContainer.innerHTML = getCategories().map(c => {
        const current = getColumnColor(c.id);
        return `
          <div class="settings-color-row">
            <label>${escapeHtml(getCategoryLabel(c.id))}</label>
            <div class="color-picker-row">
              <input type="color" data-cat="${c.id}" value="${current}" class="color-input">
              <input type="text" data-cat="${c.id}" class="color-hex-input" value="${current}" placeholder="#000000" maxlength="7">
            </div>
          </div>`;
      }).join('');

      colorsContainer.querySelectorAll('.color-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const cat = e.target.dataset.cat;
          state.columnColors[cat] = e.target.value;
          const hexInp = colorsContainer.querySelector(`.color-hex-input[data-cat="${cat}"]`);
          if (hexInp) hexInp.value = e.target.value;
          saveDevicePreferencesToSupabase();
          renderColumns();
        });
      });
      colorsContainer.querySelectorAll('.color-hex-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const cat = e.target.dataset.cat;
          const val = e.target.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            state.columnColors[cat] = val;
            const colorInp = colorsContainer.querySelector(`.color-input[data-cat="${cat}"]`);
            if (colorInp) colorInp.value = val;
            saveDevicePreferencesToSupabase();
            renderColumns();
          }
        });
      });
    }

    const btnColorEl = document.getElementById('settings-button-color');
    const btnHexEl = document.getElementById('settings-button-hex');
    const textColorEl = document.getElementById('settings-text-color');
    const textHexEl = document.getElementById('settings-text-hex');
    const defaultBtn = '#e07a5f';
    const defaultText = '#e8e6e3';
    if (btnColorEl) btnColorEl.value = state.buttonColor || defaultBtn;
    if (btnHexEl) btnHexEl.value = state.buttonColor || defaultBtn;
    if (textColorEl) textColorEl.value = state.textColor || defaultText;
    if (textHexEl) textHexEl.value = state.textColor || defaultText;

    const syncCodeEl = document.getElementById('settings-sync-code');
    const syncCodeDisplay = document.getElementById('settings-sync-code-display');
    const pairCodeEl = document.getElementById('settings-pair-code');
    const pairCodeDisplay = document.getElementById('settings-pair-code-display');
    if (syncCodeEl && syncCodeDisplay) {
      if (state.deviceSyncId) {
        syncCodeEl.style.display = 'block';
        syncCodeDisplay.textContent = state.deviceSyncId;
      } else {
        syncCodeEl.style.display = 'none';
      }
    }
    if (pairCodeEl && pairCodeDisplay) {
      if (state.pairId) {
        pairCodeEl.style.display = 'block';
        pairCodeDisplay.textContent = state.pairId;
      } else {
        pairCodeEl.style.display = 'none';
      }
    }

    renderSettingsPilesList();
    const pileNameInput = document.getElementById('settings-pile-name');
    const pileAddBtn = document.getElementById('settings-pile-add-btn');
    if (pileAddBtn && pileNameInput) {
      pileAddBtn.replaceWith(pileAddBtn.cloneNode(true));
      document.getElementById('settings-pile-add-btn').addEventListener('click', () => {
        const name = pileNameInput.value.trim();
        if (!name) return;
        addPile(name);
        pileNameInput.value = '';
        renderSettingsPilesList();
        showToast('Pile added');
      });
    }

    document.getElementById('settings-modal').style.display = 'flex';
  }

  function renderSettingsPilesList() {
    const container = document.getElementById('settings-piles-list');
    if (!container) return;
    const piles = getPiles();
    container.innerHTML = piles.length ? piles.map(p => {
      const count = (state.items || []).filter(i => i.pileId === p.id).length;
      return `<div class="settings-pile-row" data-pile-id="${p.id}">
        <span class="settings-pile-name">${escapeHtml(p.name)}</span>
        <span class="settings-pile-meta">${count} task${count !== 1 ? 's' : ''}</span>
        <button type="button" class="btn-secondary btn-sm settings-pile-rename" data-pile-id="${p.id}">Rename</button>
        <button type="button" class="btn-secondary btn-sm settings-pile-delete" data-pile-id="${p.id}" data-count="${count}">Delete</button>
      </div>`;
    }).join('') : '<p class="settings-hint">No piles yet. Add one below.</p>';

    container.querySelectorAll('.settings-pile-rename').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pileId;
        const current = getPileName(id) || '';
        const name = window.prompt('Rename pile:', current);
        if (name != null && name.trim()) {
          updatePile(id, name.trim());
          renderSettingsPilesList();
          showToast('Pile renamed');
        }
      });
    });
    container.querySelectorAll('.settings-pile-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pileId;
        const count = parseInt(btn.dataset.count, 10) || 0;
        const msg = count > 0
          ? count + ' task' + (count !== 1 ? 's' : '') + ' will become uncategorized. Delete this pile?'
          : 'Delete this pile?';
        if (window.confirm(msg)) {
          deletePile(id);
          renderSettingsPilesList();
          renderColumns();
          showToast('Pile deleted');
        }
      });
    });
  }

  function getPreferencesForDevice() {
    const prefs = { ...getActiveColumnColors() };
    if (state.buttonColor) prefs.__button = state.buttonColor;
    if (state.textColor) prefs.__text = state.textColor;
    prefs.custom_labels = { ...(state.customLabels || {}) };
    prefs.category_preset = state.categoryPreset || 'generic';
    prefs.__items = state.items;
    prefs.__todaySuggestionIds = state.todaySuggestionIds;
    if (Array.isArray(state.columnOrder) && state.columnOrder.length) prefs.__columnOrder = state.columnOrder;
    prefs.__tallyResetHour = state.tallyResetHour != null ? state.tallyResetHour : 3;
    if (Array.isArray(state.piles) && state.piles.length) prefs.__piles = state.piles;
    if (state.viewMode) prefs.__viewMode = state.viewMode;
    if (typeof state.showSuggestNext === 'boolean') prefs.__showSuggestNext = state.showSuggestNext;
    if (state.columnNotes && Object.keys(state.columnNotes).length) prefs.__columnNotes = state.columnNotes;
    if (state.lastSeed) prefs.__lastSeed = state.lastSeed;
    if (Array.isArray(state.habits) && state.habits.length) prefs.__habits = state.habits;
    if (Array.isArray(state.habitCompletions) && state.habitCompletions.length) prefs.__habitCompletions = state.habitCompletions;
    prefs.__people = Array.isArray(state.people) ? state.people : [];
    return prefs;
  }

  function applyDevicePreferencesToState(prefs) {
    if (!prefs || typeof prefs !== 'object') return;
    if (prefs.__button) { state.buttonColor = prefs.__button; delete prefs.__button; }
    if (prefs.__text) { state.textColor = prefs.__text; delete prefs.__text; }
    if (prefs.custom_labels) { state.customLabels = prefs.custom_labels; delete prefs.custom_labels; }
    if (prefs.category_preset) { state.categoryPreset = prefs.category_preset; delete prefs.category_preset; }
    if (Array.isArray(prefs.__items)) { state.items = prefs.__items; delete prefs.__items; }
    if (Array.isArray(prefs.__todaySuggestionIds)) { state.todaySuggestionIds = prefs.__todaySuggestionIds; delete prefs.__todaySuggestionIds; }
    if (typeof prefs.__completedTodayCount === 'number') delete prefs.__completedTodayCount;
    if (prefs.__lastCompletedDate) delete prefs.__lastCompletedDate;
    if (Array.isArray(prefs.__columnOrder)) { state.columnOrder = prefs.__columnOrder; delete prefs.__columnOrder; }
    if (typeof prefs.__tallyResetHour === 'number' && prefs.__tallyResetHour >= 0 && prefs.__tallyResetHour <= 23) { state.tallyResetHour = prefs.__tallyResetHour; delete prefs.__tallyResetHour; }
    if (Array.isArray(prefs.__piles)) { state.piles = prefs.__piles; delete prefs.__piles; }
    if (prefs.__viewMode === 'piles' || prefs.__viewMode === 'columns') { state.viewMode = prefs.__viewMode; delete prefs.__viewMode; }
    if (typeof prefs.__showSuggestNext === 'boolean') { state.showSuggestNext = prefs.__showSuggestNext; delete prefs.__showSuggestNext; }
    if (prefs.__columnNotes && typeof prefs.__columnNotes === 'object') { state.columnNotes = prefs.__columnNotes; delete prefs.__columnNotes; }
    if (typeof prefs.__lastSeed === 'string') { state.lastSeed = prefs.__lastSeed; delete prefs.__lastSeed; }
    if (Array.isArray(prefs.__habits)) { state.habits = prefs.__habits; delete prefs.__habits; }
    if (Array.isArray(prefs.__habitCompletions)) { state.habitCompletions = prefs.__habitCompletions; delete prefs.__habitCompletions; }
    if (Array.isArray(prefs.__people)) { state.people = prefs.__people; delete prefs.__people; }
    if (Object.keys(prefs).length) state.columnColors = prefs;
    saveState(true, true);
  }

  async function runDeviceSyncMigration() {
    if (state.deviceSyncId) return;
    if (!window.talkAbout) return;
    if (state.pairId) {
      state.deviceSyncId = state.pairId + '_' + (state.addedBy || 'Talia');
      try {
        const payload = getPreferencesForDevice();
        const oldPrefs = await window.talkAbout.getUserPreferences(state.pairId, state.addedBy);
        if (oldPrefs && !oldPrefs.error && typeof oldPrefs === 'object' && Object.keys(oldPrefs).length > 0) {
          Object.assign(payload, oldPrefs);
        }
        const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, payload);
        if (error) console.warn('Migration save failed', error);
      } catch (e) {
        console.warn('Migration failed', e);
        const payload = getPreferencesForDevice();
        await window.talkAbout.saveDevicePreferences(state.deviceSyncId, payload);
      }
      if (hasChosenSolo()) {
        state.pairId = null;
        state.addedBy = 'Talia';
        localStorage.removeItem(STORAGE_PREFIX + 'pairId');
        localStorage.setItem(STORAGE_PREFIX + 'addedBy', 'Talia');
      }
    } else {
      state.deviceSyncId = window.talkAbout.generatePairId();
      try {
        const payload = getPreferencesForDevice();
        await window.talkAbout.saveDevicePreferences(state.deviceSyncId, payload);
      } catch (e) {
        console.warn('Seed failed', e);
      }
    }
    saveDeviceSyncState();
  }

  function saveDevicePreferencesToSupabase() {
    if (!window.talkAbout || !state.deviceSyncId) return;
    if (state.savePrefsTimeout) clearTimeout(state.savePrefsTimeout);
    state.savePrefsTimeout = setTimeout(async () => {
      state.savePrefsTimeout = null;
      try {
        const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
        if (error) showToast('Could not sync preferences — will retry when online');
      } catch (e) {
        showToast('Could not sync preferences — will retry when online');
      }
    }, 500);
  }

  async function forcePushToCloud() {
    const btn = document.getElementById('settings-push-now-btn');
    const statusEl = document.getElementById('settings-push-notifications-status');
    const origText = btn ? btn.textContent : '';
    const setStatus = (msg) => {
      if (statusEl) { statusEl.textContent = msg; statusEl.className = 'settings-push-status' + (msg && !msg.startsWith('✓') ? ' settings-push-error' : ''); }
    };
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Pushing…';
    }
    setStatus('');
    if (!window.talkAbout || !state.deviceSyncId) {
      setStatus('No sync code yet — use the app first');
      showToast('No sync code yet — use the app first');
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      return;
    }
    try {
      const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
      if (error) {
        const msg = 'Could not push — ' + (error || 'check connection');
        setStatus(msg);
        showToast(msg);
      } else {
        const msg = '✓ Pushed ' + state.items.length + ' tasks to cloud';
        setStatus(msg);
        showToast(msg);
      }
    } catch (e) {
      const msg = 'Could not push — check connection';
      setStatus(msg);
      showToast(msg);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = origText;
      }
    }
  }

  function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
  }

  function renderSeedTaskOptions(filterText) {
    const taskSelect = document.getElementById('seed-render-task-select');
    const emptyEl = document.getElementById('seed-render-empty');
    if (!taskSelect) return;
    const q = (filterText || '').trim().toLowerCase();
    const filtered = (state.seedRenderTaskCache || []).filter(i => !q || (i.text || '').toLowerCase().includes(q));
    taskSelect.innerHTML = '<option value="">— None —</option>' + filtered.map(i =>
      `<option value="${escapeHtml(i.id)}">${escapeHtml((i.text || '').slice(0, 80))}${(i.text || '').length > 80 ? '…' : ''}</option>`
    ).join('');
    if (emptyEl) emptyEl.style.display = filtered.length ? 'none' : 'block';
  }

  function openSeedRenderModal() {
    const modal = document.getElementById('seed-render-modal');
    const picker = document.getElementById('seed-render-picker');
    const searchInput = document.getElementById('seed-render-task-search');
    const questionInput = document.getElementById('seed-render-question');
    const resultDiv = document.getElementById('seed-render-result');
    const actionsDiv = document.getElementById('seed-render-actions');
    const renderingDiv = document.getElementById('seed-render-rendering');
    const reflectionDiv = document.getElementById('seed-render-reflection');
    const reflectionInput = document.getElementById('seed-render-reflection-input');
    if (!modal) return;
    state.seedRenderTaskCache = sortByTimeBandsAndFriction(getActiveItems());
    state.seedRenderState = null;
    if (picker) picker.style.display = 'block';
    if (renderingDiv) renderingDiv.style.display = 'none';
    if (reflectionDiv) reflectionDiv.style.display = 'none';
    if (reflectionInput) reflectionInput.value = '';
    if (searchInput) searchInput.value = '';
    renderSeedTaskOptions('');
    if (questionInput) questionInput.value = '';
    if (resultDiv) resultDiv.style.display = 'none';
    if (actionsDiv) actionsDiv.style.display = 'block';
    modal.style.display = 'flex';
  }

  function closeSeedRenderModal() {
    const modal = document.getElementById('seed-render-modal');
    if (modal) modal.style.display = 'none';
    state.seedRenderState = null;
  }

  function openConsistencyPanel() {
    const panel = document.getElementById('consistency-panel');
    if (!panel) return;
    panel.style.display = 'block';
    renderConsistencyPanel();
  }

  function closeConsistencyPanel() {
    const panel = document.getElementById('consistency-panel');
    if (panel) panel.style.display = 'none';
  }

  function renderConsistencyPanel() {
    const todayStr = getTodayLocalYYYYMMDD();
    const pct = computeWeightedPct(todayStr);
    const rolling = compute7DayRolling();
    const zone = getZoneLabel(pct);
    const metricsEl = document.getElementById('consistency-metrics');
    const zoneEl = document.getElementById('consistency-zone');
    const trendEl = document.getElementById('consistency-trend');
    const monthEl = document.getElementById('consistency-month');
    const habitsListEl = document.getElementById('consistency-habits-list');
    if (metricsEl) metricsEl.innerHTML = '<p>Weighted today: <strong>' + pct + '%</strong></p><p>7-day rolling: <strong>' + rolling + '%</strong></p>';
    if (zoneEl) zoneEl.textContent = 'Zone: ' + zone;
    const trendDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      trendDays.push({ date: dateStr, pct: computeWeightedPct(dateStr) });
    }
    if (trendEl) trendEl.innerHTML = '<p>Last 7 days</p><p>' + trendDays.map(x => x.date + ': ' + x.pct + '%').join(' · ') + '</p>';
    if (monthEl) monthEl.innerHTML = '<p>Month view (read-only)</p><p class="consistency-month-hint">Days × habits grid would go here.</p>';
    const habits = getHabits();
    const columnSelect = document.getElementById('consistency-habit-column');
    const pileSelect = document.getElementById('consistency-habit-pile');
    if (columnSelect) {
      columnSelect.innerHTML = '<option value="">None</option>' + getCategories().map(c =>
        '<option value="' + c.id + '">' + escapeHtml(getCategoryLabel(c.id)) + '</option>'
      ).join('');
    }
    if (pileSelect) {
      pileSelect.innerHTML = '<option value="">None</option>' + getPiles().map(p =>
        '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>'
      ).join('');
    }
    if (habitsListEl) {
      habitsListEl.innerHTML = habits.length ? habits.map(h => {
        const linkDesc = [h.linkedCategoryId ? getCategoryLabel(h.linkedCategoryId) : null, h.linkedPileId ? getPileName(h.linkedPileId) : null].filter(Boolean);
        const linkText = linkDesc.length === 2 ? 'Both' : linkDesc.length === 1 ? linkDesc[0] : 'Manual only';
        return `<div class="consistency-habit-row" data-habit-id="${h.id}">
          <span class="consistency-habit-name">${escapeHtml(h.name)}</span>
          <span class="consistency-habit-meta">weight ${h.weight || 1} · ${escapeHtml(linkText)}</span>
          <button type="button" class="btn-secondary btn-sm consistency-habit-delete" data-habit-id="${h.id}">Delete</button>
        </div>`;
      }).join('') : '<p class="settings-hint">No habits yet. Add one below.</p>';
      habitsListEl.querySelectorAll('.consistency-habit-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.confirm('Delete this habit?')) {
            deleteHabit(btn.dataset.habitId);
            renderConsistencyPanel();
            renderConsistencySmall();
          }
        });
      });
    }
    const addBtn = document.getElementById('consistency-habit-add');
    if (addBtn) {
      addBtn.replaceWith(addBtn.cloneNode(true));
      document.getElementById('consistency-habit-add').addEventListener('click', () => {
        const nameEl = document.getElementById('consistency-habit-name');
        const weightEl = document.getElementById('consistency-habit-weight');
        const colEl = document.getElementById('consistency-habit-column');
        const pileEl = document.getElementById('consistency-habit-pile');
        const name = nameEl?.value?.trim();
        if (!name) return;
        addHabit(name, weightEl?.value || 3, colEl?.value || null, pileEl?.value || null);
        if (nameEl) nameEl.value = '';
        renderConsistencyPanel();
        renderConsistencySmall();
        showToast('Habit added');
      });
    }
  }

  function flushJournalDailySave() {
    if (state.journalDailySaveTimeout) {
      clearTimeout(state.journalDailySaveTimeout);
      state.journalDailySaveTimeout = null;
    }
    const input = document.getElementById('journal-daily-input');
    if (!input) return;
    const tallyStr = getTallyDateYYYYMMDD();
    if (!state.journalDaily) state.journalDaily = {};
    state.journalDaily[tallyStr] = input.value;
    saveState();
  }

  function openJournalPanel() {
    state.journalFocusMode = false;
    const panel = document.getElementById('journal-panel');
    if (!panel) return;
    panel.style.display = 'block';
    renderJournalPanel();
    const dailyInput = document.getElementById('journal-daily-input');
    if (dailyInput && state.journalActiveTab === 'daily') dailyInput.focus();
  }

  function closeJournalPanel() {
    flushJournalDailySave();
    state.journalFocusMode = false;
    const panel = document.getElementById('journal-panel');
    if (panel) panel.style.display = 'none';
  }

  function setJournalFocusMode(on) {
    state.journalFocusMode = !!on;
    const panel = document.getElementById('journal-panel');
    const header = document.getElementById('journal-panel-header');
    const nav = document.getElementById('journal-nav');
    const exitWrap = document.getElementById('journal-exit-focus-wrap');
    const focusBtn = document.getElementById('journal-focus-btn');
    if (panel) panel.classList.toggle('journal-focus-mode', state.journalFocusMode);
    if (header) header.style.display = state.journalFocusMode ? 'none' : '';
    if (nav) nav.style.display = state.journalFocusMode ? 'none' : '';
    if (exitWrap) exitWrap.style.display = state.journalFocusMode ? 'block' : 'none';
    if (focusBtn) focusBtn.textContent = state.journalFocusMode ? 'Exit focus' : 'Focus writing';
    if (state.journalFocusMode) {
      const dailyInput = document.getElementById('journal-daily-input');
      if (dailyInput) dailyInput.focus();
    }
  }

  function getJournalDailyBlocks(text) {
    if (!text || !text.length) return [''];
    return text.split(/\n\n/);
  }

  function updateJournalDailyMirror() {
    const input = document.getElementById('journal-daily-input');
    const mirror = document.getElementById('journal-daily-mirror');
    if (!input || !mirror) return;
    const text = input.value;
    const cursorPos = input.selectionStart;
    const blocks = getJournalDailyBlocks(text);
    let pos = 0;
    let currentBlockIndex = 0;
    for (let i = 0; i < blocks.length; i++) {
      const blockLen = blocks[i].length + (i < blocks.length - 1 ? 2 : 0);
      if (cursorPos >= pos && cursorPos <= pos + blockLen) {
        currentBlockIndex = i;
        break;
      }
      if (cursorPos <= pos + blockLen) {
        currentBlockIndex = i;
        break;
      }
      pos += blockLen;
    }
    if (blocks.length === 1) currentBlockIndex = 0;
    mirror.innerHTML = blocks.map(function(block, i) {
      const inactive = i !== currentBlockIndex;
      const escaped = escapeHtml(block).replace(/\n/g, '<br>');
      return '<div class="journal-daily-block' + (inactive ? ' journal-daily-block-inactive' : '') + '">' + escaped + (inactive && block ? '<br>' : '') + '</div>';
    }).join('');
  }

  function renderJournalDaily() {
    const tallyStr = getTallyDateYYYYMMDD();
    const dateLabel = document.getElementById('journal-daily-date-label');
    if (dateLabel) dateLabel.textContent = 'Today, ' + (getTallyDate() || '').replace(/\s+\d{4}$/, '');
    const input = document.getElementById('journal-daily-input');
    if (input) {
      input.value = (state.journalDaily && state.journalDaily[tallyStr]) || '';
      updateJournalDailyMirror();
      input.oninput = function() {
        if (state.journalDailySaveTimeout) clearTimeout(state.journalDailySaveTimeout);
        state.journalDailySaveTimeout = setTimeout(function() {
          state.journalDailySaveTimeout = null;
          const v = input.value;
          if (!state.journalDaily) state.journalDaily = {};
          state.journalDaily[tallyStr] = v;
          saveState();
        }, 400);
        updateJournalDailyMirror();
      };
      input.onblur = function() { flushJournalDailySave(); };
      input.onclick = input.onkeyup = function() { updateJournalDailyMirror(); };
      input.onscroll = function() {
        var mirror = document.getElementById('journal-daily-mirror');
        if (mirror) { mirror.scrollTop = input.scrollTop; mirror.scrollLeft = input.scrollLeft; }
      };
    }
    var mirror = document.getElementById('journal-daily-mirror');
    if (mirror && input) {
      mirror.style.height = input.offsetHeight + 'px';
      mirror.style.overflow = 'auto';
    }
    setJournalFocusMode(state.journalFocusMode);
  }

  function renderJournalReflections() {
    const listEl = document.getElementById('journal-reflections-list');
    if (!listEl) return;
    const reflections = (state.seedReflections || []).slice().sort(function(a, b) {
      const ta = (a.reflectedAt != null) ? a.reflectedAt : 0;
      const tb = (b.reflectedAt != null) ? b.reflectedAt : 0;
      return tb - ta;
    });
    listEl.innerHTML = reflections.length ? reflections.map(function(r) {
      const d = r.reflectedAt != null ? new Date(r.reflectedAt) : new Date();
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const seedPart = (r.seed && r.seed.trim()) ? ' “‘' + escapeHtml(r.seed.trim()) + '”' : '';
      return '<div class="journal-reflection-item"><span class="journal-reflection-date">' + escapeHtml(dateStr) + '</span>' + seedPart + ' <span class="journal-reflection-text">' + escapeHtml((r.text || '').slice(0, 200)) + ((r.text || '').length > 200 ? '…' : '') + '</span></div>';
    }).join('') : '<p class="empty-state">No reflections yet.</p>';
  }

  function renderJournalCalendar() {
    const picker = document.getElementById('journal-calendar-picker');
    const resultEl = document.getElementById('journal-calendar-result');
    if (!resultEl) return;
    function showResult() {
      const dateStr = picker && picker.value ? picker.value : '';
      if (!dateStr) {
        resultEl.innerHTML = '<p class="empty-state">Pick a date to see journal and reflections.</p>';
        return;
      }
      const journalText = (state.journalDaily && state.journalDaily[dateStr]) || '';
      const reflections = (state.seedReflections || []).filter(function(r) {
        if (r.reflectedAt == null) return false;
        const d = new Date(r.reflectedAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return (y + '-' + m + '-' + day) === dateStr;
      });
      let html = '<h4>Journal for ' + escapeHtml(dateStr) + '</h4>';
      if (journalText.trim()) {
        html += '<div class="journal-calendar-journal">' + escapeHtml(journalText).replace(/\n/g, '<br>') + '</div>';
      } else {
        html += '<p class="empty-state">No journal entry for this day.</p>';
      }
      html += '<h4>Reflections</h4>';
      if (reflections.length) {
        html += reflections.map(function(r) {
          const seedPart = (r.seed && r.seed.trim()) ? ' “‘' + escapeHtml(r.seed.trim()) + '”' : '';
          return '<div class="journal-reflection-item">' + seedPart + ' ' + escapeHtml((r.text || '').slice(0, 300)) + ((r.text || '').length > 300 ? '…' : '') + '</div>';
        }).join('');
      } else {
        html += '<p class="empty-state">No reflections for this day.</p>';
      }
      resultEl.innerHTML = html;
    }
    if (picker) {
      picker.onchange = showResult;
      picker.value = getTallyDateYYYYMMDD();
    }
    showResult();
  }

  function renderJournalPanel() {
    setJournalFocusMode(state.journalFocusMode);
    const dailyView = document.getElementById('journal-daily-view');
    const reflectionsView = document.getElementById('journal-reflections-view');
    const calendarView = document.getElementById('journal-calendar-view');
    [dailyView, reflectionsView, calendarView].forEach(function(el) {
      if (el) el.style.display = 'none';
    });
    if (state.journalActiveTab === 'daily') {
      if (dailyView) dailyView.style.display = 'block';
      renderJournalDaily();
    } else if (state.journalActiveTab === 'reflections') {
      if (reflectionsView) reflectionsView.style.display = 'block';
      renderJournalReflections();
    } else {
      if (calendarView) calendarView.style.display = 'block';
      renderJournalCalendar();
    }
  }

  async function saveSettingsAndClose() {
    try {
      const newPreset = (document.querySelector('input[name="category-preset"]:checked') || {}).value || 'generic';
      const oldPreset = state.categoryPreset || 'generic';
      if (newPreset !== oldPreset) {
        const mapKey = oldPreset + '_to_' + newPreset;
        const map = PRESET_MIGRATION[mapKey];
        if (map) {
          state.items.forEach(item => {
            if (map[item.category]) item.category = map[item.category];
          });
          if (state.columnNotes && typeof state.columnNotes === 'object') {
            const migrated = {};
            Object.keys(state.columnNotes).forEach(k => {
              const newKey = map[k];
              migrated[newKey != null ? newKey : k] = state.columnNotes[k];
            });
            state.columnNotes = migrated;
          }
          if (Array.isArray(state.habits)) {
            state.habits.forEach(h => {
              if (h.linkedCategoryId && map[h.linkedCategoryId]) h.linkedCategoryId = map[h.linkedCategoryId];
            });
          }
          state.categoryPreset = newPreset;
          state.customLabels = {};
          const newCats = CATEGORY_PRESETS[newPreset];
          state.lastCategory = (newCats && newCats[0]) ? newCats[0].id : 'life';
        }
      }
      const displayNameInp = document.getElementById('settings-display-name');
      if (displayNameInp) state.displayName = displayNameInp.value.trim();

      const tallyResetInp = document.getElementById('settings-tally-reset-hour');
      if (tallyResetInp) {
        const h = parseInt(tallyResetInp.value, 10);
        if (!isNaN(h) && h >= 0 && h <= 23) state.tallyResetHour = h;
      }

      const showSuggestNextInp = document.getElementById('settings-show-suggest-next');
      if (showSuggestNextInp) state.showSuggestNext = showSuggestNextInp.checked;

      const btnColorInp = document.getElementById('settings-button-color');
      const textColorInp = document.getElementById('settings-text-color');
      if (btnColorInp && btnColorInp.value) state.buttonColor = btnColorInp.value;
      if (textColorInp && textColorInp.value) state.textColor = textColorInp.value;

      const inputs = document.querySelectorAll('#settings-column-inputs input[data-cat]');
      inputs.forEach(inp => {
        const val = inp.value.trim();
        if (val) state.customLabels[inp.dataset.cat] = val;
        else delete state.customLabels[inp.dataset.cat];
      });

      const colorsContainer = document.getElementById('settings-column-colors');
      if (colorsContainer) {
        colorsContainer.querySelectorAll('.color-input[data-cat]').forEach(inp => {
          const cat = inp.dataset.cat;
          if (cat && cat !== '__button' && cat !== '__text') state.columnColors[cat] = inp.value;
        });
        colorsContainer.querySelectorAll('.color-hex-input[data-cat]').forEach(inp => {
          const cat = inp.dataset.cat;
          const val = inp.value.trim();
          if (cat && cat !== '__button' && cat !== '__text' && /^#[0-9a-fA-F]{6}$/.test(val)) {
            state.columnColors[cat] = val;
          }
        });
      }

      applyThemeColors();
      saveState();
      updateCategorySelectOptions();
      renderColumns();
      const badge = document.getElementById('pair-badge');
      if (badge) {
        if (state.pairId) badge.textContent = state.pairId + ' · ' + ((state.displayName || '').trim() || state.addedBy);
        else badge.textContent = (state.displayName || '').trim() || 'Solo';
      }
      closeSettingsModal();
      if (window.talkAbout && state.deviceSyncId) {
        const { error } = await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
        if (error) {
          showToast('Settings saved locally. Could not sync to cloud — ' + (error || 'Supabase not configured'));
        } else {
          showToast('Settings saved');
        }
      } else {
        showToast('Settings saved');
      }
    } catch (e) {
      console.warn('Save settings failed', e);
      showToast('Could not save settings — ' + (e.message || 'try again'));
    }
  }

  function applySmartFields() {
    const textEl = document.getElementById('task-input');
    if (!textEl) return;
    const text = textEl.value;
    const cat = detectCategory(text);
    if (cat) document.getElementById('category-select').value = cat;
    const deadline = extractDeadline(text);
    if (deadline) document.getElementById('deadline-input').value = deadline;
    const priority = extractPriority(text);
    if (priority) {
      const sel = document.getElementById('priority-select');
      if (sel && sel.querySelector(`option[value="${priority}"]`)) sel.value = priority;
    }
  }

  function applySmartFieldsToEdit() {
    const textEl = document.getElementById('edit-text');
    if (!textEl) return;
    const text = textEl.value;
    const cat = detectCategory(text);
    if (cat) {
      const sel = document.getElementById('edit-category');
      if (sel && sel.querySelector(`option[value="${cat}"]`)) sel.value = cat;
    }
    const deadline = extractDeadline(text);
    if (deadline) {
      const inp = document.getElementById('edit-deadline');
      if (inp) inp.value = deadline;
    }
    const priority = extractPriority(text);
    if (priority) {
      const sel = document.getElementById('edit-priority');
      if (sel && sel.querySelector(`option[value="${priority}"]`)) sel.value = priority;
    }
  }

  function addSingle() {
    const submitBtn = document.getElementById('submit-single');
    if (submitBtn?.disabled) return;
    const textEl = document.getElementById('task-input');
    if (!textEl) return;
    const text = textEl.value.trim();
    if (!text) return;
    const category = document.getElementById('category-select').value;
    const deadline = document.getElementById('deadline-input').value || null;
    const doingDateEl = document.getElementById('doing-date-input');
    const doingDate = (doingDateEl && doingDateEl.value) ? doingDateEl.value : null;
    const priority = document.getElementById('priority-select').value;
    const recurrenceEl = document.getElementById('recurrence-select');
    const recurrence = (recurrenceEl && recurrenceEl.value) ? recurrenceEl.value : null;
    const pileEl = document.getElementById('pile-select');
    const pileId = (pileEl && pileEl.value) ? pileEl.value : null;
    const frictionEl = document.getElementById('friction-select');
    const friction = (frictionEl && frictionEl.value) ? frictionEl.value : null;
    const firstStepEl = document.getElementById('first-step-input');
    const firstStep = (firstStepEl && firstStepEl.value) ? firstStepEl.value.trim() : null;
    if (submitBtn) submitBtn.disabled = true;
    state.lastCategory = category;
    const personEl = document.getElementById('person-select');
    const personId = (personEl && personEl.value) ? personEl.value : null;
    const item = createItem(text, category, deadline, priority, recurrence, null, doingDate, pileId, friction, personId);
    if (firstStep) item.firstStep = firstStep;
    state.items.push(item);
    saveState();
    closeAddModal();
    renderColumns();
    if (submitBtn) submitBtn.disabled = false;
  }

  function openEditModal(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.editingId = id;
    document.getElementById('edit-text').value = item.text;
    document.getElementById('edit-category').innerHTML = getCategories().map(c =>
      `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${escapeHtml(getCategoryLabel(c.id))}</option>`
    ).join('');
    updatePileSelectOptions('edit-pile', item.pileId || '');
    updatePersonSelectOptions('edit-person', item.personId || '');
    const editFriction = document.getElementById('edit-friction');
    if (editFriction) editFriction.value = item.friction || '';
    const editFirstStep = document.getElementById('edit-first-step');
    if (editFirstStep) editFirstStep.value = item.firstStep || '';
    document.getElementById('edit-deadline').value = item.deadline || '';
    const editDoingEl = document.getElementById('edit-doing-date');
    if (editDoingEl) editDoingEl.value = item.doingDate || '';
    document.getElementById('edit-priority').innerHTML = PRIORITIES.map(p =>
      `<option value="${p}" ${p === item.priority ? 'selected' : ''}>${p}</option>`
    ).join('');
    document.getElementById('edit-modal').style.display = 'flex';
  }

  function saveEdit() {
    const id = state.editingId;
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.text = document.getElementById('edit-text').value.trim();
    item.category = document.getElementById('edit-category').value;
    const editPileEl = document.getElementById('edit-pile');
    item.pileId = (editPileEl && editPileEl.value) ? editPileEl.value : null;
    const editPersonEl = document.getElementById('edit-person');
    item.personId = (editPersonEl && editPersonEl.value) ? editPersonEl.value : null;
    const editFrictionEl = document.getElementById('edit-friction');
    item.friction = (editFrictionEl && editFrictionEl.value) ? editFrictionEl.value : null;
    const editFirstStepEl = document.getElementById('edit-first-step');
    item.firstStep = (editFirstStepEl && editFirstStepEl.value.trim()) ? editFirstStepEl.value.trim() : null;
    item.deadline = document.getElementById('edit-deadline').value || null;
    const editDoingEl = document.getElementById('edit-doing-date');
    item.doingDate = (editDoingEl && editDoingEl.value) ? editDoingEl.value : null;
    const editRecurrence = document.getElementById('edit-recurrence');
    item.recurrence = (editRecurrence && editRecurrence.value) ? editRecurrence.value : null;
    item.priority = document.getElementById('edit-priority').value;
    state.editingId = null;
    document.getElementById('edit-modal').style.display = 'none';
    saveState();
    renderTodayList();
    renderFocusList();
    renderColumns();
  }

  function toggleFocusMode() {
    const focusMode = document.getElementById('focus-mode');
    const overview = document.getElementById('overview');
    const todayBar = document.getElementById('today-bar');
    if (focusMode && overview && todayBar) {
      if (focusMode.style.display === 'none') {
        focusMode.style.display = 'block';
        overview.style.display = 'none';
        todayBar.style.display = 'none';
        renderFocusList();
      } else {
        focusMode.style.display = 'none';
        overview.style.display = 'block';
        todayBar.style.display = 'block';
      }
    }
  }

  function exportBackup() {
    const data = {
      items: state.items,
      todaySuggestionIds: state.todaySuggestionIds,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'parking-lot-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function isValidBackupItem(item) {
    return item && typeof item === 'object' && typeof (item.text ?? item.id) === 'string';
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid backup format');
        if (data.items) {
          if (!Array.isArray(data.items)) throw new Error('Items must be an array');
          state.items = data.items.filter(isValidBackupItem).map((item, idx) => ({
            ...item,
            id: item.id || 'id_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).slice(2),
            text: (item.text || '').trim() || 'Untitled',
            category: item.category || 'life',
            archived: !!item.archived,
            parkedAt: item.parkedAt || Date.now()
          }));
        }
        if (data.todaySuggestionIds) {
          if (!Array.isArray(data.todaySuggestionIds)) throw new Error('todaySuggestionIds must be an array');
          const validIds = new Set(state.items.map(i => i.id));
          state.todaySuggestionIds = data.todaySuggestionIds.filter(id => typeof id === 'string' && validIds.has(id));
        }
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
        showToast('Import complete');
      } catch (e) {
        showToast(e instanceof SyntaxError ? 'Import failed: invalid JSON' : (e.message || 'Import failed'));
      }
    };
    reader.readAsText(file);
  }

  function openArchiveModal() {
    const archived = state.items.filter(i => i.archived).sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
    const list = document.getElementById('archive-list');
    if (!list) return;
    list.innerHTML = archived.length ? archived.map(item => {
      const date = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const cat = getCategories().find(c => c.id === item.category);
      return `<div class="archive-item">${escapeHtml(item.text)} <span class="archive-date">${escapeHtml(getCategoryLabel(item.category))} — ${escapeHtml(date)}</span></div>`;
    }).join('') : '<div class="empty-state">No completed items yet</div>';
    document.getElementById('archive-modal').style.display = 'flex';
  }

  function computeAnalytics() {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const parked = state.items.filter(i => !i.archived && i.parkedAt >= weekAgo).length;
    const completed = state.items.filter(i => i.archived && i.archivedAt >= weekAgo).length;
    const byCat = {};
    state.items.filter(i => i.archived && i.archivedAt >= weekAgo).forEach(i => {
      byCat[i.category] = (byCat[i.category] || 0) + 1;
    });
    const catStr = Object.entries(byCat).map(([k, v]) => {
      return `${getCategoryLabel(k)}: ${v}`;
    }).join(', ');
    return `Parked this week: ${parked}\nCompleted from Today's Suggestions: ${completed}${catStr ? '\nBy category: ' + catStr : ''}`;
  }

  function openAnalytics() {
    const textEl = document.getElementById('analytics-text');
    if (textEl) textEl.textContent = computeAnalytics();
    const panel = document.getElementById('analytics-panel');
    if (panel) panel.style.display = 'block';
  }

  function openEmailTriage() {
    if (!window.talkAbout || typeof SUPABASE_URL === 'undefined') {
      showToast('Email triage unavailable — connect Supabase first');
      return;
    }
    renderEmailTriage(true);
    const triagePairId = state.pairId || 'solo_default';
    const triageAddedBy = state.addedBy;
    window.talkAbout.getLastAgentRun(triagePairId, triageAddedBy).then(run => {
      state.lastAgentRun = run;
      if (!run && !state.pairId && triageAddedBy) {
        window.talkAbout.getLastAgentRun(triagePairId, null).then(fallbackRun => {
          if (fallbackRun) state.lastAgentRun = fallbackRun;
          renderEmailTriage(false);
        });
      } else {
        renderEmailTriage(false);
      }
    });
    window.talkAbout.getEmailTasks(triagePairId, triageAddedBy).then(({ data, error }) => {
      state.emailTriageItems = error ? [] : (data || []);
      if (state.emailTriageItems.length === 0 && !state.pairId && triageAddedBy) {
        window.talkAbout.getEmailTasks(triagePairId, null).then(({ data: fallbackData }) => {
          if (fallbackData?.length) state.emailTriageItems = fallbackData;
          renderEmailTriage(false);
        });
      } else {
        renderEmailTriage(false);
      }
    });
  }

  function addTalkAbout() {
    const input = document.getElementById('talk-about-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (!window.talkAbout || !state.pairId) {
      showToast('Connect to sync first');
      return;
    }
    window.talkAbout.addTalkAbout(state.pairId, text, state.addedBy).then(({ data, error }) => {
      if (error) showToast(error === 'Supabase not configured' ? 'Add Supabase URL and key to config.js' : 'Failed to add');
      else {
        input.value = '';
        if (data) {
          state.talkAboutItems = [...state.talkAboutItems, data];
          renderTalkAbout();
        }
        showToast('Added');
      }
    });
  }

  async function showMainApp() {
    document.getElementById('entry-screen').style.display = 'none';
    document.getElementById('pair-setup').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('floating-buttons').style.display = 'flex';
    const badge = document.getElementById('pair-badge');
    const talkSection = document.getElementById('talk-about-section');
    const linkPartnerBtn = document.getElementById('link-partner-btn');
    if (state.pairId) {
      const name = (state.displayName || '').trim() || state.addedBy;
      if (badge) badge.textContent = state.pairId + ' · ' + name;
      if (talkSection) talkSection.style.display = 'block';
      if (linkPartnerBtn) linkPartnerBtn.style.display = 'none';
    } else {
      const name = (state.displayName || '').trim() || 'Solo';
      if (badge) badge.textContent = name;
      if (talkSection) talkSection.style.display = 'none';
      if (linkPartnerBtn) linkPartnerBtn.style.display = 'block';
    }
    loadState();
    await runDeviceSyncMigration();
    try {
      if (window.talkAbout && state.deviceSyncId) {
        const prefs = await window.talkAbout.getDevicePreferences(state.deviceSyncId);
        if (prefs?.error) {
          showToast('Could not load preferences — using local settings');
        } else {
          applyDevicePreferencesToState(prefs);
        }
      }
    } catch (e) {
      console.warn('Preferences fetch failed', e);
      showToast('Using local settings');
    }
    applyThemeColors();
    updateCategorySelectOptions();
    ensureViewToggle();
    renderColumns();
    renderTodayList();
    renderTalkAbout();
    renderEmailTriage(false);
    updateTally();
    updateAddToSuggestionsBtn();
    if (window.talkAbout && state.pairId) {
      if (state.talkAboutUnsubscribe) state.talkAboutUnsubscribe();
      state.talkAboutUnsubscribe = window.talkAbout.subscribeTalkAbout(state.pairId, (items) => {
        state.talkAboutItems = items;
        renderTalkAbout();
      });
    } else if (state.talkAboutUnsubscribe) {
      state.talkAboutUnsubscribe();
      state.talkAboutUnsubscribe = null;
    }
    if (window.talkAbout && state.deviceSyncId) {
      if (state.prefsUnsubscribe) state.prefsUnsubscribe();
      state.prefsUnsubscribe = window.talkAbout.subscribeDevicePreferences(state.deviceSyncId, (prefs) => {
        applyDevicePreferencesToState(prefs);
        applyThemeColors();
        updateCategorySelectOptions();
        renderColumns();
        renderTodayList();
        updateTally();
        updateAddToSuggestionsBtn();
      });
    } else if (state.prefsUnsubscribe) {
      state.prefsUnsubscribe();
      state.prefsUnsubscribe = null;
    }
    const triagePairId = state.pairId || 'solo_default';
    const triageAddedBy = state.addedBy;
    if (window.talkAbout) {
      window.talkAbout.getLastAgentRun(triagePairId, triageAddedBy).then(run => {
        state.lastAgentRun = run;
        renderEmailTriage(false);
      });
      if (state.emailTriageUnsubscribe) state.emailTriageUnsubscribe();
      state.emailTriageUnsubscribe = window.talkAbout.subscribeEmailTasks(triagePairId, triageAddedBy, items => {
        state.emailTriageItems = items;
        renderEmailTriage(false);
      });
    }
  }

  function renderEmailTriage(showPanel = false) {
    const section = document.getElementById('email-triage-section');
    const list = document.getElementById('email-triage-list');
    const statusEl = document.getElementById('email-triage-status');
    const emptyEl = document.getElementById('email-triage-empty');
    if (!section || !list) return;
    if (!window.talkAbout || typeof SUPABASE_URL === 'undefined') {
      section.style.display = 'none';
      return;
    }
    if (showPanel) section.style.display = 'block';
    const items = state.emailTriageItems || [];
    if (statusEl) {
      const run = state.lastAgentRun;
      if (run) {
        const d = run.run_at ? new Date(run.run_at) : null;
        const ago = d ? (Math.round((Date.now() - d) / 60000) + ' min ago') : '';
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
        const run = state.lastAgentRun;
        if (!run) {
          emptyEl.textContent = 'Run the triage agent to extract tasks from your inbox. See email-management/README.md';
        } else {
          const d = run.run_at ? new Date(run.run_at) : null;
          const hoursAgo = d ? Math.round((Date.now() - d) / 3600000) : null;
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
            <select class="email-triage-category" data-id="${t.id}">${getCategories().map(c => `<option value="${c.id}" ${c.id === t.category ? 'selected' : ''}>${escapeHtml(getCategoryLabel(c.id))}</option>`).join('')}</select>
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
    const t = state.emailTriageItems.find(x => x.id === id);
    if (!t || !window.talkAbout) return;
    const input = document.querySelector(`.email-triage-task-input[data-id="${id}"]`);
    const text = input?.value?.trim() || t.text;
    const cat = detectCategory(text) || document.querySelector(`.email-triage-category[data-id="${id}"]`)?.value || t.category;
    const deadline = extractDeadline(text) || t.deadline;
    const priority = extractPriority(text) || t.priority || 'medium';
    const item = createItem(text, cat, deadline, priority, null, null, null, null, null, null);
    state.items.push(item);
    state.lastCategory = cat;
    saveState();
    window.talkAbout.approveEmailTask(id).then(({ error }) => {
      if (error) showToast('Failed to approve');
      else {
        state.emailTriageItems = state.emailTriageItems.filter(x => x.id !== id);
        renderEmailTriage();
        renderColumns();
        showToast('Added to ' + getCategoryLabel(cat));
      }
    });
  }

  function dismissEmailTask(id) {
    if (!window.talkAbout) return;
    window.talkAbout.deleteEmailTask(id).then(({ error }) => {
      if (error) showToast('Failed to dismiss');
      else {
        state.emailTriageItems = state.emailTriageItems.filter(x => x.id !== id);
        renderEmailTriage();
        showToast('Dismissed');
      }
    });
  }

  function ensureViewToggle() {
    const header = document.querySelector('.columns-header');
    if (!header) return;
    let toggle = header.querySelector('.view-toggle');
    if (toggle) return;
    toggle = document.createElement('div');
    toggle.className = 'view-toggle';
    toggle.setAttribute('role', 'tablist');
    toggle.setAttribute('aria-label', 'View mode');
    toggle.innerHTML = `
      <button type="button" id="view-columns-btn" class="view-toggle-btn" data-view="columns" aria-selected="false">Columns</button>
      <button type="button" id="view-piles-btn" class="view-toggle-btn" data-view="piles" aria-selected="false">Piles</button>
    `;
    const search = header.querySelector('#search-input');
    if (search && search.parentNode == header) header.insertBefore(toggle, search);
    else header.appendChild(toggle);
  }

  function bindEvents() {
    ensureViewToggle();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = state.searchQuery || '';
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value;
        renderColumns();
      });
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      state.drillDownCategory = null;
      backBtn.style.display = 'none';
      renderColumns();
    });

    const viewColumnsBtn = document.getElementById('view-columns-btn');
    const viewPilesBtn = document.getElementById('view-piles-btn');
    if (viewColumnsBtn) viewColumnsBtn.addEventListener('click', () => {
      state.viewMode = 'columns';
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      renderColumns();
    });
    if (viewPilesBtn) viewPilesBtn.addEventListener('click', () => {
      state.viewMode = 'piles';
      state.openColumnNoteId = null;
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      renderColumns();
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
            saveState();
            renderColumns();
          }
        } else {
          const newCat = column.dataset.category;
          if (newCat && item.category !== newCat) {
            item.category = newCat;
            saveState();
            renderColumns();
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
        const remaining = 5 - state.todaySuggestionIds.length;
        if (remaining <= 0) return;
        state.todaySuggestionIds.push(id);
        saveState();
        renderTodayList();
        renderFocusList();
        renderColumns();
        updateAddToSuggestionsBtn();
      });
    }

    const addToSuggestionsBtn = document.getElementById('add-to-suggestions-btn');
    if (addToSuggestionsBtn) addToSuggestionsBtn.addEventListener('click', addToSuggestions);
    const addToSuggestionsClear = document.getElementById('add-to-suggestions-clear');
    if (addToSuggestionsClear) addToSuggestionsClear.addEventListener('click', clearAddToSuggestionsSelection);

    const clearBtn = document.getElementById('clear-suggestions');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      state.todaySuggestionIds = [];
      saveState();
      renderTodayList();
      renderFocusList();
      renderColumns();
    });

    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    function openSidebar() {
      if (sidebar) sidebar.classList.add('open');
      if (sidebarOverlay) sidebarOverlay.style.display = 'block';
      document.body.classList.add('sidebar-open');
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
      openLinkPartnerModal();
    });

    const addBtn = document.getElementById('add-btn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

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

    document.addEventListener('keydown', (e) => {
      const mainApp = document.getElementById('main-app');
      if (!mainApp || mainApp.style.display === 'none') return;
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openAddModal();
      } else if (e.key === 'Escape') {
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') {
          closeShortcutsOverlay();
        } else if (document.body.classList.contains('sidebar-open')) {
          closeSidebar();
        } else {
          const modals = ['add-modal', 'edit-modal', 'add-from-talk-modal', 'archive-modal', 'settings-modal', 'link-partner-modal', 'seed-render-modal'];
          const panels = ['analytics-panel', 'email-triage-section'];
          for (const id of modals) {
            const m = document.getElementById(id);
            if (m && m.style.display === 'flex') {
              if (id === 'add-modal') closeAddModal();
              else if (id === 'edit-modal') { m.style.display = 'none'; state.editingId = null; }
              else if (id === 'add-from-talk-modal') closeAddFromTalkModal();
              else if (id === 'archive-modal') m.style.display = 'none';
              else if (id === 'settings-modal') closeSettingsModal();
              else if (id === 'link-partner-modal') closeLinkPartnerModal();
              else if (id === 'seed-render-modal') closeSeedRenderModal();
              return;
            }
          }
          for (const id of panels) {
            const p = document.getElementById(id);
            if (p && p.style.display === 'block') { p.style.display = 'none'; return; }
          }
          const consistencyPanel = document.getElementById('consistency-panel');
          if (consistencyPanel && consistencyPanel.style.display === 'block') {
            closeConsistencyPanel();
            return;
          }
          const journalPanel = document.getElementById('journal-panel');
          if (journalPanel && journalPanel.style.display === 'block') {
            if (state.journalFocusMode) {
              setJournalFocusMode(false);
              if (document.getElementById('journal-focus-btn')) document.getElementById('journal-focus-btn').focus();
            } else {
              closeJournalPanel();
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
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (shortcutsOverlay && shortcutsOverlay.style.display === 'flex') closeShortcutsOverlay();
        else openShortcutsOverlay();
      }
    });

    const focusBtn = document.getElementById('focus-btn');
    if (focusBtn) focusBtn.addEventListener('click', toggleFocusMode);
    const seedFab = document.getElementById('seed-fab');
    if (seedFab) seedFab.addEventListener('click', openSeedRenderModal);

    document.querySelectorAll('.fab-wrap').forEach(wrap => {
      wrap.addEventListener('mouseenter', () => wrap.classList.add('fab-help-visible'));
      wrap.addEventListener('mouseleave', () => wrap.classList.remove('fab-help-visible'));
    });

    const closeAdd = document.getElementById('close-add');
    if (closeAdd) closeAdd.addEventListener('click', closeAddModal);

    const addModal = document.getElementById('add-modal');
    if (addModal) addModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-modal') closeAddModal();
    });

    const taskInput = document.getElementById('task-input');
    if (taskInput) {
      taskInput.addEventListener('input', applySmartFields);
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addSingle();
      });
    }

    const submitSingle = document.getElementById('submit-single');
    if (submitSingle) submitSingle.addEventListener('click', addSingle);
    const submitQuick = document.getElementById('submit-quick');
    if (submitQuick) submitQuick.addEventListener('click', addQuick);
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
    initVoiceMulti();

    const closeEdit = document.getElementById('close-edit');
    if (closeEdit) closeEdit.addEventListener('click', () => {
      document.getElementById('edit-modal').style.display = 'none';
      state.editingId = null;
    });

    const editModal = document.getElementById('edit-modal');
    if (editModal) editModal.addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') {
        editModal.style.display = 'none';
        state.editingId = null;
      }
    });

    const saveEditBtn = document.getElementById('save-edit');
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveEdit);

    const closeAddFromTalk = document.getElementById('close-add-from-talk');
    if (closeAddFromTalk) closeAddFromTalk.addEventListener('click', closeAddFromTalkModal);
    const addFromTalkModal = document.getElementById('add-from-talk-modal');
    if (addFromTalkModal) addFromTalkModal.addEventListener('click', (e) => {
      if (e.target.id === 'add-from-talk-modal') closeAddFromTalkModal();
    });
    const submitAddFromTalkBtn = document.getElementById('submit-add-from-talk');
    if (submitAddFromTalkBtn) submitAddFromTalkBtn.addEventListener('click', submitAddFromTalk);

    const editTextEl = document.getElementById('edit-text');
    if (editTextEl) editTextEl.addEventListener('input', applySmartFieldsToEdit);

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);

    const closeSettings = document.getElementById('close-settings');
    if (closeSettings) closeSettings.addEventListener('click', closeSettingsModal);

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) settingsModal.addEventListener('click', (e) => {
      if (e.target.id === 'settings-modal') closeSettingsModal();
    });

    const saveSettings = document.getElementById('save-settings');
    if (saveSettings) saveSettings.addEventListener('click', saveSettingsAndClose);

    const pushNowBtn = document.getElementById('settings-push-now-btn');
    if (pushNowBtn) pushNowBtn.addEventListener('click', () => forcePushToCloud());

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
              applyDevicePreferencesToState(prefs);
              if (state.prefsUnsubscribe) state.prefsUnsubscribe();
              state.prefsUnsubscribe = window.talkAbout.subscribeDevicePreferences(state.deviceSyncId, (p) => {
                applyDevicePreferencesToState(p);
                applyThemeColors();
                updateCategorySelectOptions();
                renderColumns();
                renderTodayList();
                updateTally();
                updateAddToSuggestionsBtn();
              });
              applyThemeColors();
              updateCategorySelectOptions();
              renderColumns();
              renderTodayList();
              updateTally();
              updateAddToSuggestionsBtn();
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
      saveDevicePreferencesToSupabase();
    });
    if (btnHexEl) btnHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.buttonColor = val;
        if (btnColorEl) btnColorEl.value = val;
        applyThemeColors();
        saveDevicePreferencesToSupabase();
      }
    });
    if (textColorEl) textColorEl.addEventListener('input', (e) => {
      state.textColor = e.target.value;
      if (textHexEl) textHexEl.value = e.target.value;
      applyThemeColors();
      saveDevicePreferencesToSupabase();
    });
    if (textHexEl) textHexEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.textColor = val;
        if (textColorEl) textColorEl.value = val;
        applyThemeColors();
        saveDevicePreferencesToSupabase();
      }
    });

    const archiveBtn = document.getElementById('archive-btn');
    if (archiveBtn) archiveBtn.addEventListener('click', openArchiveModal);

    const closeSeedRender = document.getElementById('close-seed-render');
    if (closeSeedRender) closeSeedRender.addEventListener('click', closeSeedRenderModal);
    const seedRenderModal = document.getElementById('seed-render-modal');
    if (seedRenderModal) seedRenderModal.addEventListener('click', (e) => {
      if (e.target.id === 'seed-render-modal') closeSeedRenderModal();
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
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      if (picker) picker.style.display = 'none';
      if (renderingDiv) renderingDiv.style.display = 'block';
    });
    const seedRenderDone = document.getElementById('seed-render-done');
    if (seedRenderDone) seedRenderDone.addEventListener('click', closeSeedRenderModal);
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
      saveState();
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
      showToast('Reflection saved');
      closeSeedRenderModal();
    });
    const seedRenderSearch = document.getElementById('seed-render-task-search');
    if (seedRenderSearch) seedRenderSearch.addEventListener('input', () => renderSeedTaskOptions(seedRenderSearch.value));
    const seedRenderSearchClear = document.getElementById('seed-render-task-search-clear');
    if (seedRenderSearchClear) seedRenderSearchClear.addEventListener('click', () => {
      const input = document.getElementById('seed-render-task-search');
      if (input) input.value = '';
      renderSeedTaskOptions('');
    });

    const closeArchive = document.getElementById('close-archive');
    if (closeArchive) closeArchive.addEventListener('click', () => {
      const m = document.getElementById('archive-modal');
      if (m) m.style.display = 'none';
    });

    const archiveModal = document.getElementById('archive-modal');
    if (archiveModal) archiveModal.addEventListener('click', (e) => {
      if (e.target.id === 'archive-modal') archiveModal.style.display = 'none';
    });

    const consistencyOpenFull = document.getElementById('consistency-open-full');
    if (consistencyOpenFull) consistencyOpenFull.addEventListener('click', () => {
      closeSidebar();
      openConsistencyPanel();
    });
    const consistencyBtn = document.getElementById('consistency-btn');
    if (consistencyBtn) consistencyBtn.addEventListener('click', openConsistencyPanel);
    const closeConsistency = document.getElementById('close-consistency');
    if (closeConsistency) closeConsistency.addEventListener('click', closeConsistencyPanel);

    const journalBtn = document.getElementById('journal-btn');
    if (journalBtn) journalBtn.addEventListener('click', openJournalPanel);
    const closeJournal = document.getElementById('close-journal');
    if (closeJournal) closeJournal.addEventListener('click', closeJournalPanel);

    document.querySelectorAll('.journal-nav-item').forEach(function(btn) {
      if (btn.id === 'journal-focus-btn') return;
      btn.addEventListener('click', function() {
        const tab = btn.dataset.tab;
        if (!tab) return;
        flushJournalDailySave();
        state.journalActiveTab = tab;
        document.querySelectorAll('.journal-nav-item').forEach(function(b) {
          if (b.dataset.tab) {
            b.classList.toggle('active', b.dataset.tab === tab);
            b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
          }
        });
        renderJournalPanel();
      });
    });

    const journalFocusBtn = document.getElementById('journal-focus-btn');
    if (journalFocusBtn) journalFocusBtn.addEventListener('click', function() {
      setJournalFocusMode(!state.journalFocusMode);
    });
    const journalExitFocus = document.getElementById('journal-exit-focus');
    if (journalExitFocus) journalExitFocus.addEventListener('click', function() {
      setJournalFocusMode(false);
      document.getElementById('journal-focus-btn').focus();
    });

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
        saveState();
        if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
        journalAddReflInput.value = '';
        if (journalAddReflForm) journalAddReflForm.style.display = 'none';
        renderJournalReflections();
        showToast('Reflection saved');
      });
    }

    function openRelationshipsPanel() {
      state.relationshipsDetailPersonId = null;
      var panel = document.getElementById('relationships-panel');
      if (!panel) return;
      panel.style.display = 'block';
      renderRelationshipsPanel();
    }

    function closeRelationshipsPanel() {
      state.relationshipsDetailPersonId = null;
      var panel = document.getElementById('relationships-panel');
      if (panel) panel.style.display = 'none';
    }

    function renderRelationshipsPanel() {
      var listView = document.getElementById('relationships-list-view');
      var detailView = document.getElementById('relationships-detail-view');
      var backBtn = document.getElementById('relationships-back');
      var headerH3 = document.querySelector('#relationships-header h3');
      if (state.relationshipsDetailPersonId) {
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        if (backBtn) backBtn.style.display = 'inline-block';
        if (headerH3) headerH3.style.display = 'none';
        renderRelationshipsDetail(state.relationshipsDetailPersonId);
      } else {
        if (listView) listView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        if (headerH3) headerH3.style.display = 'block';
        renderRelationshipsList();
      }
    }

    function renderRelationshipsList() {
      var container = document.getElementById('relationships-group-list');
      if (!container) return;
      var people = getPeople();
      var byGroup = {};
      PEOPLE_GROUPS.forEach(function(g) {
        byGroup[g.id] = people.filter(function(p) { return p.group === g.id; });
      });
      container.innerHTML = people.length === 0
        ? '<p class="empty-state">No people yet. Add someone to stay in touch.</p>'
        : PEOPLE_GROUPS.map(function(g) {
            var list = byGroup[g.id] || [];
            if (list.length === 0) return '';
            return '<div class="relationships-group-section"><h4 class="relationships-group-title">' + escapeHtml(g.label) + ' (' + list.length + ')</h4><div class="relationships-person-list">' +
              list.map(function(p) {
                var lastStr = p.lastConnected == null ? 'Never' : (function() {
                  var d = new Date(p.lastConnected);
                  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                })();
                var due = isOverdueToReconnect(p);
                return '<div class="relationships-person-row" data-person-id="' + escapeHtml(p.id) + '" role="button" tabindex="0">' +
                  '<span class="relationships-person-name">' + escapeHtml(p.name) + '</span>' +
                  '<span class="relationships-person-meta">Last connected: ' + escapeHtml(lastStr) + '</span>' +
                  (due ? ' <span class="relationships-due-badge">Due to reconnect</span>' : '') +
                  '</div>';
              }).join('') +
              '</div></div>';
          }).join('');
      container.querySelectorAll('.relationships-person-row').forEach(function(row) {
        row.addEventListener('click', function() {
          state.relationshipsDetailPersonId = row.dataset.personId;
          renderRelationshipsPanel();
        });
      });
    }

    function renderRelationshipsDetail(personId) {
      var content = document.getElementById('relationships-detail-content');
      if (!content) return;
      var person = getPerson(personId);
      if (!person) {
        state.relationshipsDetailPersonId = null;
        renderRelationshipsPanel();
        return;
      }
      var lastStr = person.lastConnected == null ? 'Never' : (function() {
        var d = new Date(person.lastConnected);
        return d.toLocaleDateString();
      })();
      var ruleStr = (person.reconnectRule && person.reconnectRule.interval) ? { '1w': 'Every week', '2w': 'Every 2 weeks', '1m': 'Every month', '3m': 'Every 3 months' }[person.reconnectRule.interval] || '—' : '—';
      var linked = (state.items || []).filter(function(i) { return !i.archived && i.personId === personId; });
      content.innerHTML = '<div class="relationships-detail-block">' +
        '<p><strong>' + escapeHtml(person.name) + '</strong></p>' +
        '<p>Group: ' + escapeHtml((PEOPLE_GROUPS.find(function(g) { return g.id === person.group; }) || {}).label || person.group) + '</p>' +
        '<p>Last connected: ' + escapeHtml(lastStr) + '</p>' +
        '<p>Reconnect: ' + escapeHtml(ruleStr) + '</p>' +
        (person.notes ? '<p>Notes: ' + escapeHtml(person.notes) + '</p>' : '') +
        '<button type="button" id="relationships-mark-connected" class="btn-primary btn-sm" data-person-id="' + escapeHtml(personId) + '">Mark connected</button>' +
        '</div>' +
        '<h4>Linked tasks</h4>' +
        (linked.length ? '<ul class="relationships-linked-tasks">' + linked.map(function(i) {
          return '<li><button type="button" class="btn-link relationships-open-task" data-id="' + escapeHtml(i.id) + '">' + escapeHtml((i.text || '').slice(0, 60)) + (i.text && i.text.length > 60 ? '…' : '') + '</button></li>';
        }).join('') + '</ul>' : '<p class="empty-state">No tasks linked.</p>') +
        '<div class="relationships-detail-actions">' +
        '<button type="button" id="relationships-delete-person" class="btn-secondary btn-sm" data-person-id="' + escapeHtml(personId) + '">Delete person</button>' +
        '</div>';
      var markBtn = document.getElementById('relationships-mark-connected');
      if (markBtn) markBtn.addEventListener('click', function() {
        updatePerson(personId, { lastConnected: Date.now() });
        renderRelationshipsDetail(personId);
        showToast('Marked connected');
      });
      content.querySelectorAll('.relationships-open-task').forEach(function(btn) {
        btn.addEventListener('click', function() {
          closeRelationshipsPanel();
          openEditModal(btn.dataset.id);
        });
      });
      var delBtn = document.getElementById('relationships-delete-person');
      if (delBtn) delBtn.addEventListener('click', function() {
        var count = linked.length;
        if (!window.confirm('Delete this person? ' + (count ? count + ' task(s) will no longer be linked to them.' : ''))) return;
        deletePerson(personId);
        state.relationshipsDetailPersonId = null;
        renderRelationshipsPanel();
        renderColumns();
        showToast('Person removed');
      });
    }

    var relAddBtn = document.getElementById('relationships-add-person');
    var relAddForm = document.getElementById('relationships-add-form');
    var relAddName = document.getElementById('relationships-add-name');
    var relAddGroup = document.getElementById('relationships-add-group');
    var relAddLast = document.getElementById('relationships-add-last-connected');
    var relAddReconnect = document.getElementById('relationships-add-reconnect');
    var relAddNotes = document.getElementById('relationships-add-notes');
    var relAddSave = document.getElementById('relationships-add-save');
    var relAddCancel = document.getElementById('relationships-add-cancel');
    if (relAddBtn && relAddForm) relAddBtn.addEventListener('click', function() {
      relAddForm.style.display = 'block';
      if (relAddName) { relAddName.value = ''; relAddName.focus(); }
      if (relAddLast) relAddLast.value = '';
      if (relAddReconnect) relAddReconnect.value = '';
      if (relAddNotes) relAddNotes.value = '';
    });
    if (relAddCancel && relAddForm) relAddCancel.addEventListener('click', function() { relAddForm.style.display = 'none'; });
    if (relAddSave && relAddName) relAddSave.addEventListener('click', function() {
      var name = (relAddName.value || '').trim();
      if (!name) return;
      var group = relAddGroup && relAddGroup.value ? relAddGroup.value : 'friends';
      var lastVal = relAddLast && relAddLast.value ? relAddLast.value : null;
      var lastMs = lastVal ? (new Date(lastVal)).setHours(0, 0, 0, 0) : null;
      var reconnectVal = relAddReconnect && relAddReconnect.value ? relAddReconnect.value : null;
      var reconnectRule = reconnectVal ? { interval: reconnectVal } : null;
      var notes = relAddNotes && relAddNotes.value ? relAddNotes.value.trim() : null;
      addPerson({ name: name, group: group, lastConnected: lastMs, reconnectRule: reconnectRule, notes: notes });
      relAddForm.style.display = 'none';
      relAddName.value = '';
      renderRelationshipsList();
      showToast('Person added');
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
    });
    var relBack = document.getElementById('relationships-back');
    if (relBack) relBack.addEventListener('click', function() {
      state.relationshipsDetailPersonId = null;
      renderRelationshipsPanel();
    });
    var closeRelationships = document.getElementById('close-relationships');
    if (closeRelationships) closeRelationships.addEventListener('click', closeRelationshipsPanel);

    var relationshipsBtn = document.getElementById('relationships-btn');
    if (relationshipsBtn) relationshipsBtn.addEventListener('click', openRelationshipsPanel);

    const analyticsBtn = document.getElementById('analytics-btn');
    if (analyticsBtn) analyticsBtn.addEventListener('click', openAnalytics);

    const emailTriageBtn = document.getElementById('email-triage-btn');
    if (emailTriageBtn) emailTriageBtn.addEventListener('click', openEmailTriage);

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
    if (exportBtn) exportBtn.addEventListener('click', exportBackup);

    const importBtn = document.getElementById('import-btn');
    if (importBtn) importBtn.addEventListener('click', () => document.getElementById('import-input').click());

    const importInput = document.getElementById('import-input');
    if (importInput) importInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) importBackup(f);
      e.target.value = '';
    });

    const talkInput = document.getElementById('talk-about-input');
    if (talkInput) talkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTalkAbout(); }
    });

    const talkAddBtn = document.getElementById('talk-about-add-btn');
    if (talkAddBtn) talkAddBtn.addEventListener('click', addTalkAbout);

    const hint = document.getElementById('priority-hint');
    if (hint) hint.addEventListener('click', () => {
      alert('1. Is someone else waiting? → Critical\n2. Does money/reputation depend on it? → High\n3. Would you feel relieved dropping it? → Low (else Medium)');
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
        applySmartFields();
      };
      recognition.onerror = recognition.onend = () => { micBtn.textContent = '🎤'; };
    }
  }

  function openLinkPartnerModal() {
    const modal = document.getElementById('link-partner-modal');
    const actions = document.querySelector('.link-partner-actions');
    const created = document.getElementById('link-pair-created');
    if (modal) modal.style.display = 'flex';
    if (actions) actions.style.display = 'flex';
    if (created) created.style.display = 'none';
  }

  function closeLinkPartnerModal() {
    const modal = document.getElementById('link-partner-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindLinkPartnerModal() {
    const modal = document.getElementById('link-partner-modal');
    const closeBtn = document.getElementById('close-link-partner');
    const createBtn = document.getElementById('link-create-btn');
    const joinBtn = document.getElementById('link-join-btn');
    const continueBtn = document.getElementById('link-continue-btn');
    const actions = document.querySelector('.link-partner-actions');
    const created = document.getElementById('link-pair-created');
    const codeEl = document.getElementById('link-pair-code');
    const joinInput = document.getElementById('link-join-input');

    if (closeBtn) closeBtn.addEventListener('click', closeLinkPartnerModal);
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target.id === 'link-partner-modal') closeLinkPartnerModal();
    });

    if (createBtn) createBtn.addEventListener('click', async () => {
      state.pairId = window.talkAbout ? window.talkAbout.generatePairId() : 'demo' + Date.now().toString(36).slice(-6);
      state.addedBy = 'Talia';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      if (actions) actions.style.display = 'none';
      if (created) created.style.display = 'block';
      if (codeEl) codeEl.textContent = state.pairId;
    });

    if (continueBtn) continueBtn.addEventListener('click', async () => {
      closeLinkPartnerModal();
      await showMainApp();
    });

    if (joinBtn) joinBtn.addEventListener('click', async () => {
      const code = (joinInput && joinInput.value) ? joinInput.value.trim().toLowerCase() : '';
      if (!code) { showToast('Enter a pair code'); return; }
      const asTalia = document.getElementById('link-join-talia');
      state.pairId = code;
      state.addedBy = (asTalia && asTalia.checked) ? 'Talia' : 'Garren';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      closeLinkPartnerModal();
      await showMainApp();
    });

    if (joinInput) joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('link-join-btn').click();
    });
  }

  function bindPairSetup() {
    const createBtn = document.getElementById('create-pair-btn');
    if (createBtn) createBtn.addEventListener('click', async () => {
      state.pairId = window.talkAbout ? window.talkAbout.generatePairId() : 'demo' + Date.now().toString(36).slice(-6);
      state.addedBy = 'Talia';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      document.getElementById('pair-created').style.display = 'block';
      document.querySelector('.pair-actions').style.display = 'none';
      document.getElementById('pair-code-display').textContent = state.pairId;
    });

    const continueBtn = document.getElementById('continue-after-create');
    if (continueBtn) continueBtn.addEventListener('click', async () => {
      document.getElementById('pair-created').style.display = 'none';
      await showMainApp();
      bindEvents();
    });

    const joinBtn = document.getElementById('join-pair-btn');
    if (joinBtn) joinBtn.addEventListener('click', async () => {
      const input = document.getElementById('join-code-input');
      const code = (input && input.value) ? input.value.trim().toLowerCase() : '';
      if (!code) {
        showToast('Enter a pair code');
        return;
      }
      const asTalia = document.getElementById('join-as-talia');
      state.pairId = code;
      state.addedBy = (asTalia && asTalia.checked) ? 'Talia' : 'Garren';
      state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'dev' + Date.now().toString(36).slice(-6);
      savePairState();
      saveDeviceSyncState();
      if (window.talkAbout) {
        try { await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice()); } catch (e) {}
      }
      document.getElementById('pair-setup').style.display = 'none';
      await showMainApp();
      bindEvents();
    });

    const joinInput = document.getElementById('join-code-input');
    if (joinInput) joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('join-pair-btn').click();
    });
  }

  function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    banner.style.display = navigator.onLine ? 'none' : 'block';
  }

  async function init() {
    window.addEventListener('online', () => {
      updateOfflineBanner();
      showToast('Back online — sync resumed');
      if (window.talkAbout && state.deviceSyncId) saveDevicePreferencesToSupabase();
    });
    window.addEventListener('offline', updateOfflineBanner);
    updateOfflineBanner();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update();
          navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
        })
        .catch((err) => {
          console.warn('Service worker registration failed', err);
          showToast('Offline mode limited — refresh when online');
        });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => reg.update());
        }
      });
    }
    loadPairState();
    loadDeviceSyncState();
    if (state.pairId || hasChosenSolo() || state.deviceSyncId) {
      document.getElementById('entry-screen').style.display = 'none';
      document.getElementById('pair-setup').style.display = 'none';
      await showMainApp();
      bindEvents();
    } else {
      document.getElementById('entry-screen').style.display = 'block';
      document.getElementById('pair-setup').style.display = 'none';
      document.getElementById('main-app').style.display = 'none';
      document.getElementById('floating-buttons').style.display = 'none';
      bindEntryScreen();
    }
  }

  function bindEntryScreen() {
    const soloBtn = document.getElementById('entry-solo-btn');
    const coupleBtn = document.getElementById('entry-couple-btn');
    const linkBtn = document.getElementById('entry-link-btn');
    const linkForm = document.getElementById('entry-link-form');
    const linkCode = document.getElementById('entry-link-code');
    const linkSubmit = document.getElementById('entry-link-submit');
    const linkCancel = document.getElementById('entry-link-cancel');
    if (linkBtn) linkBtn.addEventListener('click', () => {
      if (linkForm) linkForm.style.display = 'block';
      if (linkCode) { linkCode.value = ''; linkCode.focus(); }
    });
    if (linkCancel) linkCancel.addEventListener('click', () => {
      if (linkForm) linkForm.style.display = 'none';
    });
    if (linkSubmit) linkSubmit.addEventListener('click', async () => {
      const code = (linkCode && linkCode.value) ? linkCode.value.trim().toLowerCase().replace(/\s/g, '') : '';
      if (!code || code.length < 6) {
        showToast('Enter a valid sync code (from your other device)');
        return;
      }
      state.deviceSyncId = code;
      saveDeviceSyncState();
      if (linkForm) linkForm.style.display = 'none';
      document.getElementById('entry-screen').style.display = 'none';
      try {
        if (window.talkAbout) {
          const prefs = await window.talkAbout.getDevicePreferences(state.deviceSyncId);
          if (!prefs?.error) applyDevicePreferencesToState(prefs);
          saveState();
        }
        showToast('Device linked. If settings look wrong, check the code.');
      } catch (e) {
        showToast('Device linked. If settings look wrong, check the code.');
      }
      await showMainApp();
      bindEvents();
    });
    if (linkCode) linkCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('entry-link-submit').click();
    });
    if (soloBtn) soloBtn.addEventListener('click', async () => {
      setChosenSolo();
      if (!state.deviceSyncId) {
        state.deviceSyncId = window.talkAbout ? window.talkAbout.generatePairId() : 'solo' + Date.now().toString(36).slice(-6);
        saveDeviceSyncState();
        if (window.talkAbout) {
          try {
            await window.talkAbout.saveDevicePreferences(state.deviceSyncId, getPreferencesForDevice());
          } catch (e) { console.warn('Seed failed', e); }
        }
      }
      document.getElementById('entry-screen').style.display = 'none';
      await showMainApp();
      bindEvents();
    });
    if (coupleBtn) coupleBtn.addEventListener('click', () => {
      document.getElementById('entry-screen').style.display = 'none';
      document.getElementById('pair-setup').style.display = 'block';
      bindPairSetup();
    });
  }

  bindLinkPartnerModal();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(e => console.error('Init failed', e)));
  } else {
    init().catch(e => console.error('Init failed', e));
  }
})();
