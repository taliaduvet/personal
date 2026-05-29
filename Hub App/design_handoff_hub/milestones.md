# Hub · milestones

What "done" looks like, in shippable order. Each milestone ends with something you could deploy and use.

---

## M1 · Sign-in works

You can sign in and you stay signed in.

- [ ] Project scaffolded with the chosen stack
- [ ] Supabase project created, env vars set
- [ ] `/sign-in` route: email field, "send magic link" button
- [ ] Magic link arrives in inbox, click sends you back to the Hub signed in
- [ ] Session persists across reload
- [ ] Sign out works
- [ ] Brand tokens from `brand.css` working in the framework

**You can deploy this.** It's a working sign-in screen on the Hub brand.

---

## M2 · The Hub homepage shows you what you have

The Hub has a real home that pulls real data.

- [ ] `/` route shows: greeting, the today strip (placeholder data is fine), action-color preference, tool tiles (Vein / Ledger / Production as static placeholders for now), R2O progress section, downloads list, licenses list
- [ ] Layout matches `designs/Talia Hub Wireframes v3.html` section 03
- [ ] Supabase tables created from `architecture/supabase-schema.sql`
- [ ] A "test mode" toggle so we can preview different states (no tools owned, one owned + one renting, etc.)

**You can deploy this.** It's the Hub looking real, even without payments wired.

---

## M3 · Action color preference works end-to-end

The color the user picks here actually does something.

- [ ] Preferences sidebar entry navigates to a settings view
- [ ] Color picker with 6 swatches (violet, periwinkle, mauve, peach, sage, gold) — see the wireframe for the layout
- [ ] Selection saves to `users.accent_color` in Supabase
- [ ] Color applies live via the `--user-accent` CSS variable
- [ ] On next sign-in, the saved color loads automatically
- [ ] Document this so Vein and Ledger know to read the same variable

**You can deploy this.** It's the first real cross-tool concept proven out.

---

## M4 · Stripe wired (test mode)

Money can move, even if no real money does yet.

- [ ] Stripe account + test keys configured
- [ ] One-time purchase flow for any product
- [ ] Rent-to-own flow with `$5+/month, up to 24 months, choose your pace`
- [ ] After purchase, the user shows up as owning / renting in the Hub
- [ ] Pay-off-early button works
- [ ] Change-pace UI works (within cap)
- [ ] Card failure handling: 3-day retry → reminder email → 14-day read-only → 30-day pause (see `CLAUDE.md`)
- [ ] All tested in Stripe test mode; nothing live yet

**You can deploy this** behind a feature flag. Friends can try real flows with test cards.

---

## M5 · Cross-tool activity feed

The today strip shows actual things happening.

- [ ] A simple `events` table in Supabase: `{ user_id, product, kind, message, created_at }`
- [ ] Vein and Ledger can write events here when interesting things happen ("3 memos captured", "jun bookkeeping up to date")
- [ ] Hub home reads recent events for the signed-in user
- [ ] Today strip displays the latest event per product, with a humane fallback when there's none yet

**You can deploy this.** The Hub stops feeling like a placeholder.

---

## M6 · Cross-product top-bar link

Vein and Ledger send users back to the Hub.

- [ ] Add a "← back to your tools" link to Vein's top bar that points to the Hub
- [ ] Same in Ledger's top bar
- [ ] The link includes the user's session so they don't sign in twice
- [ ] (Coordinated change — touches both Vein and Ledger codebases)

**You can deploy this.** The suite starts feeling like a suite.

---

## M7 · Live launch

Real money, real users.

- [ ] Stripe switched to live mode
- [ ] Production deploys for Vein, Ledger, and the Hub
- [ ] Real domain for the Hub (`hub.taliaduvet.com`)
- [ ] Email delivery (Resend or similar) for magic links and billing events
- [ ] Privacy + ToS pages drafted in Talia's voice and linked from the footer
- [ ] Existing beta users grandfathered

**The Hub is live.**

---

After M7: the system-level ideas in `Roadmap.md` (cross-product features, bundle pricing, mobile receipt capture, etc.) become available to pick up.
