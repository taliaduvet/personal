# AI research worker (no Claude)

The ⚡ button **queues** tasks in Supabase. This script **processes** the queue using **Brave Search** + **Google Gemini Flash** so your Claude quota stays free for other work.

## Where results appear

After a successful run, open the Parking Lot app (same sync code as `DEVICE_SYNC_ID`):

1. Task card shows **⚡ Result ready**
2. Tap it for summary + links
3. **▶ Session** on the task → scroll to **History on this task** (same list as timer notes — research + past work sessions)

## One-time setup

1. Copy `scripts/ai-worker.env.example` → `scripts/ai-worker.env`
2. Fill in Supabase URL/key (same as `config.js`)
3. Set `DEVICE_SYNC_ID` to your app **Settings → sync code**
4. Get a free **Brave Search API** key: https://api.search.brave.com/app/keys
5. Get a free **Gemini API** key: https://aistudio.google.com/apikey

## Run once (manual)

```bash
cd parking-lot-v2
npm run ai:process-queue
```

Queue a task in the app (⚡ → Send), then run the command within a few seconds (after sync debounce ~0.5s).

Each completed job is **saved to Supabase immediately** before the next one starts. If a save fails, the worker stops and leaves later queue items untouched.

## Watch mode (recommended while you’re at the Mac)

One command — keeps checking every **10 minutes** while the terminal stays open (empty queue is fine; it just waits). **Ctrl+C** exits cleanly.

```bash
cd parking-lot-v2
npm run ai:watch
```

After each cycle it prints **Next run at …** with the local time.

## Run unattended (Mac cron)

If you don’t want a terminal open, use cron instead of watch mode:

```bash
crontab -e
```

Add (adjust path):

```
*/10 * * * * cd /Volumes/BitchBaby1999/Coding/Personal/parking-lot-v2 && /usr/local/bin/npm run ai:process-queue >> /tmp/parking-lot-ai-worker.log 2>&1
```

## Usage limits

Defaults: **3 jobs per run**, **15 per day** (edit `ai-worker.env`). Empty queue = no search/AI calls except one Supabase read per cycle.

## Troubleshooting

- **No queued tasks** — confirm sync code matches and the app saved (online + sync enabled).
- **Brave/Gemini errors** — check keys and free-tier quotas in their dashboards.
- **Stale "Queued" in UI** — refresh the page; realtime should pull updated prefs.
- **Save failed** — worker stops; fix Supabase/network and run again (completed items before the failure are already saved).
