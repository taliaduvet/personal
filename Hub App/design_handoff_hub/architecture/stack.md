# Stack options for the Hub

Three options, in order of how strongly I'd recommend them. All three can deliver the same Hub. The differences are about your future options, not your current ones.

---

## Option A · React + Vite + Supabase + Tailwind  ★ recommended

The same stack Vein already uses. This is the path of least resistance.

**Why pick this:**
- Vein is built this way, so anything you learn here (component patterns, Supabase setup, Tailwind theming) carries over to Vein work and vice versa.
- Easy to share a component library between the Hub and Vein later.
- Vite dev experience is fast and pleasant. Build is straightforward.
- Supabase has first-class JS support and handles auth, database, storage, and realtime events.
- Tailwind 4's `@theme` directive lines up with the design tokens in `brand.css` directly.

**Tradeoffs:**
- No built-in server-side rendering. Pages render in the browser. For the Hub this is fine — it's a logged-in app, not a marketing site.
- You'll set up your own routing (React Router) and data fetching pattern. Not hard, but a small ceremony.

**Stack details:**
- React 18 + Vite + TypeScript
- React Router for routes
- Supabase JS client for auth + data
- Tailwind 4 (`@theme` directive consuming brand tokens)
- Stripe Checkout + Customer Portal (no custom payment forms needed)
- Resend for transactional email
- Deploy on Vercel or Netlify (both free for projects this size)

---

## Option B · Next.js + Supabase + Tailwind

A heavier framework that gives you more out of the box.

**Why pick this:**
- Server-side rendering for any future marketing pages on the Hub domain (privacy, terms, status page) without a separate site.
- File-based routing — `/sign-in/page.tsx` automatically becomes a route.
- Server actions handle form submission without writing an API layer.
- Better SEO if any Hub pages ever need to be public.

**Tradeoffs:**
- More framework conventions to learn.
- Heavier client bundle by default.
- Different from Vein. If you want to share components later, you'll need to extract a separate package.
- Some Supabase patterns (especially auth) need extra wiring for SSR.

**Stack details:**
- Next.js 15 (App Router) + TypeScript
- Supabase JS client + SSR helpers
- Tailwind 4
- Stripe Checkout + Customer Portal
- Resend
- Deploy on Vercel

---

## Option C · Astro + React islands + Supabase

The most "static-first" option.

**Why pick this:**
- Genuinely fast page loads — Astro ships only the JavaScript needed for interactive parts.
- Excellent for content + interactive UI mixed on the same page.
- Lowest hosting cost long-term.

**Tradeoffs:**
- Smaller community than React or Next; fewer tutorials, but Claude Code is fluent.
- Some Supabase patterns need adapting.
- Not what Vein uses, so cross-app component sharing is harder.

**Stack details:**
- Astro 4 + React for interactive parts + TypeScript
- Supabase JS client (with SSR-aware auth)
- Tailwind 4
- Stripe Checkout
- Resend
- Deploy on Netlify, Cloudflare Pages, or Vercel

---

## My recommendation

**Option A.** Same stack as Vein, simplest path, shortest distance to a real Hub. Pick this unless there's a reason to want SSR for marketing pages on the Hub domain (in which case Option B).

When Claude Code starts, the first thing it should ask you is: "We're going with Option A from `stack.md` unless you say otherwise — sound good?" If you've already decided, just tell it which one in your first message.
