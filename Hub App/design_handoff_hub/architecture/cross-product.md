# Cross-product wiring

The Hub is the center; Vein and Ledger orbit it. Three things they share.

## 1. Identity

All three apps point to the **same Supabase project** for auth. A user signing in via the Hub is signed in everywhere.

- Hub at `hub.taliaduvet.com`
- Vein at `vein.taliaduvet.com`
- Ledger at `ledger.taliaduvet.com`

Supabase cookies should be scoped to `.taliaduvet.com` so subdomains share the session. Set this in Supabase's auth config.

## 2. Action color

The user's accent color lives on `users.accent_color`. Both Vein and Ledger should read it on sign-in and apply it via a shared CSS variable.

```css
:root {
  --user-accent: #9b6cff; /* or whatever the user picked */
}
```

Any UI element doing a primary action reads this variable. The Hub's preferences screen is the only place a user changes it.

## 3. Activity events

Each tool POSTs to the Hub's events endpoint when something interesting happens.

```
POST /api/events
{
  "product_id": "vein",
  "kind": "memo_captured",
  "message": "3 memos captured this week · 1 needs transcribing"
}
```

Authenticated via the user's Supabase session. Inserts into `public.events`. The Hub reads these for the today strip.

What counts as "interesting" is a product decision per tool. Some examples:

| Product | Kind | Example message |
|---|---|---|
| vein | `memo_captured` | "3 memos captured this week · 1 needs transcribing" |
| vein | `song_linked` | "linked a fragment to 'porch song'" |
| ledger | `books_synced` | "jun bookkeeping up to date · gst due jul 31" |
| ledger | `gst_due` | "gst remit due in 7 days" |
| production | `dispatch_dropped` | "new concept dispatch · open it" |

Keep it human and rare. The today strip should never feel like a notification fire-hose.

## The "back to your tools" link

In both Vein and Ledger, the top-bar logo or a dedicated link should point to `hub.taliaduvet.com/`. Since the session is shared via the cookie, the user lands on their Hub home with no re-sign-in.

```jsx
<a href="https://hub.taliaduvet.com/">← back to your tools</a>
```

## Future: shared component library

When both Vein and the Hub are React+Vite, extract a small `@talia/ui` package containing: Button, Pill, MonoCap, the action-color hook, and brand tokens. This isn't day-one work but worth doing once there are 3+ apps and the design system feels settled.
