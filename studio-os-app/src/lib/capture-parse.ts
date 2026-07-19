import { generateGeminiText, hasGeminiKey } from "./gemini";

/** Structured fields Gemini extracts from OCR / pasted chat text. */
export type CaptureParseResult = {
  personName: string | null;
  title: string;
  message: string;
  /** Days until a reply is appropriate (0 = today). Gemini chooses from message context. */
  respondInDays: number | null;
  /** One short clause: why that timing (e.g. "warm thanks, no ask"). */
  urgencyReason: string | null;
};

const TITLE_MAX = 120;
const RESPOND_DAYS_MAX = 21;

export function buildCaptureParsePrompt(ocrText: string): string {
  return `You clean up OCR text from a phone chat screenshot (WhatsApp, Messages, Instagram, etc.) into a "need to respond" item for someone with communication anxiety. Timing should reduce guilt, not invent false urgency.

Return ONLY valid JSON (no markdown fences) with this shape:
{"personName":string|null,"title":string,"message":string,"respondInDays":number,"urgencyReason":string}

Rules:
- personName: the OTHER person (or group name), not the phone owner. null if unknown.
- title: short human title (max ~80 chars) — NEVER a clock/time like "1:40" or UI chrome.
- Prefer "Name — gist" when person is known.
- message: cleaned body needing a reply (no timestamps, "Delivered", "Read", battery icons).
- respondInDays: integer days until a reply is socially appropriate (0–21). YOU decide from message context:
  - Explicit ASAP / today / urgent / hard deadline → 0–1
  - Clear ask with a soft soon → 1–2
  - Warm thanks, check-in, emotional sharing, no clear ask → 3–7 (room to breathe)
  - FYI / no response needed vibe → still 5–14 if they captured it (they want to remember)
  - Do NOT default everything to 0 or 1.
- urgencyReason: one short clause explaining the timing choice.
- Ignore OCR junk and currency symbols misread from clocks.

OCR text:
"""
${ocrText.slice(0, 6000)}
"""`;
}

/** Pull first JSON object from a model response (tolerates fences / preamble). */
export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("no_json_object");
  }
}

function cleanTitle(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return "Need to respond";
  if (t.length <= TITLE_MAX) return t;
  return `${t.slice(0, TITLE_MAX - 1)}…`;
}

function looksLikeClockJunk(title: string): boolean {
  return /^\d{1,2}:\d{2}\b/.test(title.trim()) || /^\d{1,2}:\d{2}\s*[€$£]?$/.test(title.trim());
}

function clampRespondInDays(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(RESPOND_DAYS_MAX, Math.round(n)));
}

/** Normalize model JSON into CaptureParseResult; returns null if unusable. */
export function normalizeCaptureParse(raw: unknown, fallbackText: string): CaptureParseResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const personRaw = o.personName ?? o.person;
  const personName =
    typeof personRaw === "string" && personRaw.trim() ? personRaw.trim().slice(0, 80) : null;
  let title =
    typeof o.title === "string" && o.title.trim() ? cleanTitle(o.title) : "";
  const message =
    typeof o.message === "string" && o.message.trim()
      ? o.message.trim()
      : typeof o.body === "string" && o.body.trim()
        ? o.body.trim()
        : fallbackText.trim();

  // Prefer explicit days; map legacy urgency enum if present.
  let respondInDays = clampRespondInDays(o.respondInDays ?? o.daysUntilRespond);
  if (respondInDays === null && typeof o.urgency === "string") {
    if (o.urgency === "today") respondInDays = 0;
    else if (o.urgency === "tomorrow") respondInDays = 1;
    else if (o.urgency === "later") respondInDays = 5;
  }

  const urgencyReason =
    typeof o.urgencyReason === "string" && o.urgencyReason.trim()
      ? o.urgencyReason.trim().slice(0, 160)
      : null;

  if (!title || looksLikeClockJunk(title)) {
    if (personName && message) {
      const gist = message.replace(/\s+/g, " ").trim().slice(0, 60);
      title = cleanTitle(`${personName} — ${gist}`);
    } else if (message) {
      title = cleanTitle(message);
    } else {
      return null;
    }
  }

  if (!message) return null;
  return { personName, title, message, respondInDays, urgencyReason };
}

/**
 * Ask Gemini to structure OCR capture text.
 * Returns null when Gemini is unavailable or parsing fails (caller keeps fallback).
 */
export async function parseCaptureWithGemini(ocrText: string): Promise<CaptureParseResult | null> {
  if (!hasGeminiKey()) return null;
  const text = ocrText.trim();
  if (!text) return null;
  try {
    const raw = await generateGeminiText(buildCaptureParsePrompt(text), {
      temperature: 0.3,
      maxOutputTokens: 2048,
      json: true,
    });
    return normalizeCaptureParse(extractJsonObject(raw), text);
  } catch (err) {
    console.warn("[capture-parse] gemini failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
