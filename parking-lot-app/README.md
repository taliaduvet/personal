# Couples Parking Lot

A shared task manager for two people, with a real-time "Talk about" section that syncs via Supabase.

## Setup (Person 1 — You)

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Run the SQL** in Supabase Dashboard → SQL Editor. Copy the contents of `supabase-setup.sql` and execute it. (If you already ran it, run it again—it includes Realtime enablement.)

3. **Get your credentials** from Supabase Dashboard → Project Settings → API:
   - Project URL
   - anon public key

4. **Configure the app**: Copy `config.js.example` to `config.js` and fill in your URL and anon key.

5. **Open** `index.html` in your browser.

6. **Create pair** — Click "Create pair", copy the code (e.g. `abc123xy`), and share it with your partner.

---

## Setup (Person 2 — Your Boyfriend)

1. **Get the app folder** — Either:
   - Clone/copy the whole `parking-lot-app` folder to his computer, or
   - Host it somewhere (e.g. GitHub Pages, Netlify) and send him the URL.

2. **He needs the same `config.js`** — The app must have your Supabase URL and anon key to sync. Options:
   - **Same folder**: If you share the folder (USB, cloud drive, zip), include `config.js` so he has the keys. (Don’t commit config.js to a public repo.)
   - **Hosted**: If you deploy the app, bake the keys into the deployed version (fine for a private couples app).

3. **He opens the app** and clicks **Join pair**.

4. **He enters the pair code** you gave him (e.g. `abc123xy`) and clicks Join.

5. **His device is set as "him"** — Items he adds to Talk about will show "(him)"; yours show "(you)".

---

## How it works

- **Create pair**: One person creates a pair and gets a code. Share that code with your partner.
- **Join pair**: The other person enters the code and joins.
- **Personal columns** (Work, Hobbies, Life, Other) are stored locally on each device—no sync.
- **Talk about** items sync in real time between both devices via Supabase. Add something, and it appears on both screens.

---

## Deploy to GitHub Pages

See [DEPLOY.md](DEPLOY.md) for setup. Add your Supabase URL and anon key as GitHub Secrets, enable Pages, and push.

---

## Files

- `index.html` — Main app
- `app.js` — App logic
- `supabase.js` — Supabase client and Talk about sync
- `config.js` — Supabase URL and key (gitignored)
- `config.js.example` — Template for config
- `supabase-setup.sql` — SQL to create the table and enable Realtime
