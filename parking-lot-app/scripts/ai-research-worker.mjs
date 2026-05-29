#!/usr/bin/env node
/**
 * Processes ⚡ research queue in Supabase device_preferences (no Claude).
 * Uses Google Gemini Flash with built-in Google Search (Brave optional). Run on a schedule or manually.
 *
 * Setup: copy scripts/ai-worker.env.example → scripts/ai-worker.env
 * Run:   npm run ai:process-queue
 * Watch: npm run ai:watch  (every 10 min while terminal is open)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(SCRIPT_DIR, 'ai-worker.env');
const STATE_PATH = join(SCRIPT_DIR, '.ai-worker-state.json');

function loadEnv(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path} — copy ai-worker.env.example and fill in keys.`);
  }
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function readDailyCount() {
  if (!existsSync(STATE_PATH)) return { date: todayUtc(), count: 0 };
  try {
    const s = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    if (s.date === todayUtc()) return { date: s.date, count: Number(s.count) || 0 };
  } catch (_) { /* ignore */ }
  return { date: todayUtc(), count: 0 };
}

function writeDailyCount(count) {
  writeFileSync(STATE_PATH, JSON.stringify({ date: todayUtc(), count }, null, 2));
}

async function supabaseFetch(env, path, options = {}) {
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const url = `${base}/rest/v1/${path}`;
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(url, { ...options, headers });
  return res;
}

async function loadPreferences(env) {
  const id = encodeURIComponent(env.DEVICE_SYNC_ID);
  const res = await supabaseFetch(
    env,
    `device_preferences?device_sync_id=eq.${id}&select=preferences,updated_at`,
    { method: 'GET', headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (!rows?.length) throw new Error(`No device_preferences row for sync id: ${env.DEVICE_SYNC_ID}`);
  return rows[0].preferences || {};
}

async function savePreferences(env, preferences) {
  const res = await supabaseFetch(env, 'device_preferences', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      device_sync_id: env.DEVICE_SYNC_ID,
      preferences,
      updated_at: new Date().toISOString()
    })
  });
  if (!res.ok) throw new Error(`Supabase save failed: ${res.status} ${await res.text()}`);
}

async function braveSearch(env, query) {
  const q = encodeURIComponent(query.slice(0, 400));
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${q}&count=8`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': env.BRAVE_API_KEY }
  });
  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);
  const data = await res.json();
  const results = data?.web?.results || [];
  return results.slice(0, 8).map((r) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: (r.description || '').slice(0, 400)
  }));
}

function geminiModel(env) {
  return (env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
}

async function geminiGenerate(env, body) {
  const model = geminiModel(env);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini failed: ${res.status} ${errText.slice(0, 280)}`);
  }
  return res.json();
}

function linksFromGrounding(data) {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const links = [];
  for (const c of chunks) {
    const uri = c?.web?.uri || c?.retrievedContext?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    links.push({
      title: String(c.web?.title || uri).slice(0, 200),
      url: String(uri).slice(0, 2000),
      note: undefined
    });
    if (links.length >= 6) break;
  }
  return links;
}

function normalizeResearchResult(parsed, fallbackSummary, groundingLinks) {
  const links = Array.isArray(parsed?.links) && parsed.links.length
    ? parsed.links
        .filter((l) => l && (l.url || l.title))
        .slice(0, 6)
        .map((l) => ({
          title: String(l.title || l.url || 'Link').slice(0, 200),
          url: String(l.url || '#').slice(0, 2000),
          note: l.note ? String(l.note).slice(0, 200) : undefined
        }))
    : groundingLinks;
  return {
    type: 'research',
    summary: String(parsed?.summary || fallbackSummary || 'Research completed.').slice(0, 2000),
    links,
    createdAt: Date.now()
  };
}

