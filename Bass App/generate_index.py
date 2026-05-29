#!/usr/bin/env python3
"""Regenerate index.html — multi-discipline music production reference."""

import json
from pathlib import Path

from content_data import (
    CHARACTER,
    CONTENT_COUNTS,
    PROBLEMS,
    REFERENCE,
    STYLES,
    TECHNIQUES,
    VOCAL,
    WRITING,
)
from drums_content import (
    DRUMS_CHARACTER,
    DRUMS_CONTENT_COUNTS,
    DRUMS_PROBLEMS,
    DRUMS_SONG_QUESTIONS,
    DRUMS_STYLES,
    DRUMS_TECHNIQUES,
)

ROOT = Path(__file__).parent
OUT = ROOT / "index.html"

# ---------------------------------------------------------------------------
# Discipline zone definitions
# ---------------------------------------------------------------------------

BASS_ZONES = [
    {'id': 'start-here', 'label': 'Start Here', 'layout': 'start-here'},
    {'id': 'styles', 'label': 'Styles', 'dataset': 'STYLES', 'layout': 'card-grid', 'filters': True},
    {'id': 'techniques', 'label': 'Techniques', 'dataset': 'TECHNIQUES', 'layout': 'card-grid', 'filters': True, 'categoryFilter': True},
    {'id': 'character', 'label': 'Character', 'dataset': 'CHARACTER', 'layout': 'character-matrix'},
    {'id': 'foundations', 'label': 'Foundations', 'dataset': 'PRINCIPLES', 'layout': 'foundations'},
    {'id': 'writing', 'label': 'Writing', 'dataset': 'WRITING', 'layout': 'accordion'},
    {'id': 'fix-it', 'label': 'Fix It', 'dataset': 'PROBLEMS', 'layout': 'card-grid', 'filters': True},
    {'id': 'reference', 'label': 'Reference', 'dataset': 'REFERENCE', 'layout': 'timeline'},
    {'id': 'vocal-bass', 'label': 'Vocal + Bass', 'dataset': 'VOCAL', 'layout': 'card-grid'},
]

DRUMS_ZONES = [
    {'id': 'start-here', 'label': 'Start Here', 'layout': 'start-here'},
    {'id': 'styles', 'label': 'Styles', 'dataset': 'STYLES', 'layout': 'card-grid', 'filters': True},
    {'id': 'techniques', 'label': 'Techniques', 'dataset': 'TECHNIQUES', 'layout': 'card-grid', 'filters': True, 'categoryFilter': True},
    {'id': 'character', 'label': 'Character', 'dataset': 'CHARACTER', 'layout': 'character-matrix'},
    {'id': 'foundations', 'label': 'Foundations', 'dataset': 'PRINCIPLES', 'layout': 'foundations'},
    {'id': 'fix-it', 'label': 'Fix It', 'dataset': 'PROBLEMS', 'layout': 'card-grid', 'filters': True},
]

BASS_SONG_QUESTIONS = [
    {'id': 'tempo', 'label': 'Tempo range', 'options': ['Under 80 BPM', '80–100 BPM', '100–120 BPM', '120–135 BPM', '135+ BPM']},
    {'id': 'density', 'label': 'Arrangement density', 'options': ['Very sparse (1–4 elements)', 'Medium (5–8 elements)', 'Dense (9+ elements, full band feel)']},
    {'id': 'vocal', 'label': 'Vocal register & style', 'options': ['Low and intimate', 'Mid-range expressive', 'High or powerful', 'No vocal (instrumental)']},
    {'id': 'tone', 'label': 'Emotional tone', 'options': ['Vulnerable and intimate', 'Warm and soulful', 'Euphoric and anthemic', 'Defiant and intense', 'Melancholy and cinematic']},
]

# ---------------------------------------------------------------------------
# App JS
# ---------------------------------------------------------------------------

