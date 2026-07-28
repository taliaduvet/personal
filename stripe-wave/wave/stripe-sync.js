#!/usr/bin/env node
/**
 * Stripe → Wave sync (Talia Duvet Stripe → Talia Udsen books)
 *
 * Schedule pairing (intentional):
 * - Stripe automatic payouts: Monday (bank settles first)
 * - This sync cron: Tuesday (books catch up after payouts land)
 *
 * Journal shapes (Wave moneyTransactionCreate — verified):
 * 1) Charge/payment: Clearing DEPOSIT gross; Product Sales INCREASE pretax;
 *    GST liability INCREASE tax (explicit CoA line — taxes[] on income does not balance)
 * 2) Fee: Clearing WITHDRAWAL fee; Stripe Processing Fees INCREASE fee (claimable expense)
 * 3) Payout: asset↔asset is not allowed via API — two-step wash via Internal Transfers:
 *    A) Clearing WITHDRAWAL + Internal Transfers DEBIT
 *    B) Wealthsimple DEPOSIT + Internal Transfers CREDIT
 * 4) Refund: reverse of charge (and fee refund if Stripe posts negative fee)
 *
 * Idempotency: externalId = stripe_bt_{id}_{leg}. Duplicate → skip.
 *
 * Usage:
 *   node wave/stripe-sync.js              # live sync
 *   node wave/stripe-sync.js --dry-run    # print planned journals only
 *   STRIPE_SYNC_SINCE=2026-07-01 node wave/stripe-sync.js
 */
import { loadWaveEnv, waveGql, accountMap } from './client.js';
import {
  loadStripeEnv,
  stripeListAll,
  stripeGet,
  centsToCad,
} from './stripe-client.js';

const DRY = process.argv.includes('--dry-run');
const CREATE_MUTATION = `
  mutation($input: MoneyTransactionCreateInput!) {
    moneyTransactionCreate(input: $input) {
      didSucceed
      inputErrors { message path code }
      transaction { id }
    }
  }
`;

const CHARGE_TYPES = new Set(['charge', 'payment']);
const REFUND_TYPES = new Set(['refund', 'payment_refund', 'payment_failure_refund']);
const PAYOUT_TYPES = new Set(['payout']);
const SKIP_TYPES = new Set([
  'payout_cancel',
  'payout_failure',
  'transfer',
  'transfer_refund',
  'reserved_funds',
  'stripe_fx',
  'contribution',
  'topup',
]);

function loadMergedEnv() {
  const wave = loadWaveEnv();
  const stripe = loadStripeEnv(wave);
  return { ...wave, ...stripe };
}

function accounts(env) {
  const map = accountMap(env);
  const gst = env.WAVE_ACCOUNT_GST;
  const wash = env.WAVE_ACCOUNT_INTERNAL_TRANSFERS;
  for (const [k, v] of Object.entries({
    ...map,
    gst,
    wash,
  })) {
    if (!v) throw new Error(`Missing Wave account env for ${k}`);
  }
  return { ...map, gst, wash };
}

function unixToDate(ts) {
  return new Date(Number(ts) * 1000).toISOString().slice(0, 10);
}

function sinceUnix(env) {
  const raw = process.env.STRIPE_SYNC_SINCE || env.STRIPE_SYNC_SINCE;
  if (!raw) {
    // Default: last 90 days on first runs; cron will re-hit idempotent IDs
    return Math.floor(Date.now() / 1000) - 90 * 24 * 3600;
  }
  return Math.floor(new Date(raw).getTime() / 1000);
}

async function createTxn(env, input) {
  if (DRY) {
    console.log('[dry-run]', input.externalId, input.description, JSON.stringify(input.anchor), JSON.stringify(input.lineItems));
    return { status: 'dry-run' };
  }
  const data = await waveGql(env, CREATE_MUTATION, {
    input: { businessId: env.WAVE_BUSINESS_ID, ...input },
  });
  const out = data.moneyTransactionCreate;
  if (out.didSucceed) return { status: 'created', id: out.transaction?.id };
  const msg = out.inputErrors?.map((e) => e.message).join('; ') || 'unknown';
  if (/same externalId already exists/i.test(msg)) {
    return { status: 'exists' };
  }
  throw new Error(`${input.externalId}: ${msg}`);
}