/** Gemini + Google Search grounding (no Brave). */
async function geminiResearchWithGoogleSearch(env, taskText, userPrompt) {
  const prompt = `You are a helpful research assistant. The user queued this on a personal task board.

Task: ${taskText}
Request: ${userPrompt}

Search the web for current, useful information. Then respond in plain language with:
1) A practical 2-4 sentence summary
2) A short list of the best links (title + URL) when you find them`;

  const data = await geminiGenerate(env, {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }]
  });
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('\n')
    .trim();
  const groundingLinks = linksFromGrounding(data);

  const formatData = await geminiGenerate(env, {
    contents: [
      {
        parts: [
          {
            text: `Turn this research into JSON only:\n\n${text}\n\nSources:\n${groundingLinks.map((l) => l.url).join('\n')}\n\nShape: {"summary":"...","links":[{"title":"...","url":"https://...","note":"..."}]}`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  });
  const formatText = formatData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let parsed;
  try {
    parsed = JSON.parse(formatText);
  } catch {
    const m = formatText.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }
  return normalizeResearchResult(parsed, text, groundingLinks);
}

async function geminiResearch(env, taskText, userPrompt, searchHits) {
  const searchBlock = searchHits
    .map((h, i) => `${i + 1}. ${h.title}\n   URL: ${h.url}\n   ${h.snippet}`)
    .join('\n\n');

  const prompt = `You are a helpful research assistant. The user queued this research on a personal task board.

Task on their board: ${taskText}
What they asked for: ${userPrompt}

Web search results:
${searchBlock || '(no search results — give best-effort guidance from the request only)'}

Return ONLY valid JSON (no markdown) with this shape:
{"summary":"2-4 sentences, practical and specific","links":[{"title":"string","url":"https://...","note":"optional one line why it matters"}]}
Include 3-5 links when search results exist; use URLs from the search results when possible.`;

  const data = await geminiGenerate(env, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: 1024
    }
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Gemini returned non-JSON');
    parsed = JSON.parse(m[0]);
  }
  return normalizeResearchResult(parsed, null, []);
}

function formatResearchNoteText(prompt, result) {
  const lines = ['⚡ Research completed'];
  const p = (prompt || '').trim();
  if (p) lines.push(`Request: ${p}`);
  const summary = (result?.summary || '').trim();
  if (summary) {
    lines.push('');
    lines.push(summary);
  }
  const links = Array.isArray(result?.links) ? result.links : [];
  if (links.length) {
    lines.push('');
    lines.push('Links:');
    links.forEach((l) => {
      const title = (l.title || l.url || 'Link').trim();
      const url = (l.url || '').trim();
      lines.push(url ? `• ${title} — ${url}` : `• ${title}`);
    });
  }
  return lines.join('\n');
}

function completeResearchSessionOnItem(item, prompt, result) {
  if (!item.sessions) item.sessions = [];
  const idx = item.sessions.findIndex((s) => s.sessionType === 'research_queued');
  const now = new Date().toISOString();
  const entry = {
    id: idx >= 0 ? item.sessions[idx].id : 'research_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    start: idx >= 0 ? item.sessions[idx].start : now,
    end: now,
    durationSeconds: 0,
    notes: formatResearchNoteText(prompt, result),
    paused: false,
    aiPickup: null,
    sessionType: 'research'
  };
  if (idx >= 0) item.sessions[idx] = entry;
  else item.sessions.push(entry);
}

function queuedTasks(prefs) {
  const items = prefs.__items;
  if (!Array.isArray(items)) return [];
  return items.filter((i) => i && i.aiAction === 'research' && (i.aiActionPrompt || '').trim());
}

async function processOne(env, item) {
  const prompt = item.aiActionPrompt;
  const query = [item.text, prompt].filter(Boolean).join(' — ');
  console.log(`  → researching: ${item.text.slice(0, 60)}…`);
  const useBrave = !!(env.BRAVE_API_KEY && env.BRAVE_API_KEY.trim());
  const result = useBrave
    ? await geminiResearch(env, item.text, prompt, await braveSearch(env, query))
    : await geminiResearchWithGoogleSearch(env, item.text, prompt);
  item.aiResult = result;
  item.aiResultRead = false;
  item.aiAction = null;
  return { result, prompt };
}

const WATCH_MS = 10 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCycle(env) {
  const maxPerRun = Math.max(1, Math.min(10, Number(env.MAX_JOBS_PER_RUN) || 3));
  const maxPerDay = Math.max(1, Math.min(50, Number(env.MAX_JOBS_PER_DAY) || 15));

  let daily = readDailyCount();
  if (daily.count >= maxPerDay) {
    console.log(`Daily cap reached (${maxPerDay}). Try again tomorrow.`);
    return;
  }

  const prefs = await loadPreferences(env);
  const queue = queuedTasks(prefs);
  if (!queue.length) {
    console.log('No queued research tasks.');
    return;
  }

  const remainingToday = maxPerDay - daily.count;
  const batch = queue.slice(0, Math.min(maxPerRun, remainingToday));
  console.log(`Processing ${batch.length} of ${queue.length} queued task(s)…`);

  for (const item of batch) {
    try {
      const { result, prompt } = await processOne(env, item);
      completeResearchSessionOnItem(item, prompt, result);
      try {
        await savePreferences(env, prefs);
      } catch (saveErr) {
        console.error(`  ✗ save failed after ${item.id}:`, saveErr.message);
        return;
      }
      daily.count += 1;
      writeDailyCount(daily.count);
      console.log(`  ✓ saved ${item.id} — refresh the app for "Result ready"`);
    } catch (e) {
      console.error(`  ✗ failed ${item.id}:`, e.message);
    }
  }
}

async function main() {
  const env = loadEnv(ENV_PATH);
  for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DEVICE_SYNC_ID', 'GEMINI_API_KEY']) {
    if (!env[key]) throw new Error(`ai-worker.env missing ${key}`);
  }
  if (!env.BRAVE_API_KEY) {
    console.log('No BRAVE_API_KEY — using Gemini Google Search grounding.');
  }

  const watch = process.argv.includes('--watch');
  if (!watch) {
    await runCycle(env);
    return;
  }

  console.log('Watch mode: checking every 10 minutes. Press Ctrl+C to stop.');
  process.on('SIGINT', () => {
    console.log('\nStopped.');
    process.exit(0);
  });

  for (;;) {
    console.log(`\n--- ${new Date().toLocaleString()} ---`);
    await runCycle(env);
    const next = new Date(Date.now() + WATCH_MS);
    console.log(`Next run at ${next.toLocaleString()}`);
    await sleep(WATCH_MS);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
