# Hub · routes

Every page in the Hub, what it does, and which design file shows it.

## Public routes (no sign-in needed)

| Path | What it is | Design reference |
|---|---|---|
| `/sign-in` | Magic-link sign-in. Email field, "send magic link" button, plus a "sign in with Google" option. | `Talia Hub Wireframes v3.html` section 04 · Auth |
| `/auth/callback` | Magic-link returns here. Verifies the link and sends the user to `/`. | (no UI — redirect) |
| `/welcome` | First-time onboarding after a new user signs in. 5 steps: name, drive, mic, install, action color. | `Talia Hub Wireframes v3.html` section 04 · Onboarding |

## Signed-in routes

| Path | What it is | Design reference |
|---|---|---|
| `/` | Hub home: greeting, today strip, action-color preference, tool tiles, R2O progress, downloads, licenses. | `Talia Hub Wireframes v3.html` section 03 · Hub |
| `/tools` | Same content as `/`, focused on the tool tiles. (May just be a scroll anchor on `/`.) | section 03 |
| `/rent-to-own` | Detailed R2O view for any active rental: paid so far, remaining, payment schedule, change-pace UI. | section 03 (the R2O card expanded) |
| `/downloads` | List of every install link for every tool the user owns (iOS, Android, web, PWA install instructions). | section 03 (downloads section) |
| `/licenses` | License keys per owned tool, copy-to-clipboard, status (owned / rent-to-own). | section 03 (license keys section) |
| `/billing` | Stripe customer portal — change card, view invoices, download receipts. (Stripe-hosted.) | (Stripe's own UI) |
| `/preferences` | Action color picker, email digest setting, notifications, data export. | section 03 (preferences card) + section 05 Vein settings for picker pattern |

## API-like routes (server-side only)

| Path | What it does |
|---|---|
| `POST /api/stripe/webhook` | Receives Stripe events: `checkout.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, etc. Updates Supabase ownership rows. |
| `POST /api/events` | Internal endpoint that Vein and Ledger call to log events for the today strip. |

## Navigation

- Top bar: logo (links to `/`), avatar (menu → preferences, billing, sign out)
- Left sidebar: home · tools · rent-to-own · downloads · licenses · billing · preferences
- All sidebar entries route to the routes above

## "Back to your tools" link

Both Vein and Ledger should have a `← back to your tools` link in their top bar that goes to `hub.taliaduvet.com/`. Pass the user's session through so they're not asked to sign in again. See `architecture/cross-product.md`.