APP_JS = r"""
/* @region CONFIG */
const PRODUCER_SETUP = 'Ableton Live, NI Massive, NI Twin 3, and Waves Pro Suite';
window.__PROD_REF_VERSION__ = '2.0.0';

const DISCIPLINES = [
  { id: 'bass', label: 'Bass' },
  { id: 'drums', label: 'Drums' },
];

const DETAIL_SCHEMA = {
  style: [
    { key: 'sound', label: 'Sound' },
    { key: 'emotion', label: 'Emotion' },
    { key: 'whenUse', label: 'When to use' },
    { key: 'whenNot', label: 'When not to use' },
    { key: 'build', label: 'Build', quick: true },
    { key: 'signalChain', label: 'Signal chain', quick: true },
    { key: 'keyTip', label: 'Key tip' },
    { key: 'references', label: 'References' },
  ],
  technique: [
    { key: 'whatItDoes', label: 'What it does' },
    { key: 'whenUse', label: 'When to use' },
    { key: 'howToDo', label: 'How to do it' },
    { key: 'wavesPlugins', label: 'Waves plugins' },
    { key: 'keyTip', label: 'Key tip' },
  ],
  character: [
    { key: 'description', label: 'Description' },
    { key: 'why', label: "Why you'd want it" },
    { key: 'how', label: 'How to get there' },
    { key: 'reference', label: 'Reference' },
    { key: 'helper', label: 'If you don\'t know' },
  ],
  writing: [{ key: 'body', label: 'Guide' }],
  problem: [
    { key: 'cause', label: 'Cause' },
    { key: 'fixSteps', label: 'Fix steps', list: true },
  ],
  reference: [{ key: 'body', label: 'Step' }],
  vocal: [{ key: 'body', label: 'Guide' }],
  principle: [
    { key: 'explanation', label: 'What it is' },
    { key: 'whyItMatters', label: 'Why it matters' },
    { key: 'misconception', label: 'Common misconception' },
    { key: 'hearIt', label: 'Hear it' },
  ],
};

/* @endregion */

/* @region DATA */
const DISC_DATA = __DISC_DATA__;

// Mutable discipline-level vars — swapped by setDiscipline()
let STYLES = [];
let TECHNIQUES = [];
let CHARACTER = [];
let WRITING = [];
let PROBLEMS = [];
let REFERENCE = [];
let VOCAL = [];
let PRINCIPLES = [];
let DATASETS = {};
let ZONES = [];
let SONG_QUESTIONS = [];
/* @endregion */

/* @region CORE */
const state = {
  discipline: 'bass',
  quickMode: false,
  songAnswers: null,
  activeFilters: {},
  activeCategory: {},
  mounted: new Set(),
};

const DEBUG = new URLSearchParams(location.search).has('debug');

function log(...args) { if (DEBUG) console.log('[ProdRef]', ...args); }

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function getRecord(dataset, id) {
  const list = DATASETS[dataset];
  return list?.find((r) => r.id === id) ?? null;
}

function getCharacterPair(pairId) {
  return CHARACTER.filter((r) => r.meta?.pairId === pairId);
}

function assertContentCounts() {
  const disc = DISC_DATA[state.discipline];
  if (!disc) return;
  const manifest = disc.manifest;
  const actual = {
    styles: STYLES.length,
    techniques: TECHNIQUES.length,
    character: CHARACTER.length,
    writing: WRITING.length,
    problems: PROBLEMS.length,
    reference: REFERENCE.length,
    vocal: VOCAL.length,
  };
  for (const [k, expected] of Object.entries(manifest)) {
    if (actual[k] !== expected) {
      const msg = `[${state.discipline}] Manifest mismatch ${k}: expected ${expected}, got ${actual[k]}`;
      console.error(msg);
      if (DEBUG) throw new Error(msg);
    }
  }
  console.log(`Content manifest OK [${state.discipline}]`);
}

function initProtocolGate() {
  const isFile = location.protocol === 'file:';
  const banner = qs('#protocol-banner');
  if (banner) banner.hidden = !isFile;
  return !isFile;
}

function setDiscipline(id) {
  const disc = DISC_DATA[id];
  if (!disc) return;
  state.discipline = id;
  localStorage.setItem('prodRef_discipline', id);
  STYLES = disc.datasets.STYLES || [];
  TECHNIQUES = disc.datasets.TECHNIQUES || [];
  CHARACTER = disc.datasets.CHARACTER || [];
  WRITING = disc.datasets.WRITING || [];
  PROBLEMS = disc.datasets.PROBLEMS || [];
  REFERENCE = disc.datasets.REFERENCE || [];
  VOCAL = disc.datasets.VOCAL || [];
  PRINCIPLES = disc.datasets.PRINCIPLES || [];
  DATASETS = { STYLES, TECHNIQUES, CHARACTER, WRITING, PROBLEMS, REFERENCE, VOCAL, PRINCIPLES };
  ZONES = disc.zones;
  SONG_QUESTIONS = disc.songQuestions;
  state.mounted = new Set();
  state.activeFilters = {};
  state.activeCategory = {};
  assertContentCounts();
  wireHeader();
  wireNav();
  mountZone('start-here');
  log('discipline set to', id);
}
/* @endregion */

/* @region RENDER */
function allFiltersForDataset(dataset) {
  const list = DATASETS[dataset] || [];
  return [...new Set(list.flatMap((r) => r.filters || []))].sort();
}

function displayLiner(text) {
  return (text || '').replace(/^One-liner:\s*/i, '').replace(/^Tag:\s*/i, '');
}

function renderCard(record) {
  const tag = record.meta?.tag || record.meta?.category || '';
  return `<article class="card" data-action="open-detail" data-id="${escapeHtml(record.id)}" data-dataset="${escapeHtml(record._dataset || '')}" tabindex="0">
    ${tag ? `<span class="card__tag">${escapeHtml(tag)}</span>` : ''}
    <h3 class="card__title">${escapeHtml(record.title)}</h3>
    <p class="card__liner">${escapeHtml(displayLiner(record.oneLiner))}</p>
  </article>`;
}

function renderCardGrid(zone, container) {
  const list = (DATASETS[zone.dataset] || []).map((r) => ({ ...r, _dataset: zone.dataset }));
  const filters = state.activeFilters[zone.id] || new Set();
  const cat = state.activeCategory?.[zone.id];
  const grid = qs('.zone-grid', container) || container;
  const filtered = list.filter((r) => {
    if (cat && r.meta?.category !== cat) return false;
    if (filters.size && !(r.filters || []).some((f) => filters.has(f))) return false;
    return true;
  });
  grid.innerHTML = filtered.length
    ? filtered.map(renderCard).join('')
    : '<p class="muted">No cards match filters.</p>';
}

function renderFilterBar(zone, container) {
  if (!zone.filters) return;
  const bar = qs('.zone-filters', container);
  if (!bar) return;
  const filters = allFiltersForDataset(zone.dataset);
  const active = state.activeFilters[zone.id] || new Set();
  bar.innerHTML = `<button type="button" class="chip ${active.size === 0 ? 'chip--on' : ''}" data-action="filter" data-zone="${zone.id}" data-filter="">All</button>` +
    filters.map((f) => `<button type="button" class="chip ${active.has(f) ? 'chip--on' : ''}" data-action="filter" data-zone="${zone.id}" data-filter="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('');
}

function renderCategoryBar(zone, container) {
  if (!zone.categoryFilter) return;
  const bar = qs('.zone-categories', container);
  if (!bar) return;
  const cats = [...new Set((DATASETS[zone.dataset] || []).map((r) => r.meta?.category).filter(Boolean))];
  const active = state.activeCategory?.[zone.id];
  bar.innerHTML = `<button type="button" class="chip ${!active ? 'chip--on' : ''}" data-action="category" data-zone="${zone.id}" data-category="">All</button>` +
    cats.map((c) => `<button type="button" class="chip ${active === c ? 'chip--on' : ''}" data-action="category" data-zone="${zone.id}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
}

function renderDetailSections(record) {
  const schema = DETAIL_SCHEMA[record.type] || [];
  return schema
    .map((field) => {
      let val = record.sections?.[field.key];
      if (val == null || val === '') return '';
      const quickAttr = field.quick ? ' data-quick="true"' : '';
      let inner;
      if (field.list && Array.isArray(val)) {
        inner = `<ol>${val.map((li) => `<li>${escapeHtml(li)}</li>`).join('')}</ol>`;
      } else {
        inner = `<div class="detail-section__body">${escapeHtml(String(val)).replace(/\n/g, '<br>')}</div>`;
      }
      return `<section class="detail-section" ${quickAttr}><h3 class="detail-section__label">${escapeHtml(field.label)}</h3>${inner}</section>`;
    })
    .join('');
}

function openDetail(record, dataset) {
  const dlg = qs('#detail-overlay');
  qs('#detail-title').textContent = record.title;
  const tag = record.meta?.tag || record.meta?.category || record.meta?.group || '';
  const tagEl = qs('#detail-tag');
  tagEl.textContent = tag;
  tagEl.hidden = !tag;
  qs('#detail-body').innerHTML = record.oneLiner
    ? `<p class="detail-liner">${escapeHtml(record.oneLiner)}</p>${renderDetailSections(record)}`
    : renderDetailSections(record);
  dlg.dataset.dataset = dataset || '';
  dlg.dataset.id = record.id;
  dlg.showModal();
}

function openCharacterPair(pairId) {
  const poles = getCharacterPair(pairId);
  if (!poles.length) return;
  const left = poles.find((p) => p.meta?.pole === 'left') || poles[0];
  const right = poles.find((p) => p.meta?.pole === 'right') || poles[1];
  const dlg = qs('#detail-overlay');
  const group = left.meta?.group || '';
  qs('#detail-title').textContent = `${left.meta?.poleName || 'Left'} ↔ ${right.meta?.poleName || 'Right'}`;
  qs('#detail-tag').textContent = group;
  qs('#detail-tag').hidden = !group;
  const helper = left.sections?.helper
    ? `<section class="detail-section detail-section--helper"><h3 class="detail-section__label">If you don't know</h3><div class="detail-section__body">${escapeHtml(left.sections.helper)}</div></section>`
    : '';
  qs('#detail-body').innerHTML =
    `<div class="character-detail">
      <div class="character-pole"><h4>${escapeHtml(left.title)}</h4>${renderDetailSections(left)}</div>
      <div class="character-pole"><h4>${escapeHtml(right.title)}</h4>${renderDetailSections(right)}</div>
    </div>${helper}`;
  dlg.showModal();
}

function renderCharacterMatrix(container) {
  const pairs = [...new Set(CHARACTER.map((r) => r.meta?.pairId))];
  const byGroup = {};
  for (const pairId of pairs) {
    const poles = getCharacterPair(pairId);
    const group = poles[0]?.meta?.group || 'Other';
    if (!byGroup[group]) byGroup[group] = [];
    const left = poles.find((p) => p.meta?.pole === 'left') || poles[0];
    const right = poles.find((p) => p.meta?.pole === 'right') || poles[1];
    byGroup[group].push({ pairId, left, right });
  }
  container.innerHTML = Object.entries(byGroup)
    .map(
      ([group, rows]) => `
    <div class="char-group"><h3 class="char-group__title">${escapeHtml(group)}</h3>
    ${rows
      .map(
        (row) => `
      <div class="char-pair" data-action="open-pair" data-pair="${escapeHtml(row.pairId)}" role="button" tabindex="0">
        <span class="char-pole char-pole--left">${escapeHtml(row.left.meta?.poleName || row.left.title)}</span>
        <span class="char-spectrum"></span>
        <span class="char-pole char-pole--right">${escapeHtml(row.right.meta?.poleName || row.right.title)}</span>
      </div>`
      )
      .join('')}
    </div>`
    )
    .join('');
}

function renderAccordion(zone, container) {
  const list = DATASETS[zone.dataset] || [];
  container.innerHTML = list
    .map(
      (r, i) => `
    <details class="accordion" ${i === 0 ? 'open' : ''}>
      <summary>${escapeHtml(r.title)}</summary>
      <div class="accordion__body">${escapeHtml(r.sections?.body || '').replace(/\n/g, '<br>')}</div>
    </details>`
    )
    .join('');
}

function renderTimeline(zone, container) {
  const list = DATASETS[zone.dataset] || [];
  container.innerHTML = `<ol class="timeline">${list
    .map(
      (r, i) => `
    <li class="timeline__item">
      <span class="timeline__num">${i + 1}</span>
      <div class="timeline__content"><h3>${escapeHtml(r.title)}</h3><div>${escapeHtml(r.sections?.body || '').replace(/\n/g, '<br>')}</div></div>
    </li>`
    )
    .join('')}</ol>`;
}

function renderFoundations(zone, container) {
  const list = DATASETS[zone.dataset] || [];
  if (!list.length) {
    container.innerHTML = '<p class="muted foundations-empty">Foundations content is added as the knowledge base grows. Check back after running the pipeline.</p>';
    return;
  }
  container.innerHTML = list.map((r, i) => `
    <details class="accordion" ${i === 0 ? 'open' : ''}>
      <summary>${escapeHtml(r.title)}</summary>
      <div class="accordion__body foundations-body">
        ${r.oneLiner ? `<p class="detail-liner">${escapeHtml(r.oneLiner)}</p>` : ''}
        ${r.sections?.explanation ? `<div class="detail-section"><h4 class="detail-section__label">What it is</h4><p class="detail-section__body">${escapeHtml(r.sections.explanation).replace(/\n/g, '<br>')}</p></div>` : ''}
        ${r.sections?.whyItMatters ? `<div class="detail-section"><h4 class="detail-section__label">Why it matters</h4><p class="detail-section__body">${escapeHtml(r.sections.whyItMatters).replace(/\n/g, '<br>')}</p></div>` : ''}
        ${r.sections?.misconception ? `<div class="detail-section detail-section--helper"><h4 class="detail-section__label">Common misconception</h4><p class="detail-section__body">${escapeHtml(r.sections.misconception).replace(/\n/g, '<br>')}</p></div>` : ''}
        ${r.sections?.hearIt ? `<div class="detail-section"><h4 class="detail-section__label">Hear it</h4><p class="detail-section__body">${escapeHtml(r.sections.hearIt).replace(/\n/g, '<br>')}</p></div>` : ''}
      </div>
    </details>
  `).join('');
}

function renderSongForm(container, onSubmitId) {
  container.innerHTML = `
    <form class="song-form" id="${onSubmitId}">
      ${SONG_QUESTIONS.map(
        (q) => `
        <label class="field">
          <span class="field__label">${escapeHtml(q.label)}</span>
          <select name="${q.id}" required>
            <option value="">Select…</option>
            ${q.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
          </select>
        </label>`
      ).join('')}
      <button type="submit" class="btn btn--primary">Get recommendation</button>
    </form>`;
}

function renderStartHereResult(container, result) {
  if (!result || !result.byType || Object.keys(result.byType).length === 0) {
    container.innerHTML = `
      <div class="start-result start-result--empty">
        <p>No matching records yet — the knowledge base grows as research is added to the pipeline.</p>
        <p class="muted" style="margin-top:var(--space-xs)">In the meantime, explore the Styles, Techniques, and Character zones directly.</p>
      </div>`;
    return;
  }
  const typeOrder = ['style', 'technique', 'character', 'principle'];
  const typeLabels = { style: 'Style', technique: 'Techniques', character: 'Character', principle: 'Foundations' };
  let html = '<article class="start-result">';
  for (const type of typeOrder) {
    const records = result.byType[type];
    if (!records || !records.length) continue;
    html += `<section class="api-block">
      <h4>${escapeHtml(typeLabels[type] || type)}</h4>
      <div class="start-result__cards">
        ${records.map((r) => `
          <button type="button" class="start-result__card"
                  data-action="open-detail"
                  data-id="${escapeHtml(r.id)}"
                  data-dataset="${escapeHtml(r._dataset || '')}">
            <strong class="start-result__card-title">${escapeHtml(r.title)}</strong>
            <span class="start-result__card-liner">${escapeHtml(r.oneLiner || '')}</span>
          </button>`).join('')}
      </div>
    </section>`;
  }
  html += '</article>';
  container.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Start Here scoring engine — pure JS, no API calls
// ---------------------------------------------------------------------------

function scoreRecord(record, answers) {
  const ctx = record.context;
  if (!ctx || typeof ctx !== 'object') return 0;
  let score = 0;
  const answerMap = {};
  for (const [k, v] of Object.entries(answers || {})) {
    answerMap[k] = (v || '').toLowerCase();
  }
  for (const [dim, tags] of Object.entries(ctx)) {
    if (!Array.isArray(tags) || !tags.length) continue;
    const answer = answerMap[dim] || '';
    if (!answer) continue;
    // Score 1 point per dimension that has any keyword match
    for (const tag of tags) {
      const words = tag.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 2);
      if (words.some((w) => answer.includes(w))) {
        score += 1;
        break; // One match per dimension
      }
    }
  }
  return score;
}

function runStartHereScoring(answers) {
  const pool = [
    ...STYLES.map((r) => ({ ...r, _dataset: 'STYLES' })),
    ...TECHNIQUES.map((r) => ({ ...r, _dataset: 'TECHNIQUES' })),
    // Only show character poles that represent a full pair concept (skip right-pole dupes in results)
    ...CHARACTER.filter((r) => !r.meta?.pole || r.meta.pole !== 'right').map((r) => ({ ...r, _dataset: 'CHARACTER' })),
    ...PRINCIPLES.map((r) => ({ ...r, _dataset: 'PRINCIPLES' })),
  ];
  const scored = pool
    .map((r) => ({ record: r, score: scoreRecord(r, answers) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const byType = {};
  for (const { record } of scored) {
    const type = record.type;
    if (!byType[type]) byType[type] = [];
    if (byType[type].length < 3) byType[type].push(record);
  }
  return { byType, total: scored.length };
}

function mountZone(zoneId) {
  if (state.mounted.has(zoneId)) return;
  const zone = ZONES.find((z) => z.id === zoneId);
  const section = qs(`#zone-${zoneId}`);
  if (!zone || !section) return;

  if (zone.layout === 'card-grid') {
    renderFilterBar(zone, section);
    renderCategoryBar(zone, section);
    renderCardGrid(zone, section);
  } else if (zone.layout === 'character-matrix') {
    renderCharacterMatrix(qs('.zone-body', section));
  } else if (zone.layout === 'accordion') {
    renderAccordion(zone, qs('.zone-body', section));
  } else if (zone.layout === 'timeline') {
    renderTimeline(zone, qs('.zone-body', section));
  } else if (zone.layout === 'start-here') {
    renderSongForm(qs('.zone-body', section), 'start-here-form');
  } else if (zone.layout === 'foundations') {
    renderFoundations(zone, qs('.zone-body', section));
  }

  section.dataset.mounted = 'true';
  state.mounted.add(zoneId);
  log('mounted', zoneId);
}

/* @endregion */

/* @region INIT */
function handleClick(e) {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;

  if (action === 'set-discipline') {
    setDiscipline(t.dataset.disc);
  } else if (action === 'open-detail') {
    const rec = getRecord(t.dataset.dataset, t.dataset.id);
    if (rec) openDetail(rec, t.dataset.dataset);
  } else if (action === 'open-pair') {
    openCharacterPair(t.dataset.pair);
  } else if (action === 'filter') {
    const zoneId = t.dataset.zone;
    const f = t.dataset.filter;
    if (!state.activeFilters[zoneId]) state.activeFilters[zoneId] = new Set();
    const set = state.activeFilters[zoneId];
    if (!f) set.clear();
    else {
      if (set.has(f)) set.delete(f);
      else set.add(f);
    }
    const zone = ZONES.find((z) => z.id === zoneId);
    mountZone(zoneId);
    renderFilterBar(zone, qs(`#zone-${zoneId}`));
    renderCardGrid(zone, qs(`#zone-${zoneId}`));
  } else if (action === 'category') {
    const zoneId = t.dataset.zone;
    if (!state.activeCategory) state.activeCategory = {};
    state.activeCategory[zoneId] = t.dataset.category || null;
    const zone = ZONES.find((z) => z.id === zoneId);
    mountZone(zoneId);
    renderCategoryBar(zone, qs(`#zone-${zoneId}`));
    renderCardGrid(zone, qs(`#zone-${zoneId}`));
  } else if (action === 'nav-zone') {
    const zoneId = t.dataset.zone;
    mountZone(zoneId);
    qs(`#zone-${zoneId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (action === 'toggle-quick') {
    state.quickMode = !state.quickMode;
    document.body.classList.toggle('quick-mode', state.quickMode);
    t.setAttribute('aria-pressed', String(state.quickMode));
  } else if (action === 'close-detail') {
    qs('#detail-overlay')?.close();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    qs('#detail-overlay')?.open && qs('#detail-overlay').close();
  }
}

function handleHash() {
  const raw = (location.hash || '').replace('#', '');
  const id = raw.startsWith('zone-') ? raw.slice(5) : raw;
  if (id && ZONES.find((z) => z.id === id)) mountZone(id);
}

function wireHeader() {
  const nav = qs('#discipline-nav');
  if (!nav) return;
  nav.innerHTML = DISCIPLINES.map((d) =>
    `<button type="button" class="disc-tab ${state.discipline === d.id ? 'disc-tab--on' : ''}" data-action="set-discipline" data-disc="${d.id}">${escapeHtml(d.label)}</button>`
  ).join('');
}

function wireSessionStrip() {
  ['ctx-bpm', 'ctx-key', 'ctx-genre'].forEach((id) => {
    const el = qs(`#${id}`);
    if (!el) return;
    el.value = localStorage.getItem(`prodRef_${id}`) || '';
    el.addEventListener('input', () => localStorage.setItem(`prodRef_${id}`, el.value));
  });
}

function wireNav() {
  const nav = qs('#main-nav');
  nav.innerHTML =
    ZONES.map(
      (z) => `<a class="nav__link" href="#zone-${z.id}" data-action="nav-zone" data-zone="${z.id}">${escapeHtml(z.label)}</a>`
    ).join('') +
    `<button type="button" class="nav__quick" data-action="toggle-quick" aria-pressed="${state.quickMode}">Quick Mode</button>`;

  const main = qs('#main');
  main.innerHTML = ZONES.map((z) => {
    if (z.layout === 'card-grid' || z.layout === 'character-matrix') {
      return `<section class="zone" id="zone-${z.id}" data-zone="${z.id}" data-mounted="false">
        <h2 class="zone__title">${escapeHtml(z.label)}</h2>
        ${z.filters ? '<div class="zone-filters"></div>' : ''}
        ${z.categoryFilter ? '<div class="zone-categories"></div>' : ''}
        <div class="zone-grid zone-body"></div>
      </section>`;
    }
    if (z.layout === 'accordion' || z.layout === 'timeline' || z.layout === 'start-here' || z.layout === 'foundations') {
      const extra = z.id === 'start-here' ? '<div id="start-here-result" class="api-result"></div>' : '';
      return `<section class="zone" id="zone-${z.id}" data-zone="${z.id}" data-mounted="false">
        <h2 class="zone__title">${escapeHtml(z.label)}</h2>
        <div class="zone-body">${extra}</div>
      </section>`;
    }
    return '';
  }).join('');

  if (window._zoneObserver) window._zoneObserver.disconnect();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) mountZone(en.target.dataset.zone);
      });
    },
    { rootMargin: '200px' }
  );
  window._zoneObserver = observer;
  qsa('.zone').forEach((s) => observer.observe(s));
}

function wireForms() {
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'start-here-form') {
      e.preventDefault();
      const fd = new FormData(e.target);
      const answers = Object.fromEntries(fd.entries());
      submitStartHere(answers);
    }
  });
}

const ProdRef = (() => {
  function init() {
    initProtocolGate();
    // Restore saved discipline and hydrate module-level vars
    const savedId = localStorage.getItem('prodRef_discipline') || 'bass';
    const disc = DISC_DATA[savedId] || DISC_DATA['bass'];
    state.discipline = disc ? savedId : 'bass';
    const activeDisc = DISC_DATA[state.discipline];
    STYLES = activeDisc.datasets.STYLES || [];
    TECHNIQUES = activeDisc.datasets.TECHNIQUES || [];
    CHARACTER = activeDisc.datasets.CHARACTER || [];
    WRITING = activeDisc.datasets.WRITING || [];
    PROBLEMS = activeDisc.datasets.PROBLEMS || [];
    REFERENCE = activeDisc.datasets.REFERENCE || [];
    VOCAL = activeDisc.datasets.VOCAL || [];
    PRINCIPLES = activeDisc.datasets.PRINCIPLES || [];
    DATASETS = { STYLES, TECHNIQUES, CHARACTER, WRITING, PROBLEMS, REFERENCE, VOCAL, PRINCIPLES };
    ZONES = activeDisc.zones;
    SONG_QUESTIONS = activeDisc.songQuestions;
    assertContentCounts();
    wireHeader();
    wireSessionStrip();
    wireNav();
    wireForms();
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('hashchange', handleHash);
    handleHash();
    mountZone('start-here');
  }
  return { init, getState: () => ({ ...state }) };
})();

document.addEventListener('DOMContentLoaded', () => ProdRef.init());
/* @endregion */
"""

# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------

APP_CSS = """
:root {
  --bg: #0d0f12;
  --surface: #161a21;
  --surface2: #1e2430;
  --border: #2a3140;
  --text: #e8eaed;
  --muted: #8b939e;
  --accent: #c9a227;
  --warning: #e5a84b;
  --error: #e07a6a;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --font-serif: 'Playfair Display', Georgia, serif;
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration: 0.25s;
}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.55;
  color: var(--text);
  background: var(--bg);
  min-height: 100vh;
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  z-index: 9999;
}
h1, h2, h3, .zone__title { font-family: var(--font-serif); font-weight: 600; }
a { color: var(--accent); }
.muted { color: var(--muted); }
#protocol-banner {
  background: var(--error);
  color: #fff;
  padding: var(--space-md);
  text-align: center;
}
#protocol-banner[hidden] { display: none; }
header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(13, 15, 18, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-sm) var(--space-md);
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
}
.site-title { font-family: var(--font-serif); font-size: 1.1rem; margin: 0; }
.disc-nav { display: flex; gap: var(--space-xs); }
.disc-tab {
  font-family: inherit;
  font-size: 12px;
  padding: 0.2rem 0.65rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: border-color var(--duration) var(--ease), color var(--duration) var(--ease);
}
.disc-tab:hover { color: var(--text); }
.disc-tab--on { border-color: var(--accent); color: var(--accent); background: rgba(201,162,39,0.1); }
.session-strip {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
  align-items: center;
}
.session-strip__label {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: var(--space-xs);
}
.ctx-input {
  font-family: inherit;
  font-size: 11px;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  width: 80px;
  transition: border-color var(--duration) var(--ease), color var(--duration) var(--ease);
}
.ctx-input::placeholder { color: var(--border); }
.ctx-input:focus { outline: none; border-color: var(--accent); color: var(--text); }
#main-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  align-items: center;
}
.nav__link {
  color: var(--muted);
  text-decoration: none;
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  font-size: 12px;
}
.nav__link:hover { color: var(--text); background: var(--surface2); }
.nav__quick {
  margin-left: auto;
  font-family: inherit;
  font-size: 12px;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}
.nav__quick[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
main { max-width: 1200px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-xl); }
.zone { margin-bottom: var(--space-xl); scroll-margin-top: 7rem; }
.zone__title { font-size: 1.75rem; margin-bottom: var(--space-md); border-bottom: 1px solid var(--border); padding-bottom: var(--space-sm); }
.zone-filters, .zone-categories { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-md); }
.chip {
  font-family: inherit;
  font-size: 11px;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.chip--on { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.zone-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: var(--space-md);
  cursor: pointer;
  transition: border-color var(--duration) var(--ease), transform var(--duration) var(--ease);
  animation: fadeUp var(--duration) var(--ease);
}
.card:hover { border-color: var(--accent); transform: translateY(-2px); }
.card__tag { font-size: 10px; text-transform: uppercase; color: var(--accent); letter-spacing: 0.05em; }
.card__title { font-family: var(--font-serif); font-size: 1.1rem; margin: var(--space-sm) 0; }
.card__liner { font-size: 12px; color: var(--muted); margin: 0; }
.char-group { margin-bottom: var(--space-lg); }
.char-group__title { font-size: 1.1rem; color: var(--accent); margin-bottom: var(--space-sm); }
.char-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: var(--space-xs);
  cursor: pointer;
}
.char-pair:hover { border-color: var(--accent); }
.char-pole--left { text-align: right; }
.char-spectrum { width: 40px; height: 4px; background: linear-gradient(90deg, var(--muted), var(--accent)); border-radius: 2px; }
.accordion { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: var(--space-sm); }
.accordion summary { padding: var(--space-md); cursor: pointer; font-family: var(--font-serif); }
.accordion__body { padding: 0 var(--space-md) var(--space-md); color: var(--muted); }
.timeline { list-style: none; padding: 0; margin: 0; }
.timeline__item { display: flex; gap: var(--space-md); margin-bottom: var(--space-lg); }
.timeline__num {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--accent);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.field { display: block; margin-bottom: var(--space-md); }
.field__label { display: block; margin-bottom: var(--space-xs); color: var(--muted); font-size: 12px; }
select, input[type="text"], input[type="password"] {
  width: 100%;
  max-width: 400px;
  font-family: inherit;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem;
  border-radius: 4px;
}
.check-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-xs); }
.check { font-size: 12px; display: block; }
.btn {
  font-family: inherit;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
.btn--primary { background: var(--accent); color: var(--bg); font-weight: 600; }
.alert { padding: var(--space-sm) var(--space-md); border-radius: 4px; margin-top: var(--space-sm); font-size: 13px; }
.alert--error { background: rgba(224, 122, 106, 0.15); color: var(--error); }
#detail-overlay {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  max-width: 720px;
  width: calc(100% - 2rem);
  border-radius: 12px;
  padding: 0;
}
#detail-overlay::backdrop { background: rgba(0,0,0,0.7); }
.dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border);
}
.dialog-body { padding: var(--space-md) var(--space-lg) var(--space-lg); max-height: 70vh; overflow-y: auto; }
.dialog-close {
  font-family: inherit;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
.detail-section { margin-bottom: var(--space-md); }
.detail-section__label { font-family: var(--font-serif); font-size: 1rem; margin: 0 0 var(--space-xs); }
.detail-section__body { color: var(--muted); font-size: 13px; }
.detail-liner { color: var(--muted); font-size: 13px; margin-top: 0; }
.detail-section--helper { border-left: 3px solid var(--accent); padding-left: var(--space-md); }
.character-detail { display: grid; gap: var(--space-lg); }
body.quick-mode .detail-section:not([data-quick]),
body.quick-mode .character-pole,
body.quick-mode .detail-section--helper,
body.quick-mode .detail-liner { display: none !important; }
/* Start Here result cards */
.start-result { display: grid; gap: var(--space-md); }
.start-result--empty { padding: var(--space-md) 0; color: var(--text); }
.start-result__cards { display: flex; flex-direction: column; gap: var(--space-xs); margin-top: var(--space-xs); }
.start-result__card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
  color: var(--text);
}
.start-result__card:hover { border-color: var(--accent); background: var(--surface2); }
.start-result__card-title { font-size: 14px; font-weight: 500; }
.start-result__card-liner { font-size: 12px; color: var(--muted); }
/* Foundations zone */
.foundations-empty { font-size: 13px; padding: var(--space-md) 0; }
.foundations-body { display: grid; gap: var(--space-md); padding-top: var(--space-sm); }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 600px) {
  .char-pair { grid-template-columns: 1fr; text-align: center; }
  .char-pole--left { text-align: center; }
  .session-strip { flex-wrap: wrap; }
}
"""

