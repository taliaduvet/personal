# Stripe → Wave (Talia Duvet books)

Part of the **Personal** GitHub vault. Tuesday cron after Monday Stripe payouts.

## Local
1. Copy env examples → `.env.wave.local` / `.env.stripe.local` (gitignored)
2. `npm run sync:dry` then `npm run sync`

## Schedule
`.github/workflows/stripe-wave-sync.yml` at the Personal repo root.  
Secrets: `docs/STRIPE_WAVE_SECRETS.md`
