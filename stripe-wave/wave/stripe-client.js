#!/usr/bin/env node
/**
 * Minimal Stripe REST client (no SDK).
 * Secrets: ../.env.stripe.local or STRIPE_SECRET_KEY env (GitHub Actions).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.stripe.local');

export function loadStripeEnv(waveEnv = {}) {
  let fileEnv = {};
  if (fs.existsSync(envPath)) {
    fileEnv = Object.fromEntries(
      fs
        .readFileSync(envPath, 'utf8')
        .split('\n')
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    );
  }
  const key =
    process.env.STRIPE_SECRET_KEY ||
    fileEnv.STRIPE_SECRET_KEY ||
    waveEnv.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'Missing STRIPE_SECRET_KEY (set in .env.stripe.local or GitHub Secrets)'
    );
  }
  return { STRIPE_SECRET_KEY: key, STRIPE_API_BASE: 'https://api.stripe.com/v1' };
}

export async function stripeGet(env, pathname, params = {}) {
  const url = new URL(env.STRIPE_API_BASE + pathname);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => url.searchParams.append(`${k}[${i}]`, String(item)));
    } else {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe ${pathname}: ${body.error?.message || res.status}`
    );
  }
  return body;
}

/** Paginate list endpoints that return { data, has_more }. */
export async function stripeListAll(env, pathname, params = {}, { maxPages = 50 } = {}) {
  const out = [];
  let starting_after;
  for (let page = 0; page < maxPages; page++) {
    const body = await stripeGet(env, pathname, {
      ...params,
      limit: params.limit || 100,
      ...(starting_after ? { starting_after } : {}),
    });
    out.push(...(body.data || []));
    if (!body.has_more || !body.data?.length) break;
    starting_after = body.data[body.data.length - 1].id;
  }
  return out;
}

export function centsToCad(cents) {
  return (Math.abs(Number(cents)) / 100).toFixed(2);
}
