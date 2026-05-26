# Mom's Parking Lot · design with Claude Designs

How the **Claude Designs** folder fits this app, and a practical path to a nicer wireframe without rebuilding the whole product.

## What lives in `Claude Designs/`

| File | Role |
|------|------|
| `brand.css` | Shared tokens — paper/cosmic surfaces, violet accent, periwinkle/mauve/peach/sage, Instrument Serif + Inter |
| `design-canvas.jsx` | Figma-like canvas: sections, artboards, post-its, drag-reorder, fullscreen focus, state in `.design-canvas.state.json` |
| `Talia Hub Wireframes v3.html` | Multi-app wireframes (Hub, Vein, Ledger, etc.) — reference for layout patterns |
| `Roadmap.md` | Suite-level ideas (shared brand package, Hub app) — not Mom-specific |

## How `design-canvas.jsx` works (short)

1. Wrap screens in `<DesignCanvas>` → `<DCSection>` → `<DCArtboard>`.
2. Each artboard is a fixed-size frame (e.g. 390×844 phone) with your HTML/React UI inside.
3. You edit labels inline, reorder artboards, open fullscreen to review one screen.
4. A host bridge persists layout to a sidecar JSON file.

**Use it when:** comparing 2–3 visual directions (e.g. “dense board” vs “calm board”) before coding CSS.

**Don’t use it for:** production UI — Mom’s app stays in `mom-parking-lot-app/` with real data and Supabase.

## Recommended Mom wireframe pass

### Phase A — Paper board (1 artboard)

- Surface: `--bg-paper` / `--mom-paper` from `brand.css`
- Top bar: **Today** (Instrument Serif) + icon cluster (Notes · People · Archive) + hamburger — matches what we shipped in code
- Main: **Projects** columns (not 4 generic categories) + simplified Today strip
- Accent: sage for “Repeating”, peach for “People” column chips (semantic 4-tone palette from Roadmap §5)

### Phase B — Task sheet (1 artboard)

- Edit task modal: Project + Person with **+ New** inline (implemented in app)
- Show recurrence chips for Mom (daily / monthly / semi-monthly)

### Phase C — Notes & archive (optional artboards)

- Notes tab list + editor (shared `note-to-task` highlight flow)
- Archive month grid + day detail

### Getting canvas on screen

1. Open `Claude Designs/design-canvas.jsx` in a React host (or Hub workspace HTML that already loads React).
2. Add a section `Mom's Parking Lot` with artboards from Phase A–C.
3. Paste static HTML from `mom-parking-lot-app/index.html` fragments, or simplified mock markup.
4. Tune `brand.css` imports on the artboard wrapper only — then port winning tokens into `mom.css` (we started with Instrument Serif on Today + header icon hover).

## Already applied in the live Mom fork

- Header tool icons (Notes, People, Archive) in the today bar
- `mom.css` paper/ink/accent variables + serif Today title
- Inline **+ New** on project/person in add/edit task

## Next design → code steps (when you approve)

1. Add a `Mom Parking Lot` section to the design canvas with Phase A mock.
2. Align column header colors to brand semantic tones (people = mauve, repeating = sage, todos = periwinkle).
3. Soften modals: paper background, rounded 12px, violet primary button from `--accent`.
4. Optional dark-on-cosmic variant only if Mom ever gets a “night mode” (default stays paper for readability).

## Plain English

Claude Designs is your **sketch stage** — big artboards on a gray grid. Mom’s app is the **concert** — real tasks and sync. We use the sketch stage to try layouts, then copy the look into `mom.css` and `index.html` in small steps.
