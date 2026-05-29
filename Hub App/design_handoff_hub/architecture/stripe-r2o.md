# Stripe · rent-to-own

How the rent-to-own model maps to Stripe.

## The rules

- Floor: **$5/month**
- Cap: **24 months**
- Effective max duration per tool: `min(24 months, tool_price ÷ $5)`
- User picks the duration (and therefore the monthly amount) at checkout
- User can change pace mid-flow (within the cap), within the floor
- User can pay off early at any time
- Failed cards: 3-day silent retry → email reminder → 14 days read-only → 30 days pause (progress freezes, does not reset)

## How this maps to Stripe

Stripe doesn't have a "rent-to-own" primitive, so we model it with **one-time payments triggered on a schedule**, not subscriptions.

### Option 1 · Stripe Subscriptions with a fixed end date  ★ recommended

- Create a Stripe Price for each (product, duration) combo. E.g. for Vein 12-month: $25.00/month price.
- At checkout, create a Subscription with `cancel_at` set to the end of the chosen term.
- Each month, Stripe charges automatically.
- After the final payment, the subscription cancels (handled by `cancel_at`).
- Webhook on `customer.subscription.deleted` → mark ownership as `completed`.

### Option 2 · Scheduled one-time payments

- At checkout, take the first payment as a one-time charge.
- Schedule the rest using Stripe's `PaymentIntent` + a cron job in our app.
- More code, more failure modes, more flexible.

**Pick Option 1.** Stripe's Subscriptions API is more battle-tested. We get retry logic and dunning emails for free.

## Pricing structure in Stripe

For each product, create one **product** in Stripe with multiple **prices**:

- One-time price (the buy-once amount, e.g. $300 for Vein)
- A monthly price for each common duration (3, 6, 12, 18, 24 months)
  - Or one parameterized price with `quantity` representing months — depends on Stripe API capabilities at build time

The Hub's checkout flow:
1. User picks duration with the slider (see designs/Talia Hub Wireframes v3.html section 02 · Pricing)
2. Hub sends them to Stripe Checkout with the matching Price ID
3. After success, webhook updates ownership

## Change-pace mid-flow

User wants to switch from 12-month to 6-month? Two options:

- **A.** Cancel the current subscription, create a new one with the new monthly amount and remaining months. Carry over the `months_paid` count.
- **B.** Update the subscription's price + remaining cycle count using Stripe's `subscription.update` endpoint.

**Pick A** for simplicity unless Stripe's API makes B easier when you get there.

## Pay-off-early

- User taps "pay off now"
- We calculate the remaining amount (`total - months_paid × monthly`)
- Create a one-time Stripe Checkout for that amount
- On success, cancel the subscription, mark ownership as `owned`

## Card failure handling

Stripe handles retries automatically (their "Smart Retries" feature). We layer our own UX on top:

- Day 0: card fails → Stripe retries silently
- Day 3: Stripe still retrying → show a banner in the Hub: *"your card was declined · we'll keep trying for 14 days"*
- Day 7: send a polite email: *"hey, your card for [tool] keeps getting declined. update it when you can — your stuff is safe."*
- Day 14: tool goes read-only. Show a calm message in the tool itself, link to update card.
- Day 30: ownership status goes `paused`. Progress is frozen. Resuming requires updating the card; progress picks up where it left off.

Implement this with a daily cron job that checks `ownership` rows with failed payments.

## Test mode

- Use Stripe test keys throughout dev
- Test card: `4242 4242 4242 4242`, any future date, any CVC
- Test failure card: `4000 0000 0000 9995` (always declines)
- Test the full flow in test mode before going live: buy once, rent-to-own, pay off early, change pace, fail a card, recover, finish a rental

## Going live

- Switch Stripe keys to live mode (separate env)
- Stripe requires real business info — Talia should have this set up in her Stripe dashboard
- Webhook endpoint must be reachable (use Stripe CLI to forward during dev)
- Don't enable live mode until M7 in `milestones.md`
