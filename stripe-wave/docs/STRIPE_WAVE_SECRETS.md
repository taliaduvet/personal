# Stripe → Wave sync — GitHub Secrets checklist

Add these under **GitHub → personal repo → Settings → Secrets and variables → Actions**:

| Secret | Source |
|--------|--------|
| `STRIPE_SECRET_KEY` | Restricted key (see below) |
| `WAVE_FULL_ACCESS_TOKEN` | From `.env.wave.local` |
| `WAVE_BUSINESS_ID` | From `.env.wave.local` |
| `WAVE_GRAPHQL_URL` | `https://gql.waveapps.com/graphql/public` |
| `WAVE_ACCOUNT_WEALTHSIMPLE` | From `.env.wave.local` |
| `WAVE_ACCOUNT_PRODUCT_SALES` | From `.env.wave.local` |
| `WAVE_ACCOUNT_STRIPE_CLEARING` | From `.env.wave.local` |
| `WAVE_ACCOUNT_STRIPE_FEES` | From `.env.wave.local` |
| `WAVE_ACCOUNT_GST` | From `.env.wave.local` |
| `WAVE_ACCOUNT_INTERNAL_TRANSFERS` | From `.env.wave.local` |
| `STRIPE_SYNC_SINCE` (optional) | e.g. `2026-07-01` |

## Create Stripe restricted key

1. Open https://dashboard.stripe.com/apikeys  
2. **Create restricted key**  
3. Grant **Read** on: Balance, Balance transactions, Charges, Payouts, Payment Intents  
4. Paste into local `.env.stripe.local` and GitHub Secret `STRIPE_SECRET_KEY`

## Workflow

`.github/workflows/stripe-wave-sync.yml` — **Tuesdays** 14:00 UTC (after **Monday** Stripe payouts).
