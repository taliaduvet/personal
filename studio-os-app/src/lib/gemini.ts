const PRIMARY_MODEL = "gemini-flash-lite-latest";

function modelUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function partsText(data: {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}): string {
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
  ).trim();
}

async function callGemini(
  model: string,
  key: string,
  prompt: string,
  opts?: { maxOutputTokens?: number; temperature?: number; json?: boolean }
): Promise<string> {
  const generationConfig: Record<string, unknown> = {
    temperature: opts?.temperature ?? 0.4,
    maxOutputTokens: opts?.maxOutputTokens ?? 2048,
  };
  if (opts?.json) {
    generationConfig.responseMimeType = "application/json";
  }

  const res = await fetch(`${modelUrl(model)}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${model} ${res.status}: ${body.slice(0, 180)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = partsText(data);
  if (!text) throw new Error(`Gemini ${model} returned empty text`);
  return text;
}

/**
 * Gemini via flash-lite (fast + free-tier friendly).
 * Retries once — does not pivot to flash-latest (often 503 under demand).
 */
export async function generateGeminiText(
  prompt: string,
  opts?: { maxOutputTokens?: number; temperature?: number; json?: boolean }
): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    return await callGemini(PRIMARY_MODEL, key, prompt, opts);
  } catch (primaryErr) {
    console.warn(
      "[gemini] primary failed, retrying:",
      primaryErr instanceof Error ? primaryErr.message : primaryErr
    );
    await new Promise((r) => setTimeout(r, 400));
    return await callGemini(PRIMARY_MODEL, key, prompt, opts);
  }
}