# ---------------------------------------------------------------------------
# HTML body
# ---------------------------------------------------------------------------

HTML_BODY = """
<div id="protocol-banner" hidden>
  Open via a local server — not file://. See README: <code>python3 -m http.server 8765</code>
</div>
<header>
  <div class="header-inner">
    <div class="header-top">
      <h1 class="site-title">Production Reference</h1>
      <nav id="discipline-nav" class="disc-nav"></nav>
    </div>
    <div class="session-strip">
      <span class="session-strip__label">Session</span>
      <input id="ctx-bpm" class="ctx-input" type="text" placeholder="BPM" title="Tempo (e.g. 140)">
      <input id="ctx-key" class="ctx-input" type="text" placeholder="Key" title="Key (e.g. F# minor)">
      <input id="ctx-genre" class="ctx-input" type="text" placeholder="Genre / mood" style="width:130px" title="Genre or mood">
    </div>
    <nav id="main-nav"></nav>
  </div>
</header>
<main id="main"></main>
<dialog id="detail-overlay">
  <div class="dialog-head">
    <div>
      <span id="detail-tag" class="card__tag"></span>
      <h2 id="detail-title"></h2>
    </div>
    <button type="button" class="dialog-close" data-action="close-detail" aria-label="Close">×</button>
  </div>
  <div class="dialog-body" id="detail-body"></div>
</dialog>
"""


