#!/usr/bin/env bash
# Load GitHub Actions secrets for Stripe → Wave from local env files.
# Requires: gh auth login  (once)
set -euo pipefail
cd "$(dirname "$0")/.."
test -f .env.wave.local || { echo "Missing .env.wave.local"; exit 1; }
test -f .env.stripe.local || { echo "Missing .env.stripe.local — add STRIPE_SECRET_KEY first"; exit 1; }

get() { grep -E "^$1=" "$2" | head -1 | cut -d= -f2-; }

REPO="taliaduvet/personal"

gh secret set WAVE_FULL_ACCESS_TOKEN --repo "$REPO" --body "$(get WAVE_FULL_ACCESS_TOKEN .env.wave.local)"
gh secret set WAVE_BUSINESS_ID --repo "$REPO" --body "$(get WAVE_BUSINESS_ID .env.wave.local)"
gh secret set WAVE_GRAPHQL_URL --repo "$REPO" --body "$(get WAVE_GRAPHQL_URL .env.wave.local)"
gh secret set WAVE_ACCOUNT_WEALTHSIMPLE --repo "$REPO" --body "$(get WAVE_ACCOUNT_WEALTHSIMPLE .env.wave.local)"
gh secret set WAVE_ACCOUNT_PRODUCT_SALES --repo "$REPO" --body "$(get WAVE_ACCOUNT_PRODUCT_SALES .env.wave.local)"
gh secret set WAVE_ACCOUNT_STRIPE_CLEARING --repo "$REPO" --body "$(get WAVE_ACCOUNT_STRIPE_CLEARING .env.wave.local)"
gh secret set WAVE_ACCOUNT_STRIPE_FEES --repo "$REPO" --body "$(get WAVE_ACCOUNT_STRIPE_FEES .env.wave.local)"
gh secret set WAVE_ACCOUNT_GST --repo "$REPO" --body "$(get WAVE_ACCOUNT_GST .env.wave.local)"
gh secret set WAVE_ACCOUNT_INTERNAL_TRANSFERS --repo "$REPO" --body "$(get WAVE_ACCOUNT_INTERNAL_TRANSFERS .env.wave.local)"
gh secret set STRIPE_SECRET_KEY --repo "$REPO" --body "$(get STRIPE_SECRET_KEY .env.stripe.local)"
gh secret set STRIPE_SYNC_SINCE --repo "$REPO" --body "2026-07-01"

echo "Secrets set on $REPO. Trigger: gh workflow run stripe-wave-sync.yml --repo $REPO"