async function taxCentsFromSource(stripeEnv, bt) {
  const source = bt.source;
  if (!source || typeof source === 'string') {
    // Re-fetch BT with expand if needed
    try {
      const full = await stripeGet(stripeEnv, `/balance_transactions/${bt.id}`, {
        'expand[]': 'source',
      });
      return taxFromChargeLike(full.source);
    } catch {
      return 0;
    }
  }
  return taxFromChargeLike(source);
}

function taxFromChargeLike(source) {
  if (!source || typeof source !== 'object') return 0;
  // Checkout / PaymentIntent tax details surface in a few shapes
  const candidates = [
    source.amount_tax,
    source.tax,
    source.total_details?.amount_tax,
    source.invoice?.total_tax_amounts?.[0]?.amount,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && c > 0) return c;
  }
  return 0;
}

async function postSale(env, acct, bt, { reverse = false } = {}) {
  const grossCents = Math.abs(bt.amount);
  let taxCents = await taxCentsFromSource(env, bt);
  if (taxCents > grossCents) taxCents = 0;
  const pretaxCents = grossCents - taxCents;
  const gross = centsToCad(grossCents);
  const pretax = centsToCad(pretaxCents);
  const tax = centsToCad(taxCents);
  const date = unixToDate(bt.created);
  const leg = reverse ? 'refund' : 'sale';
  const externalId = `stripe_bt_${bt.id}_${leg}`;
  const desc = reverse
    ? `Stripe refund ${bt.id}`
    : `Stripe ${bt.type} ${bt.id}`;

  const lineItems = [
    {
      accountId: acct.productSales,
      amount: pretax,
      balance: reverse ? 'DECREASE' : 'INCREASE',
      description: reverse ? 'Refund (pre-tax)' : 'Product sales (pre-tax)',
    },
  ];
  if (Number(tax) > 0) {
    lineItems.push({
      accountId: acct.gst,
      amount: tax,
      balance: reverse ? 'DECREASE' : 'INCREASE',
      description: 'GST/HST',
    });
  }

  return createTxn(env, {
    externalId,
    date,
    description: desc,
    notes: `stripe_balance_transaction=${bt.id}; type=${bt.type}; net=${bt.net}; fee=${bt.fee}`,
    anchor: {
      accountId: acct.stripeClearing,
      amount: gross,
      direction: reverse ? 'WITHDRAWAL' : 'DEPOSIT',
    },
    lineItems,
  });
}

async function postFee(env, acct, bt, { reverse = false } = {}) {
  const feeCents = Math.abs(bt.fee || 0);
  if (!feeCents) return { status: 'skip', reason: 'no-fee' };
  const fee = centsToCad(feeCents);
  const date = unixToDate(bt.created);
  const leg = reverse ? 'fee_refund' : 'fee';
  return createTxn(env, {
    externalId: `stripe_bt_${bt.id}_${leg}`,
    date,
    description: reverse
      ? `Stripe fee refund ${bt.id}`
      : `Stripe processing fee ${bt.id}`,
    notes: `stripe_balance_transaction=${bt.id}; claimable payment processing expense`,
    anchor: {
      accountId: acct.stripeClearing,
      amount: fee,
      direction: reverse ? 'DEPOSIT' : 'WITHDRAWAL',
    },
    lineItems: [
      {
        accountId: acct.stripeFees,
        amount: fee,
        balance: reverse ? 'DECREASE' : 'INCREASE',
        description: 'Stripe processing fees',
      },
    ],
  });
}

