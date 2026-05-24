# Talia — brand colour guide (draft)

This guide **amalgamates** four studio references (neon lilac, studio blue, warm vintage, dream mint) into one palette—not four switchable themes. Use it for Vein and future personal projects.

---

## What the photos share

| Thread | From your references | Role in the blend |
|--------|----------------------|-------------------|
| **Depth** | Purple noir, navy, oxblood shadows | One rich **plum-warm** base (not cold grey, not flat black) |
| **Light** | Platinum hair, cream tulle, off-white | **Warm cream** text—not blue-white |
| **Pop** | Magenta rim light, sky blue, oxblood | One **rose-magenta** primary accent (your “stage light”) |
| **Breath** | Peach backdrop, mint studio | **Peach** and **mint** as *whispers*—borders, hovers, secondary chips—not second themes |

---

## Core palette (v1 — “Studio Talia”)

| Token | Hex | Plain English |
|-------|-----|----------------|
| `bg` | `#18121c` | Main stage: deep plum-black |
| `surface` | `#261e2a` | Cards, panels: dusty plum |
| `border` | `#4a3d52` | Edges: muted lilac-plum |
| `text` | `#f0e8ec` | Body copy: warm platinum |
| `muted` | `#a8949e` | Hints, labels: tauve-lilac |
| `accent` | `#d65a9a` | Primary actions, links, waveform progress |
| `accent-dim` | `#9b6bab` | Secondary emphasis, inactive glow |
| `accent-mint` | `#8fc4b0` | *Sparingly*: lyric highlights, “fresh” badges |
| `warm` | `#e8b89a` | *Sparingly*: soft highlights, warm borders |
| `on-accent` | `#18121c` | Text on filled accent buttons |
| `error` | `#c45c6a` | Errors, destructive (dusty rose-red) |

### CSS variables (copy into any project)

```css
--brand-bg: #18121c;
--brand-surface: #261e2a;
--brand-border: #4a3d52;
--brand-text: #f0e8ec;
--brand-muted: #a8949e;
--brand-accent: #d65a9a;
--brand-accent-dim: #9b6bab;
--brand-accent-mint: #8fc4b0;
--brand-warm: #e8b89a;
--brand-on-accent: #18121c;
--brand-error: #c45c6a;
```

Vein maps these to `--color-vein-*` in `src/index.css`.

---

## Rules of use

1. **One mood per screen** — dark plum base everywhere; don’t rotate full palettes per page.
2. **Accent = action** — buttons, active nav, playhead, important links use `accent`.
3. **Mint & peach = garnish** — max ~10% of UI (badges, one border, hover sheen)—they recall the mint/peach photos without splitting the brand.
4. **Typography** — Instrument Sans + IBM Plex Mono (Vein today); keep high contrast on `surface`, never pure `#fff` on `bg`.
5. **Photography** — UI sits *behind* your work; colours echo studio lighting (magenta rim + warm fill), not compete with cover art.

---

## Open questions (refine together)

Reply with gut reactions—we’ll bump v1 → v2 in this file.

1. **Brighter or moodier?** Should the base feel closer to *warm peach light* (lift `bg` toward `#2a1f22`) or stay *neon-noir* (`#18121c`)?
2. **Accent temperature** — more **magenta** (`#d946ef`) or more **rose** (`#d65a9a` current)?
3. **Mint role** — keep for lyric/creative chips only, or drop mint entirely for a stricter two-tone brand?
4. **Light mode** — do you ever want a cream **light** variant (warm photo), or dark-only for music tools?
5. **Name** — “Studio Talia”, “Talia Audsen”, or something else on exports / splash?

---

## Source reference (your four shots)

| Photo | Dominant hues pulled in |
|-------|-------------------------|
| Purple duvet | Lilac bg, magenta accent, platinum text |
| Blue studio | Navy depth → merged into plum; sky → mint whisper |
| Warm red/peach | Oxblood depth in shadows; peach → `warm` token |
| Dream mint | Mint → `accent-mint`; lavender → `accent-dim` / border |

---

*Version: 1.0 draft — amalgamated for Vein, May 2026*