def js_json(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def load_knowledge_base(disc_datasets: dict) -> dict:
    """Load pipeline records from knowledge_base/ JSON and merge them into disc datasets."""
    kb_dir = ROOT / "knowledge_base"
    if not kb_dir.exists():
        return disc_datasets

    type_to_key = {
        'style': 'STYLES',
        'technique': 'TECHNIQUES',
        'character': 'CHARACTER',
        'principle': 'PRINCIPLES',
        'problem': 'PROBLEMS',
        'writing': 'WRITING',
        'reference': 'REFERENCE',
    }

    total_merged = 0
    for json_file in sorted(kb_dir.glob("*.json")):
        if json_file.name == "manifest.json":
            continue
        discipline = json_file.stem
        try:
            records = json.loads(json_file.read_text(encoding='utf-8'))
        except Exception as e:
            print(f"  Warning: could not load {json_file.name}: {e}")
            continue

        if discipline not in disc_datasets:
            print(f"  Skipping unknown discipline in knowledge_base: {discipline}")
            continue

        datasets = disc_datasets[discipline]
        merged = 0
        for rec in records:
            key = type_to_key.get(rec.get('type', ''))
            if not key:
                continue
            if key not in datasets:
                datasets[key] = []
            existing_ids = {r['id'] for r in datasets[key]}
            if rec['id'] not in existing_ids:
                datasets[key].append(rec)
                merged += 1

        if merged:
            print(f"  Merged {merged} pipeline records → {discipline}")
        total_merged += merged

    if total_merged:
        print(f"  Total pipeline records merged: {total_merged}")
    return disc_datasets


def main():
    # Base datasets from Python content files
    bass_datasets = {
        'STYLES': STYLES,
        'TECHNIQUES': TECHNIQUES,
        'CHARACTER': CHARACTER,
        'WRITING': WRITING,
        'PROBLEMS': PROBLEMS,
        'REFERENCE': REFERENCE,
        'VOCAL': VOCAL,
        'PRINCIPLES': [],
    }
    drums_datasets = {
        'STYLES': DRUMS_STYLES,
        'TECHNIQUES': DRUMS_TECHNIQUES,
        'CHARACTER': DRUMS_CHARACTER,
        'PROBLEMS': DRUMS_PROBLEMS,
        'PRINCIPLES': [],
    }

    # Merge pipeline records from knowledge_base/
    all_datasets = {'bass': bass_datasets, 'drums': drums_datasets}
    load_knowledge_base(all_datasets)

    disc_data = {
        'bass': {
            'label': 'Bass',
            'zones': BASS_ZONES,
            'songQuestions': BASS_SONG_QUESTIONS,
            'manifest': CONTENT_COUNTS,
            'datasets': all_datasets['bass'],
        },
        'drums': {
            'label': 'Drums',
            'zones': DRUMS_ZONES,
            'songQuestions': DRUMS_SONG_QUESTIONS,
            'manifest': DRUMS_CONTENT_COUNTS,
            'datasets': all_datasets['drums'],
        },
    }

    js = APP_JS.replace('__DISC_DATA__', js_json(disc_data))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Production Reference</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <style>{APP_CSS}</style>
</head>
<body>
{HTML_BODY}
<script>
{js}
</script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT} ({len(html):,} bytes)")


if __name__ == "__main__":
    main()
