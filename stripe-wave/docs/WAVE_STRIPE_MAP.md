# Wave ↔ Stripe mapping — Talia Udsen

Business: **Talia Udsen** (CAD)  
Stripe: **Talia Duvet** (`acct_1TyFKL2KXMPtRZ4w`)

## Schedule pairing (do not change casually)

| System | Cadence | Why |
|--------|---------|-----|
| Stripe automatic payouts | **Monday** | Funds leave Stripe → Wealthsimple |
| GitHub Action `stripe-wave-sync` | **Tuesday** ~14:00 UTC | Books catch up after Monday payouts settle |

Payout schedule page: https://dashboard.stripe.com/settings/payouts

## Chart of accounts

| Role | Account | Subtype |
|------|---------|---------|
| Product / artist bank | Wealthsimple Chequing | Cash & Bank |
| Misfit / personal ops bank | Tangerine Chequing | Cash & Bank (existing) |
| Product income (merch + digital) | Product Sales | Income |
| Session / studio | Session / Studio Income | Income |
| Misfit contractor income | Contractor work | Income (existing) |
| Stripe in-flight balance | Stripe Clearing | Money in Transit |
| Stripe fees (claimable) | Stripe Processing Fees | Payment Processing Fee |
| GST collected | GST (liability CoA) | Sales Tax |
| Payout wash (API only) | Internal Transfers | Other Current Liability |

Archived CoA (do not use): **Digital Tools & Donations** income account — product of the same name still maps to **Product Sales**.

## Transaction recipe (implemented in `wave/stripe-sync.js`)

### 1. Donation / charge succeeds
- **Debit** Stripe Clearing = total charged (CAD, incl. tax)
- **Credit** Product Sales = amount before tax
- **Credit** GST liability = tax portion (from Stripe Tax when registration is active)

### 2. Stripe fee (business expense — claimable)
- **Debit** Stripe Processing Fees = fee
- **Credit** Stripe Clearing = fee

### 3. Payout lands in Wealthsimple (two API steps — Wave cannot asset↔asset)
- A: Clearing ↓ + Internal Transfers (DEBIT)
- B: Wealthsimple ↑ + Internal Transfers (CREDIT)

After (1)+(2)+(3), Stripe Clearing and Internal Transfers should net ~0 for that batch.

## Idempotency

Each Wave `moneyTransactionCreate` uses `externalId` like `stripe_bt_{id}_sale`. Re-runs skip duplicates.

## Private Grant Planning Tool URLs

Tool is free; Support / Chip in opens the Stripe Payment Link.

- Studio OS (Netlify): `https://studio-os.netlify.app/tools/grant-budget/`
- GitHub Pages mirror: `https://taliaduvet.github.io/personal/tools/grant-budget/`
- Stripe donate link: `https://donate.stripe.com/14AeV66zka8L6Ea6WG5AQ00`

Not linked from public nav (`noindex`). Share the URL directly.

## Run locally

```bash
cd accounting-app
# copy .env.stripe.local.example → .env.stripe.local and paste restricted key
node wave/stripe-sync.js --dry-run
node wave/stripe-sync.js
```

## Secrets

Local: `accounting-app/.env.wave.local`, `.env.stripe.local` (gitignored).  
GitHub Actions: repo Secrets listed in `.github/workflows/stripe-wave-sync.yml`.
