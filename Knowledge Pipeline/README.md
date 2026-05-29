# Knowledge Pipeline

Extracts, validates, and publishes music production knowledge into the Production Reference app.

## Setup

```bash
cd "/Volumes/BitchBaby1999/Coding/Personal/Knowledge Pipeline"
pip3 install -r requirements.txt
cp .env.example .env
# Fill in .env with your credentials
```

**Supabase:** Create a new project at supabase.com. Run `migrations/001_initial_schema.sql` in the SQL editor. Add the project URL and service role key to `.env`.

**Anthropic API key:** Same key used in the app. Add to `.env` as `ANTHROPIC_API_KEY`.

---

## The pipeline loop

```
ingest → extract → review → sync
```

### 1. Ingest a source

```bash
# Web article
python3 pipeline/ingest.py \
  --url "https://www.soundonsound.com/..." \
  --type article \
  --title "In The Studio: TPAB" \
  --author "Sound on Sound"

# YouTube video (auto-extracts transcript)
python3 pipeline/ingest.py \
  --url "https://youtube.com/watch?v=..." \
  --type video \
  --title "RBMA Lecture — Questlove" \
  --author "Questlove"

# Local file
python3 pipeline/ingest.py \
  --file "/path/to/book.txt" \
  --type book \
  --title "Making Music" \
  --author "Dennis DeSantis"
```

### 2. Extract knowledge records

```bash
python3 pipeline/extract.py --source-id <uuid-from-ingest>

# For foundational content
python3 pipeline/extract.py --source-id <uuid> --type principles

# Test without saving
python3 pipeline/extract.py --source-id <uuid> --dry-run
```

### 3. Review pending records

```bash
python3 pipeline/review.py

# Filter by discipline
python3 pipeline/review.py --discipline drums
```

Controls: **A** approve, **R** reject, **E** edit+approve, **S** skip, **Q** quit

### 4. Sync to the app

```bash
python3 pipeline/sync.py
```

Writes published records to `Bass App/knowledge_base/{discipline}.json` and regenerates `index.html`.

---

## Quality criteria (quick reference)

Every technical record must pass:
1. **Specific** — numbers, named techniques, or precise mechanism description
2. **Principled** — mechanistic why (physics/signal/psychoacoustic), not aesthetic
3. **Non-obvious** — beyond what a 2–3 year producer would find on first Google
4. **Attributable** — cites source with enough detail to locate original
5. **Actionable** — implementable in Ableton with Waves/NI

First Principles records replace non-obvious with **exceptionally clear** — explained better than it's explained anywhere else, zero assumed knowledge.

---

## Adding a new discipline

1. Add the discipline slug to `schema/record.json` discipline enum
2. Add it to the `check` constraint in `migrations/` (or alter the table)
3. Add it to the app's `DISC_DATA` in `generate_index.py`

---

## Source priority

See `sources/queue.json` for the prioritised source list.
Tier 1 (highest priority): RBMA lectures, Sound on Sound In The Studio, Tape Op interviews
Tier 2: Production books (DeSantis, Owsinski, Senior)
Tier 3: Specific YouTube producers, Song Exploder episodes
