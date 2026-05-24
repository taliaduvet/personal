# Vein — Cursor Build Prompt

## What you are building

Build a full-stack progressive web app (PWA) called **Vein**. Vein is a creative cataloguing tool for a solo music artist. It lets her import voice memo recordings, tag specific moments inside them as fragments while listening, track which fragments develop into full songs, and see the complete lineage of every song back to its raw source material.

This is a personal tool for one user. There is no multi-user system, no public-facing pages, no social features.

---

## Tech stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Storage:** Google Drive API v3 (all audio files and app data live in Drive)
- **Auth:** Google OAuth 2.0
- **Transcription:** OpenAI Whisper via a Vercel serverless function (handles audio → text)
- **Lyric flagging:** Anthropic Claude API via a Vercel serverless function (reads transcript → flags strong lyric candidates)
- **Deployment:** Vercel
- **PWA:** Service worker + web manifest for offline support and home screen installation

Do not use a separate database. All app data (memos, fragments, songs, links) is stored as structured JSON in a dedicated Google Drive folder. The JSON file is the source of truth.

---

## Authentication — Google OAuth 2.0

- Use Google OAuth 2.0 for login
- Request scopes: `https://www.googleapis.com/auth/drive.file` (access only to files the app creates)
- Store the access token and refresh token securely
- Implement automatic token refresh — the app must never silently fail because a token expired
- On first login, create a folder structure in the user's Google Drive:
  - `Vein/Audio` — where all voice memo audio files are stored
  - `Vein/Data` — where `vein-data.json` lives (the app's data file)

**Important:** You will need to provide instructions at the end of this build for how the user should set up a Google Cloud Console project, enable the Drive API, and generate OAuth credentials. The app cannot ship without this step being documented clearly.

---

## Google Drive data structure

All app state lives in `Vein/Data/vein-data.json`. Structure:

```json
{
  "memos": [
    {
      "id": "uuid",
      "title": "string",
      "date": "ISO8601",
      "driveFileId": "string",
      "status": "untouched | reviewed | has_fragments",
      "transcript": "string | null",
      "fragments": ["fragment-uuid", "fragment-uuid"]
    }
  ],
  "fragments": [
    {
      "id": "uuid",
      "memoId": "uuid",
      "timestamp": 134.5,
      "label": "string",
      "type": "melody | lyric | groove | vibe | full_idea",
      "status": "raw | in_use | developed | shelved",
      "isLyricCandidate": false,
      "songIds": ["song-uuid"]
    }
  ],
  "songs": [
    {
      "id": "uuid",
      "title": "string",
      "notes": "string",
      "status": "sketching | in_progress | done",
      "fragmentIds": ["fragment-uuid"]
    }
  ]
}
```

Read the JSON file on app load. Write it back to Drive on every change. Handle Drive API rate limits gracefully — debounce writes by 2 seconds so rapid changes don't trigger multiple simultaneous API calls.

---

## App structure — three views

### 1. Library view (default)

- List of all voice memos, sorted newest first
- Each row shows: title, date, status badge (Untouched / Reviewed / Has Fragments), fragment count
- Search bar at the top — searches across memo titles and fragment labels
- Button to import a new voice memo
- Tap/click a memo row to open Memo view

### 2. Memo view

**Audio player** — pinned at the top of the screen, always visible while scrolling

- Play/pause, scrubber, current time display, total duration
- **Critical for iOS Safari:** Audio playback must be initiated by a direct user gesture (tap on play button). Do not attempt autoplay. Use the HTML5 `<audio>` element directly. Test that seeking (jumping to a timestamp) works correctly on iOS WebKit.
- Supported audio format: M4A (iPhone Voice Memos export format). Ensure the audio element's `type` attribute is set to `audio/mp4` for M4A files.

**Add Fragment button** — always visible, either floating or pinned below the player

- Tapping it captures the current playback timestamp automatically
- Opens an inline form (not a modal) with:
  - Label field (short text)
  - Type selector: Melody / Lyric / Groove / Vibe / Full Idea
  - Save button
- Fragment is saved immediately and appears in the list below

**Fragment list** — below the player, scrollable

- Each fragment shows: timestamp (tappable — jumps player to that position), label, type badge, status badge
- Tap a fragment to expand it: shows status selector, linked songs, option to shelve
- Fragments sorted by timestamp

**Memo actions** (accessible from a menu or buttons):

- **Transcribe** — triggers transcription (see Transcription section below)
- **Mark as Reviewed** — updates memo status
- **Edit title**

**Transcript panel** — appears below fragment list after transcription runs

- Full text of the transcript
- Lines flagged as lyric candidates are visually highlighted (different background or left border accent)
- Timestamps shown inline where available
- The transcript is read-only — it is a reference, not an editor

### 3. Song view

Accessed from a Songs tab/section in the nav.

- List of all songs
- Each song shows: title, status badge, fragment count, source memo count
- Tap a song to open its detail page:
  - Title (editable)
  - Status selector: Sketching / In Progress / Done
  - Notes field (freeform text)
  - **Fragment lineage list:** all fragments linked to this song, each showing its label, type, timestamp, and a link back to its source memo. Tapping the memo link opens that memo at that timestamp.
  - Button to link an existing fragment to this song (opens a searchable fragment picker)

---

## Import flow

The app cannot register as an iOS share sheet destination (this requires a native app, not a PWA). The import flow is:

1. User opens Vein in Safari on iPhone
2. User taps **Import Memo** button
3. A file picker opens (`<input type="file" accept="audio/*">`)
4. User selects the voice memo file from the Files app (iPhone Voice Memos can be exported to Files via the share sheet in the native Voice Memos app)
5. The app uploads the audio file to `Vein/Audio/` in Google Drive
6. A new memo entry is created in `vein-data.json` with status `untouched`
7. The memo appears immediately in the library

Add a short help note in the UI explaining this flow the first time a user opens the app: "To import, first share your memo from the Voice Memos app to Files, then tap Import here."

---

## Transcription — Vercel serverless function

Build a Vercel serverless function at `/api/transcribe`.

**Flow:**
1. Client sends the Google Drive file ID of the audio file
2. Serverless function fetches the audio file from Drive using a service account or the user's OAuth token (passed from client)
3. Sends audio to OpenAI Whisper API (`whisper-1` model, `response_format: "verbose_json"` to get timestamps)
4. Returns the transcript text and an array of timestamped segments

**File size handling:**
- Voice Memos in M4A format are typically 0.5–1MB per minute
- Whisper API accepts up to 25MB per request
- For files larger than 25MB, split the audio into chunks on the server before sending, then concatenate results
- Show a clear loading state during transcription — it can take 30–60 seconds for a long memo
- If transcription fails, show a specific error message (not a generic one) and allow retry

Store the completed transcript in `vein-data.json` under the memo entry.

---

## Lyric flagging — Vercel serverless function

Build a Vercel serverless function at `/api/flag-lyrics`.

**Flow:**
1. Runs automatically after transcription completes (not a separate user action)
2. Sends the transcript text to the Anthropic Claude API (`claude-sonnet-4-6` model)
3. System prompt: `"You are reviewing a raw voice memo transcript from a singer-songwriter. The transcript may include humming, false starts, repeated phrases, and half-formed ideas alongside complete lyric lines. Identify lines that read as strong lyric candidates — lines with a clear image, a complete thought, or a musical phrase worth keeping. Return only a JSON array of the line indices (0-based) that are strong lyric candidates. Return nothing else."`
4. Parse the returned JSON array
5. Store flagged line indices back in the memo's transcript data in `vein-data.json`
6. The frontend uses these indices to highlight those lines in the transcript panel

**API key security:** The Anthropic API key must never be exposed to the client. It lives only in Vercel environment variables, accessed only by the serverless function.

---

## Responsive layout

### Mobile (< 768px) — primary use case, iPhone Safari

- Single column, full width
- Bottom navigation bar: Library / Songs
- Audio player pinned at top of Memo view
- Add Fragment button floats above the bottom nav
- Touch targets minimum 44x44px
- No hover states — use active/focus states instead

### Desktop (≥ 768px) — secondary use case, used while producing

- Two-column layout: left sidebar (Library, 300px fixed) + main panel (Memo or Song view)
- Both columns independently scrollable
- Audio player stays pinned at top of main panel
- Fragment list and transcript panel visible simultaneously without scrolling past the player if viewport is tall enough
- Song view shows fragment lineage in a table format on desktop

---

## PWA configuration

- `manifest.json` with app name "Vein", short name "Vein", display mode `standalone`, theme color dark
- Service worker using Workbox (via vite-plugin-pwa):
  - Cache the app shell for offline use
  - Cache audio files after first load so they play offline
  - Cache `vein-data.json` with a network-first strategy (try Drive, fall back to cached version)
- Add "Add to Home Screen" prompt on iOS — show a subtle instruction banner on first visit in Safari explaining how to install

---

## Design direction

- Dark theme — deep charcoal or near-black background (#0f0f0f or similar)
- Accent color: a single muted warm tone (dusty amber or faded terracotta) used sparingly for active states, fragment type badges, and the lyric highlight in the transcript
- Typography: a characterful monospace or slightly editorial font for timestamps and labels; clean readable sans-serif for body text. Avoid Inter, Roboto, or system-ui as primary fonts.
- Fragment type badges should be visually distinct from status badges — use shape or weight difference, not just color
- No animations that block interaction. Subtle fade-ins for panels loading. No loading spinners that take over the whole screen.
- The interface should feel like a tool, not a consumer app. Utilitarian but considered.

---

## Error states

Handle these explicitly with user-facing messages (not console errors):

- Google Drive API call fails (network error, quota exceeded)
- OAuth token expired and refresh fails — redirect to login
- Audio file fails to load in the player on iOS
- Transcription API call fails or times out
- Whisper file size limit exceeded — tell the user the file is too large and suggest exporting a shorter segment
- `vein-data.json` is malformed on load — show a recovery option, do not crash

---

## Future-proofing

The data structure in `vein-data.json` is designed to be read by a larger artist admin system later. Keep the schema clean:

- All IDs are UUIDs
- All dates are ISO 8601
- No proprietary formats or encoded values
- Export function: in Song view, there is a button to export a song's full fragment lineage as a plain text file (title, status, notes, then each fragment with its label, type, timestamp, and source memo title). This is the data portability escape hatch.

---

## What to build first (suggested order)

1. Google OAuth login + Drive folder creation
2. `vein-data.json` read/write layer
3. Library view with import flow
4. Memo view with audio player (test on iOS Safari first)
5. Fragment tagging (timestamp capture + form)
6. Song view and fragment linking
7. Transcription serverless function
8. Lyric flagging serverless function
9. Transcript panel UI
10. Responsive desktop layout
11. PWA manifest and service worker
12. Polish: error states, empty states, help text

---

## Setup instructions to include in README

At the end of the build, generate a `README.md` that includes:

1. How to create a Google Cloud Console project and enable the Google Drive API
2. How to create OAuth 2.0 credentials (web application type) and add the correct redirect URIs for both local development and Vercel deployment
3. How to add a Vercel environment variable for the Anthropic API key (`ANTHROPIC_API_KEY`) and the OpenAI API key (`OPENAI_API_KEY`)
4. How to deploy to Vercel
5. How to install the PWA on iPhone via Safari (Add to Home Screen)
6. How to export a voice memo from the iPhone Voice Memos app to Files so it can be imported into Vein
