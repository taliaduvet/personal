# Studio OS — App (Stage 2)

The mobile-first PWA companion to the Studio OS Google Sheet. A calm home for an
independent artist's tasks, goals, projects, and weekly review — installable on a
phone home screen, no app store required.

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4
- **Auth/Backend:** Supabase (Google sign-in) — keys wired, project connects in M1
- **Design:** "Soft Desk" — the same palette and accent (`#5B61E8`) as the Sheet engine

---

## Milestone status

**M0 — Foundations ✅ (this milestone)**

- Soft Desk design system (tokens, Space Grotesk + Inter, category palette)
- Installable PWA (web manifest, service worker, icons, theme color)
- Responsive app shell — desktop sidebar + phone bottom tab bar
- All screens stubbed and navigable: Dashboard, Today, Tasks, Inbox, Projects, Goals, Weekly Review, Settings
- Supabase Google sign-in scaffolding + route protection (active once keys are added)

Next: **M1** wires the live Sheet (read tasks) into the Dashboard and Tasks screens.

---

## Run it locally

```bash
npm install        # already done
npm run dev        # http://localhost:3000
npm run build      # production build (type-checks everything)
```

> Note: this repo lives on an external volume, so Turbopack's *first* page compile
> can take a few seconds. Subsequent loads are instant.

## Connecting Supabase (when ready)

1. Copy the env template: `cp .env.local.example .env.local`
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Supabase → Project Settings → API).
3. In Supabase → Authentication → Providers, enable **Google** and add the
   callback `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`).
4. Restart `npm run dev`. The login screen's Google button activates automatically.

Until keys are present, the app stays browsable (no redirect) so the shell can be
previewed — the login screen simply shows a "not connected yet" note.

## Project map

```
src/
  app/
    layout.tsx            root layout: fonts, PWA meta, SW registration
    manifest.ts           web app manifest (/manifest.webmanifest)
    login/                sign-in screen (Google OAuth)
    auth/callback/        OAuth code exchange
    (app)/                authenticated shell + screens
      layout.tsx          sidebar + top bar + bottom nav
      page.tsx            Dashboard
      today/ tasks/ inbox/ projects/ goals/ weekly-review/ settings/
  components/             Sidebar, BottomNav, TopBar, icons, ScreenStub, nav config
  lib/supabase/           browser/server clients, env guard, session refresh
  proxy.ts                session refresh + private-route protection (Next 16 proxy)
public/
  sw.js                   minimal service worker (installability + offline shell)
  icon.svg, icon-maskable.svg
```
