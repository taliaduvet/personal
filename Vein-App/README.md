# Vein

Voice-memo catalog for solo artists: record or import audio to Google Drive, mark fragments, transcribe with Whisper, link ideas to songs, export lineage.

## What's included

- **Library** — **Record** in-browser, import from Files (≤25MB), search, **tags** (filter + manage), status badges
- **Home Screen shortcut** — open `…/library?record=1` to jump straight into the recorder (see below)
- **Memo** — waveform player (blob playback, iOS-safe), fragments, transcribe, lyric highlighting
- **Songs** — link fragments, notes, status, export lineage as `.txt`
- **Recovery** — backup download + vault reset if JSON is corrupt
- **Drive vault** — `Vein/Audio`, `Vein/Data/vein-data.json`, debounced saves, repair duplicate folders
- **PWA** — installable; offline-friendly shell (audio cached in IndexedDB when played)

## Local setup

### 1. Google Cloud Console

1. Create a project → enable **Google Drive API**
2. **OAuth consent screen** → External → add your Google account as a **Test user** (while in Testing mode)
3. **Credentials** → Create **OAuth client ID** → Web application
4. Authorized redirect URIs (must match `VITE_APP_URL` + `/auth/callback` exactly):
   - `http://localhost:5173/auth/callback` (local)
   - `https://YOUR-VERCEL-URL.vercel.app/auth/callback` (after deploy)

### 2. Environment variables

Copy `.env.example` to `.env`:

```
VITE_GOOGLE_CLIENT_ID=...
VITE_APP_URL=http://localhost:5173
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...          # optional — transcribe
ANTHROPIC_API_KEY=...       # optional — lyric line flagging
```

Transcription works locally via the Vite dev middleware (`/api/transcribe`). On Vercel, the same route runs as a serverless function.

### 3. Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:5173** — sign in, then use **Library** → **Record** or **Import**.

### Record from Home Screen (iPhone)

1. Add Vein to your Home Screen (Safari → Share → **Add to Home Screen**).
2. Shortcuts app → **New Shortcut** → **Open URL**:
   - Local: `http://localhost:5173/library?record=1`
   - Deployed: `https://YOUR-PROJECT.vercel.app/library?record=1`
3. Name it **Record in Vein** → shortcut menu → **Add to Home Screen**.
4. Tap the icon → sign in if needed → **Start recording** → **Stop** → **Save to library**.

iOS requires a tap to start the mic; the shortcut opens the recorder panel for you.

```bash
npm test        # unit tests (mutations, search, export, schema)
npm run build   # production build + PWA service worker
npm run lint
```

## User acceptance test (local)

1. **Sign in** → you land on **Library** with save indicator **Saved**.
2. **Record** a few seconds (or **Import** an M4A) → new memo appears → **Play** and scrub the waveform.
3. **Add fragment** at current time → label + type → appears in the list; tap timestamp to seek.
4. (If API keys set) **Transcribe** → transcript appears with lyric lines highlighted; lyric-type fragments may auto-flag.
5. **Songs** → create song → open → **Link fragment** → export lineage `.txt`.
6. **Recovery** (`/recovery`) — download backup JSON (optional sanity check).

Test **Play on first tap** and **Add to Home Screen** on a real iPhone in Safari.

## Deploy to Vercel

1. `npx vercel` from this folder → link project → deploy.
2. Environment variables (Production + Preview):
   - `VITE_GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (for transcribe)
   - Do **not** set `VITE_APP_URL` — the app uses the live site URL for OAuth.
3. Redeploy after adding env vars.
4. Google OAuth client → add `https://YOUR-PROJECT.vercel.app/auth/callback`.
5. iPhone: open URL → sign in → Share → **Add to Home Screen**.
