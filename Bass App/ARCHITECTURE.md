# Bass Reference — Developer Guide

## Quick start

```bash
cd "/Volumes/BitchBaby1999/Coding/Personal/Bass App"
python3 -m http.server 8765
# Open http://localhost:8765/index.html?debug=1
```

## Repository files

| File | Purpose |
|------|---------|
| `index.html` | **Runtime artifact** — HTML, CSS, JS, all content inline |
| `generate_index.py` | Regenerates `index.html` from Python data (optional; run after content edits) |
| `README.md` | Producer-facing setup |
| `ARCHITECTURE.md` | This file |

## `index.html` region map

Search for these comments in `index.html`:

| Region | Contents |
|--------|----------|
| `REGION: CSS` | Design tokens, components, Quick Mode |
| `REGION: HTML` | Nav, zone shells, dialogs |
| `CONFIG` | `ZONES`, `DETAIL_SCHEMA`, `CONTENT_MANIFEST`, `API` |
| `DATA · STYLES` | 9 style records |
| `DATA · TECHNIQUES` | 20 technique records |
| `DATA · CHARACTER` | 16 character pole records |
| `DATA · WRITING` | 6 writing records |
| `DATA · PROBLEMS` | 9 fix-it records |
| `DATA · REFERENCE` | 6 reference steps |
| `DATA · VOCAL` | 8 vocal scenario records |
| `CORE` | `escapeHtml`, `assertContentCounts`, state |
| `RENDER` | `mountZone`, `openDetail`, `renderApiResult` |
| `API` | `callClaude`, `parseSections`, prompts, preflight |
| `INIT` | Event wiring, protocol gate |

## Content contract

Every browsable item is a **ContentRecord**:

```javascript
{
  id: '808-sub',           // stable slug
  type: 'style',           // style | technique | character | writing | problem | reference | vocal
  title: '808 / Sub Bass',
  oneLiner: '...',
  filters: ['electronic', 'dance'],
  sections: { sound: '...', build: '...', ... },
  meta: { tag: 'Electronic', category: 'Processing', pairId: 'warm-cold', pole: 'left', group: 'Tone' }
}
```

Overlay section order and Quick Mode flags: **`DETAIL_SCHEMA`** in CONFIG.

Counts: **`CONTENT_MANIFEST`** — 9 styles, 20 techniques, 32 character poles (16 pairs), 6 writing, 8 problems, 6 reference, 8 vocal; `assertContentCounts()` runs on load.

## How to add a style

1. Edit `STYLES` in `generate_index.py` (or `DATA · STYLES` in `index.html`).
2. Add keys required by `DETAIL_SCHEMA.style`.
3. Set `CONTENT_MANIFEST.styles` to new count.
4. Run `python3 generate_index.py` if using generator.
5. Reload — console must log `Content manifest OK`.

## API

- Model: `CONFIG.API.MODEL` (default `claude-sonnet-4-20250514`)
- Key: `sessionStorage` key `bassRef_apiKey`
- Browser header: `anthropic-dangerous-direct-browser-access: true`
- Prompts: `API.PROMPTS` region
- Parser: `parseSections(text, labels)` — labeled lines `NAME:`, `STYLE:`, etc.

## Debug

- `?debug=1` — log mounts, prompt length, parse output
- `BassRef.getState()` in console

## Version

`window.__BASS_REF_VERSION__` in `index.html`