async function postPayout(env, acct, bt) {
  // Payout BT amount is negative when money leaves Stripe balance
  const amount = centsToCad(bt.amount);
  const date = unixToDate(bt.created);
  const base = `stripe_bt_${bt.id}`;

  const a = await createTxn(env, {
    externalId: `${base}_payout_clearing`,
    date,
    description: `Stripe payout → wash ${bt.id}`,
    notes: `stripe_balance_transaction=${bt.id}; Monday payout schedule → Wealthsimple`,
    anchor: {
      accountId: acct.stripeClearing,
      amount,
      direction: 'WITHDRAWAL',
    },
    lineItems: [
      {
        accountId: acct.wash,
        amount,
        balance: 'DEBIT',
        description: 'Internal transfer (Stripe clearing out)',
      },
    ],
  });

  const b = await createTxn(env, {
    externalId: `${base}_payout_bank`,
    date,
    description: `Stripe payout → Wealthsimple ${bt.id}`,
    notes: `stripe_balance_transaction=${bt.id}`,
    anchor: {
      accountId: acct.wealthsimple,
      amount,
      direction: 'DEPOSIT',
    },
    lineItems: [
      {
        accountId: acct.wash,
        amount,
        balance: 'CREDIT',
        description: 'Internal transfer (into Wealthsimple)',
      },
    ],
  });

  return { clearing: a, bank: b };
}

async function syncBalanceTransaction(env, acct, bt) {
  const type = bt.type;
  if (SKIP_TYPES.has(type)) {
    return { id: bt.id, type, status: 'skipped' };
  }

  if (PAYOUT_TYPES.has(type)) {
    if (bt.amount >= 0) {
      // payout reversal / failure credit — rare; treat as reverse wash
      return { id: bt.id, type, status: 'skipped_payout_credit' };
    }
    const r = await postPayout(env, acct, bt);
    return { id: bt.id, type, status: 'payout', ...r };
  }

  if (CHARGE_TYPES.has(type) && bt.amount > 0) {
    const sale = await postSale(env, acct, bt, { reverse: false });
    const fee = await postFee(env, acct, bt, { reverse: false });
    return { id: bt.id, type, sale, fee };
  }

  if (REFUND_TYPES.has(type) || (CHARGE_TYPES.has(type) && bt.amount < 0)) {
    const sale = await postSale(env, acct, bt, { reverse: true });
    // Negative fee on refund BT → fee refund
    const fee =
      bt.fee && bt.fee < 0
        ? await postFee(env, acct, bt, { reverse: true })
        : { status: 'skip', reason: 'no-fee-refund' };
    return { id: bt.id, type, sale, fee };
  }

  // Standalone stripe_fee rows (if any)
  if (type === 'stripe_fee' && bt.fee) {
    const fee = await postFee(env, acct, { ...bt, fee: bt.amount || bt.fee }, { reverse: bt.amount > 0 });
    return { id: bt.id, type, fee };
  }

  return { id: bt.id, type, status: 'unhandled' };
}

async function main() {
  const env = loadMergedEnv();
  const acct = accounts(env);
  const createdGte = sinceUnix(env);

  console.log(
    JSON.stringify(
      {
        dryRun: DRY,
        business: env.WAVE_BUSINESS_NAME || env.WAVE_BUSINESS_ID,
        since: new Date(createdGte * 1000).toISOString(),
        scheduleNote: 'Stripe payouts Monday; Wave sync Tuesday',
      },
      null,
      2
    )
  );

  const txs = await stripeListAll(
    env,
    '/balance_transactions',
    {
      'created[gte]': createdGte,
      'expand[]': 'data.source',
    },
    { maxPages: 100 }
  );

  // Oldest first so clearing builds before payouts
  txs.sort((a, b) => a.created - b.created);

  const summary = {
    scanned: txs.length,
    created: 0,
    exists: 0,
    dryRun: 0,
    skipped: 0,
    unhandled: 0,
    errors: [],
  };

  for (const bt of txs) {
    try {
      const result = await syncBalanceTransaction(env, acct, bt);
      const statuses = JSON.stringify(result);
      if (/unhandled/.test(statuses)) summary.unhandled++;
      else if (/skipped/.test(statuses)) summary.skipped++;
      if (/created/.test(statuses)) summary.created++;
      if (/exists/.test(statuses)) summary.exists++;
      if (/dry-run/.test(statuses)) summary.dryRun++;
      console.log(statuses);
    } catch (err) {
      summary.errors.push({ id: bt.id, error: String(err.message || err) });
      console.error('ERROR', bt.id, err.message || err);
    }
  }

  console.log('SUMMARY', JSON.stringify(summary, null, 2));
  if (summary.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
