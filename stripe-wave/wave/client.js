#!/usr/bin/env node
/**
 * Wave client helpers for Talia Udsen books.
 * Secrets: ../.env.wave.local (gitignored)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.wave.local');

export function loadWaveEnv() {
  const env = Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
  for (const k of ['WAVE_FULL_ACCESS_TOKEN', 'WAVE_BUSINESS_ID', 'WAVE_GRAPHQL_URL']) {
    if (!env[k]) throw new Error(`Missing ${k} in .env.wave.local`);
  }
  return env;
}

export async function waveGql(env, query, variables = {}) {
  const res = await fetch(env.WAVE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WAVE_FULL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(JSON.stringify(body.errors, null, 2));
  }
  return body.data;
}

export function accountMap(env) {
  return {
    wealthsimple: env.WAVE_ACCOUNT_WEALTHSIMPLE,
    productSales: env.WAVE_ACCOUNT_PRODUCT_SALES,
    sessionStudio: env.WAVE_ACCOUNT_SESSION_STUDIO,
    stripeClearing: env.WAVE_ACCOUNT_STRIPE_CLEARING,
    stripeFees: env.WAVE_ACCOUNT_STRIPE_FEES,
    gst: env.WAVE_ACCOUNT_GST,
    wash: env.WAVE_ACCOUNT_INTERNAL_TRANSFERS,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = loadWaveEnv();
  const data = await waveGql(
    env,
    `query($id: ID!) {
      business(id: $id) {
        name
        isClassicAccounting
        currency { code }
      }
    }`,
    { id: env.WAVE_BUSINESS_ID }
  );
  console.log(JSON.stringify({ business: data.business, accounts: accountMap(env) }, null, 2));
}
