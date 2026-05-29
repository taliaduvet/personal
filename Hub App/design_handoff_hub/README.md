# Handoff: Talia Duvet · Hub

## Overview

The **Hub** is the user's home across all of Talia Duvet's tools (Vein, Ledger, Production, and future ones). It's where someone lands after they buy or sign in, and the single source of truth for their library, rent-to-own progress, billing, and the action-color preference that follows them across every tool.

It does not exist as code yet. This handoff doubles as the build spec.

## About the design files

The files in `designs/` are **HTML prototypes** — they show intended look and behavior, not production code. The task is to recreate them in a real codebase using a chosen framework (see `architecture/stack.md` for options). The brand tokens in `designs/brand.css` ARE production-ready and should be copied / converted directly into the chosen framework's token system.

## Fidelity

**High-fidelity for visuals, plain-English for copy.** Colors, typography, spacing, and layout in the designs are intentional and should be matched closely. The copy on every screen is the final voice — keep it as-is unless there's a functional reason to change it.

## What's in this folder

| Folder / file | What it is |
|---|---|
| `README.md` | This file — the orientation |
| `CLAUDE.md` | Voice rules, brand rules, what not to do. Claude Code reads this automatically. |
| `milestones.md` | What "done" looks like for the Hub, in shippable order |
| `designs/` | The design files. Open in a browser to see. |
| `architecture/stack.md` | Three recommended stack options + a recommendation |
| `architecture/routes.md` | Every page in the Hub and what it does |
| `architecture/supabase-schema.sql` | Starter database tables |
| `architecture/auth-flow.md` | Magic-link via Supabase, optional Google |
| `architecture/stripe-r2o.md` | How rent-to-own maps to Stripe |
| `architecture/cross-product.md` | How Vein and Ledger link back to the Hub |

## The Hub in one paragraph

A signed-in user lands on the Hub. They see a welcome line, a "today" strip showing what's happening across their tools, an action-color picker (their preference that propagates to every tool), tiles for each tool they own or are renting, downloads, license keys, billing, and account preferences. That's it. The Hub is the calm room with all the doors.

## Where to start

Open `milestones.md` and start at milestone 1. Don't skip ahead. Each milestone is shippable on its own, so you can stop after any of them and have something real.

## What the design files contain

- **`Talia Hub Wireframes v3.html`** — open this and scroll to **section 03 · Hub**. That artboard is the Hub itself. The other sections (product detail pages, pricing, etc.) are adjacent context.
- **`Brand System.html`** — the canonical brand documentation: surfaces (cosmic for marketing, paper for working), colors, type, components.
- **`brand.css`** — the actual production tokens. Import or copy these.
- **`Homepage.html`** — marketing surface. The Hub borrows nothing visual from this except the brand tokens.
- **`Workspace v2.html`** — the internal tool Talia uses. Not user-facing, but useful for understanding how the team works.

## Important contracts the Hub provides to other tools

1. **One source of truth for who the user is.** Vein and Ledger should both read identity from the Hub's Supabase user record. No second auth systems.
2. **One action-color preference**, stored on the user record. When the user picks a color in the Hub's preferences, Vein and Ledger both reflect it via a shared CSS variable.
3. **One billing surface.** All Stripe webhooks land in the Hub. Rent-to-own progress, payment failures, and license issuance happen here.
4. **Cross-tool activity feed.** The Hub aggregates events from each tool ("3 memos captured this week", "jun bookkeeping up to date") into the today strip.

## Stack choice

See `architecture/stack.md` for three options + a recommendation. The other architecture docs assume the recommended stack but will mostly apply to any choice.
