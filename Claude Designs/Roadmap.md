# Talia Hub · Roadmap

A running list of system-level improvements identified during design review. **Not the priority list** — the priority right now is: ship Vein → ship Ledger → ship Production. These come after.

Last updated: spring 2026

---

## Phase 1 · After individual products ship

These are the foundation moves that turn the three apps into a coherent system. Do these before scaling features.

### 1. Unify identity & accounts
**Problem:** Vein uses Google OAuth, Ledger uses Supabase email+password. The homepage promises "one account, three tools" — but it's two auth systems today.

**Proposal:** Pick **Supabase as the identity layer for everything**, add Google as a sign-in *option* on top of it. Then every tool reads the same user record. This is also what makes the user-level accent color preference possible.

**Impact:** High · prereq for the Hub app being real.

---

### 2. Extract a shared brand package
**Problem:** `brand.css` (Hub), `index.css` (Vein @theme), `styles.css` (Ledger `:root`) all define their own copies of the palette. Today, changing the violet means hand-editing three files.

**Proposal:** Extract `@talia/brand`:
- `tokens.json` (Style Dictionary format)
- Exports: CSS variables, a Tailwind preset, TS constants
- One source of truth · every product reads from it

**Impact:** High · easy · unblocks visual regression tests + future products.

---

### 3. Build the actual Hub app
**Problem:** ~~The "Account / Library" wireframe (and the new "Hub" wireframe below) is the missing third app.~~ The Hub wireframe **exists** — it's the "03 · Hub" section in `Talia Hub Wireframes v3.html` (formerly "Account / Library"). What's missing is the *production app behind it.*

**Proposal:** Build `hub.taliaduvet.com` as a real React+Supabase app matching the wireframe:
- Tool launcher (Vein / Ledger / Production tiles with Open CTAs)
- R2O progress at a glance + change-pace UI
- Today strip showing activity across all tools
- User-level accent color picker (already wired into the wireframe — pick once, applies everywhere)
- Billing, downloads, license keys
- Both Vein and Ledger top-bars get a "← back to your tools" link pointing here

**Impact:** High · this is what makes the suite feel like a suite.

---

## Phase 2 · Once the Hub exists

### 4. Cross-product linkage
**Problem:** Today there's no real reason to own multiple Talia tools beyond philosophy. Each app is its own island.

**Proposal:** Sketch one tangible integration per pair. Strongest candidate:
- **Vein songs → Ledger royalty income.** When a memo is linked to a song, and that song earns money, Ledger's income dropdown shows that song as a selectable source. Royalties flow from creative work → bookkeeping automatically.
- Also explore: Vein references → Production session library; Ledger expenses tagged "gear" → Production reference list of what you own.

**Impact:** High · this is the killer feature that justifies bundling.

---

### 5. Lean into the 4-tone palette as semantic UI
**Problem:** Periwinkle / mauve / peach / sage are powerful brand DNA but barely show up inside the apps.

**Proposal:** Use them as semantic color throughout:
- **Vein:** melody = periwinkle, lyric = peach, groove = sage, vibe = mauve (currently all violet)
- **Ledger:** T2125 line groups or income types get assigned tones
- **Hub:** each product card already uses its assigned tone — extend this everywhere

**Impact:** Medium · cohesion shows up automatically; visual hierarchy gets richer.

---

### 6. Visual regression tests on brand drift
**Problem:** Three apps reskinned by hand will drift over time. Today there's no safety net.

**Proposal:** Once tokens are shared (#2), set up Playwright + screenshot diffs on a `/styleguide` route in each app. The Hub brand system file becomes the source of truth — drift breaks the build.

**Impact:** Medium · pays off as soon as you ship the second update.

---

## Phase 3 · Pricing model maturity

### 7. Define "updates forever"
**Problem:** Right now it's an ethical commitment with no contract. What counts as a free update vs. a "v2 you'd pay for"?

**Proposal:** Pick a clear rule and write it on the pricing page:
> Same tool = always free updates, forever. If we ever build "Vein for Bands" or "Ledger Pro", those are separate products.

**Impact:** High · legally important, ethically clarifying.

---

### 8. R2O mid-flow failure policy
**Problem:** What happens if a card fails on month 4 of 7? Lose access? Lose ownership progress?

**Proposal:** Documented sequence:
- Card fails → 3-day silent retry
- Still failing → polite email + Hub banner ("card declined · update by [date] to keep going")
- 14 days after first failure → tool goes read-only (export still works)
- 30 days → ownership progress pauses (does not reset)
- Resume any time by updating card · resume from where you left off

Surface all of this on the Account screen, gently.

**Impact:** High · prevents the worst possible customer-trust failure mode.

---

### 9. Studio bundle pricing
**Problem:** Once Production launches, individual pricing is leaving money on the table for power users.

**Proposal:** "Studio bundle: all 3 tools for $X" with bundle-level R2O. Add to the pricing comparison table once there are 3 live products. Probably ~20% off the sum.

**Impact:** Medium · only matters once you have 3 shipped tools.

---

## Phase 4 · Smaller, high-leverage

### 10. Ledger receipt-capture on mobile
**Problem:** Ledger is desktop-first but receipts happen on the phone.

**Proposal:** A single mobile-optimized route — `ledger.taliaduvet.com/receipts/quick` — that's just snap → auto-category → done. Doesn't need to be the full app on mobile, just this one flow.

**Impact:** High · receipts are *the* friction point in artist bookkeeping.

---

### 11. Production waitlist payoff
**Problem:** "Waitlist · #214" is hollow today. Just an email list.

**Proposal:** Make it a **private build channel**:
- Monthly concept dispatches (sketches, wireframes, prompts)
- Vote on directions
- Alpha access before public beta
- Private Discord or just a thread per dispatch

**Impact:** Medium · turns a vanity number into a community + product feedback loop.

---

### 12. Keep cycle framing outside the apps
**Problem:** "Phase I · Isolation" reads as poetic on the marketing site but would feel twee inside Vein.

**Rule:** Marketing surfaces = poetic. Working surfaces = quiet. Currently right; documenting so we don't drift.

**Impact:** Low · just a guardrail.

---

## Things I'm not sure about yet (parking lot)

- **Dark mode for Ledger** — Ledger is paper-only. Is there ever a case where someone wants Ledger in cosmic? Probably not — leave it.
- **Lifetime account portability** — what if someone wants to leave? "Export everything" link in Hub settings.
- **Team / label accounts** — multi-user scoping (e.g. an artist + their accountant access). Big feature; not now.
- **Mobile Production** — when Production lands, does it want to be mobile-first like Vein or desktop-first like Ledger? Depends on workflow.
- **Naming "tools"** — "Studio" or "Workshop" might be stronger than "tools." But "tools from a working artist" is sticky. Don't change unless there's a real reason.

---

*This file is for items that have been observed but explicitly deferred. New items can be added at any time. Re-prioritize when the three core products are stable.*
