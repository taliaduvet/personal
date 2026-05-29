# Claude Code — standing instructions for the Hub

You are building the Talia Duvet Hub, a real production app. Talia is the product owner and is not a coder. She'll describe outcomes in plain English; you handle implementation. Always explain what you're doing in plain language and never expose code-speak in user-facing UI.

## Voice rules (apply everywhere — UI, errors, emails, microcopy)

- Lowercase by default. Capitalize sentences only where it would look weird not to (proper nouns, the start of a button label, etc.)
- Plain, warm, dry. A real person wrote this.
- No marketing words: "seamless", "unlock", "supercharge", "revolutionize", "all-in-one", "enterprise-grade".
- No exclamation marks unless the sentence really earns one.
- Error messages own the problem instead of blaming the user.
- When in doubt about a copy choice, propose 3 options and let Talia pick.

## Brand rules

- **Two surfaces.** Cosmic (deep navy + cream text + violet) is for marketing-facing pages. Paper (warm cream + ink) is for working surfaces. The Hub is **paper** by default.
- **Violet is the only "loud" color.** Use sparingly so it stays meaningful.
- **Periwinkle / mauve / peach / sage** are environmental flavor — stars, halos, accents. Never use them for body text or fills.
- **Instrument Serif** is for wordmarks and very-large display text only. Inter is the body and heading font.
- All tokens live in `designs/brand.css`. Convert them to the framework's token system; do not invent new colors.

## Action color is a user preference

Every user picks an action color (violet, periwinkle, mauve, peach, sage, or gold). It's stored on the user record. Apply it via a shared CSS variable `--user-accent` everywhere primary actions appear. Vein and Ledger will read the same variable.

## Pricing model rules

- One-time price OR rent-to-own.
- Rent-to-own floor: **$5/month**.
- Rent-to-own cap: **24 months**.
- Effective max duration per tool: `min(24 months, tool_price / $5)`.
- Users can change pace mid-flow. Pay-off-early is always available.
- Payment failures → 3-day silent retry → polite reminder → 14 days read-only → 30 days pause (progress freezes, does not reset).
- "Updates forever" means: same tool = always free updates, forever. New products are separate.

## Sequencing

Build in the order shown in `milestones.md`. Each milestone is shippable. Don't add features outside the milestone you're on; if you find something that needs to happen, add it to a `BACKLOG.md` file in the project root and keep going.

## Decisions

When you make a non-obvious choice during the build (data model, library choice, API shape, etc.), log it in a `decisions/` folder with a date-stamped markdown file: what you decided, what other options you considered, and why. This gives Talia a paper trail without slowing her down.

## Tests

Add a test alongside any meaningful feature. Prefer integration tests over unit tests for UI flows. Use the framework's standard test runner (Vitest for Vite, Jest for Next.js, etc.). Aim for "this user flow works end-to-end" coverage, not 100%.

## When you're stuck or need a design choice

- Layout / visual question → look in `designs/Brand System.html` first.
- Hub behavior question → look in `designs/Talia Hub Wireframes v3.html` (section 03 · Hub).
- Voice / copy question → propose 3 options for Talia.
- Architecture question → make a call, log a decision, keep going.

## Things NOT to do

- Don't write code-speak in user-facing UI ("API", "endpoint", "subscription", "backend").
- Don't add features outside the current milestone.
- Don't switch frameworks or major libraries mid-project without logging a decision and getting Talia's nod.
- Don't ship without a release note in plain English.
- Don't add a forever-subscription anywhere. Rent-to-own is rent-to-own.
