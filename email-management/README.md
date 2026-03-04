# Email Triage Agent

A hands-off agent that reads your Gmail, extracts tasks into your parking lot app, and drafts polite replies. You review and hit send.

## What it does

1. **Fetches** unread emails from Gmail Primary tab only (excludes Updates, Social, Promotions; also skips newsletters, no-reply, receipts)
2. **Extracts** actionable tasks using Gemini AI
3. **Pushes** tasks to your parking lot app (Supabase)
4. **Creates** reply drafts in Gmail so you can edit and send

## Setup

### 1. Prerequisites

- Python 3.9+
- A Google account (Gmail)
- Supabase project (same as your parking lot app)
- Gemini API key (free from [Google AI Studio](https://aistudio.google.com/apikey))

### 2. Install dependencies

```bash
cd email-management/agent
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

From now on, activate the venv before running any agent commands: `source .venv/bin/activate`

### 3. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **Gmail API**
4. Create **OAuth 2.0 credentials** (Desktop app)
5. Download the JSON and save as `credentials.json` in this folder

### 4. OAuth (one-time)

Run the OAuth flow to get a refresh token (with venv activated):

```bash
python -c "from triage import run_oauth; run_oauth()"
```

A browser will open. Sign in with your Gmail account. Copy the `GMAIL_REFRESH_TOKEN` from the output and add it to `.env`.

### 5. Environment

Copy `.env.example` to `.env` and fill in:

```
GMAIL_REFRESH_TOKEN=<from OAuth step>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=<from google.ai.studio>
PARKING_LOT_PAIR_ID=solo_default
PARKING_LOT_ADDED_BY=Talia
PARKING_LOT_CATEGORY_PRESET=generic
```

**Solo users:** Use `solo_default` for `PARKING_LOT_PAIR_ID` — no extra config needed.

**Couple users:** Copy your pair code from the parking lot sidebar and set it as `PARKING_LOT_PAIR_ID`. Set `PARKING_LOT_ADDED_BY` to match who you are in the app (Talia or Garren — same as when you joined the pair).

### Couples: Each person runs their own agent (separate inboxes)

If both you and your partner want email triage, **each person runs the agent separately** with their own setup:

| You need | Person 1 (e.g. Talia) | Person 2 (e.g. Garren) |
|----------|------------------------|-------------------------|
| Gmail account | Your own | Their own |
| OAuth / credentials.json | Your own | Their own |
| .env | Same SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY | Same |
| PARKING_LOT_PAIR_ID | Shared pair code | Same pair code |
| PARKING_LOT_ADDED_BY | Talia | Garren |

Each person's email triage stays separate in the app — you only see your own extracted tasks. The agent uses your Gmail credentials, so it only reads your inbox.

### 6. Supabase migration

Run the SQL from `parking-lot-app/supabase-setup.sql` in your Supabase SQL Editor (the new tables: `email_tasks`, `processed_emails`, `agent_runs`).

### 7. Validate first

**Gmail-only check** (no Supabase/Gemini needed):

```bash
python gmail_check.py
```

**Full connectivity** (Supabase, Gemini):

```bash
python scout_test.py
```

Then:

```bash
python triage.py --dry-run
```

This fetches and analyzes emails without writing anything. If it works, you're ready.

### 8. Run on a schedule

**Local cron** (example: every 3 hours):

```bash
0 */3 * * * cd /path/to/email-management/agent && python triage.py
```

**GitHub Actions:** Add a workflow that runs `python triage.py` on a schedule. Set secrets: `GMAIL_REFRESH_TOKEN`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `PARKING_LOT_PAIR_ID`.

## Usage

- **Full run:** `python triage.py`
- **Dry run:** `python triage.py --dry-run` (no writes)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No tasks appear in parking lot | Run `gmail_check.py` to verify Gmail sees unread; run `--dry-run` to see what gets filtered; verify `PARKING_LOT_PAIR_ID` matches (solo: `solo_default`; couple: copy pair code to .env) |
| Emails from Updates/Social/Promotions | Agent uses Primary tab only (`category:primary`). Move important emails to Primary if you want them triaged. |
| "Last triage" shows failed | Check `agent_runs` table for `error_message`; common: OAuth expired (re-run OAuth), Gemini rate limit (wait or reduce batch size) |
| Drafts not in Gmail | Verify `gmail.compose` scope; ensure OAuth was re-run with correct scopes |
| Email triage unavailable. | Supabase fetch failed; check config.js in parking lot, network |

## Re-authorizing Gmail

If `GMAIL_REFRESH_TOKEN` expires (e.g. 6 months inactive):

```bash
python -c "from triage import run_oauth; run_oauth()"
```

Update `.env` with the new token.
