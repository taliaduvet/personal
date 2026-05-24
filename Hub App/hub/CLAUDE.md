# Claude Code — Hub & Workspace

## At the start of every session

Query the workspace to get current context before doing any work. Run these in parallel:

1. **Active sprint** — `select title, status, sprint_label from workspace_tasks order by position` (for each product that has active tasks)
2. **Open decisions** — `select title, status, tags from workspace_decisions where status = 'open' order by position`
3. **Spec** — `select product_id, content from workspace_docs where section = 'spec'`
4. **Milestone status** — `select product_id, number, title, status from workspace_milestones order by product_id, position`

Supabase project ID: `feodlwvjcayfgujkxcxm`

Summarise what you find in plain English before starting work — active sprint, what's in progress, any open decisions that might be relevant. If Talia doesn't specify a product, assume the one with the most active sprint tasks.

## About this project

This codebase has two parts:

- **Hub** (`/`) — customer-facing. Where customers sign in, see their tools, manage rent-to-own, billing, downloads.
- **Workspace** (`/workspace/:productId`) — Talia-only (admin-gated to `hey@taliaduvet.com`). The internal product management tool — spec, sprint, decisions, milestones, inbox, Claude co-pilot.

Stack: React 18 + Vite + TypeScript + React Router + Supabase JS. No Tailwind — styling uses `brand.css` (CSS custom properties + utility classes). All brand tokens are in `src/brand.css`.

## Voice rules (apply to all UI copy)

- Lowercase by default
- Plain, warm, dry — a real person wrote this
- No marketing words ("seamless", "unlock", "supercharge")
- No exclamation marks unless the sentence earns one
- Error messages own the problem, don't blame the user

## Brand

- **Paper surface** (cream + ink) — all working surfaces including the workspace and hub
- **Cosmic surface** (deep navy + cream) — marketing-facing only (sign-in poster side)
- **Violet** is the only loud accent color — use sparingly
- `--user-accent` CSS variable = the user's chosen action color (default violet `#9b6cff`)

## Build rules

- Don't add features outside what Talia asked for in this session
- If something needs to happen but is out of scope, note it here in a `BACKLOG.md` and keep going
- Log non-obvious architectural decisions in `decisions/` with a date-stamped markdown file
- Prefer editing existing files over creating new ones
- No comments in code unless the WHY is non-obvious
