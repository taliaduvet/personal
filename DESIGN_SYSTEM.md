# Talia Duvet — Design System

Design tokens live in `Hub App/hub/src/brand.css`. Every project in this repo imports that file as the single source of truth. Do not override the tokens — work with them.

---

## The Brand

**Talia Duvet** is a working artist making tools for artists. The products exist at the intersection of music, mental health, and creative practice. The visual language reflects that: warm, deliberate, a little cosmic, never corporate.

**Personality:** Quiet confidence. Bookish. Slightly otherworldly. Like a well-worn studio with good light.

**What it is not:** Startup-clean. Sans-serif minimalist. Loud. Playful in a tech way.

---

## The Two Surfaces

Every screen in this system lives on one of two surfaces. Never mix them on the same page section.

### Paper (default — all working tools)
- Background: `#f6f0e3` (warm cream)
- Text: `#1a1816` (near-black ink)
- Used for: Hub, Workspace, Accounting App, Parking Lot, any tool the user operates
- Feel: a working desk. Calm. Focused.

### Cosmic (marketing-facing only)
- Background: deep navy `#0c0e1a` with violet + coral fog gradients
- Text: cream `#f6f0e3`
- Used for: sign-in page poster panel, homepage, landing pages, anything that faces the public before they're logged in
- Feel: a stage at night. Atmospheric. Aspirational.

---

## Color

### Primary accent — Violet
- `--accent: #9b6cff` — the only loud color in the system. Use sparingly. CTAs, highlights, active states.
- `--accent-deep: #7a4ce0` — hover states
- `--accent-soft: #b89cff` — on cosmic surfaces

### Warm gold
- `--star: #fcd47a` — secondary accent. Used for "beta" status, star ornaments, warm highlights.

### Palette (4 tones, used freely)
These come from Talia's promo photography. Use them for illustration, category colors, or data visualization — never as primary UI.

| Name | Hex | Mood |
|------|-----|------|
| Periwinkle | `#b0cdfd` | Cool blue · alone in the field |
| Mauve | `#b198b1` | Dusty purple · haunted, in-between |
| Peach | `#fbcb94` | Warm cream · performance / firelight |
| Sage | `#8bcba6` | Mint green · brief harmony |

### Semantic
- Positive: `#7ba88e` (muted green)
- Warning: `#d4a64e` (amber)
- Negative: `#c46556` (brick red)

---

## Typography

### Families
| Role | Font | Use |
|------|------|-----|
| Display | Instrument Serif | Headlines, emotional moments, pull quotes |
| Body | Inter | All UI text, labels, descriptions |
| Mono | JetBrains Mono | Caps labels, badges, code, status indicators |
| Sketch | Caveat | Handwritten notes, informal annotations only |

### Rules
- Headlines use `Instrument Serif` at natural weight (400), slightly negative tracking
- Labels and status badges use `JetBrains Mono` in all-caps with `0.18em` tracking — this is a brand signature
- Body copy uses `Inter` at `15px / 1.5` line-height on paper
- Never use bold display — the elegance comes from weight contrast between serif headlines and mono labels

---

## Buttons

The double-border button is a brand signature: a `1px solid` border + a `1px solid outline` at `3px offset`. Sharp corners (no radius). Mono caps.

- **Default** — transparent fill, ink border + outline, hover inverts to ink fill
- **Primary** — violet fill, matching outline, star sigil (`★`) prepended
- **Ghost** — transparent, violet text + border, no outer outline at rest
- **btn-text** — inline text link, mono caps, accent underline only

---

## Components

### Pills / Status Badges
Small mono-caps badges with a pill radius and `1px solid currentColor` border. No fill.
- `.pill-live` — violet
- `.pill-beta` — gold
- `.pill-soon` — faint ink

### Cards
Light border, `14px` radius, paper background. On cosmic: semi-transparent dark fill with `backdrop-filter: blur`.

### Inputs
Rounded (`8px`), faint ink border, accent focus ring with `3px` glow.

---

## Voice (applies to all UI copy)

- Lowercase by default — "sign in", "your hub", not "Sign In", "Your Hub"
- Plain and warm — a real person wrote this, not a product manager
- No marketing words: never "seamless", "unlock", "supercharge", "powerful"
- No exclamation marks unless the sentence genuinely earns one
- Error messages own the problem, don't blame the user ("something went wrong" not "you entered an invalid email")

---

## Projects in This Repo

| Project | Folder | Surface | Status |
|---------|--------|---------|--------|
| **Hub** | `Hub App/hub/` | Paper (tools) + Cosmic (sign-in) | Live |
| **Workspace** | `/workspace/:id` inside Hub | Paper | Live |
| **Accounting App** | `accounting-app/` | Paper | Active |
| **Parking Lot v2** | `parking-lot-v2/` | Paper | Active |
| **Bass App** | `Bass App/` | Paper | Active |
| **Knowledge Pipeline** | `Knowledge Pipeline/` | N/A (backend) | Active |

All customer-facing tools use the paper surface. The cosmic surface is only ever for public/marketing pages.

---

## What Not to Do

- Don't add Tailwind — styling is done in CSS custom properties
- Don't add new font families — the four above cover every scenario
- Don't use `border-radius` on buttons — sharp corners are intentional
- Don't use pure black (`#000`) or pure white (`#fff`) — use ink and cream tokens
- Don't use green, red, or blue as primary UI colors — those are semantic only
