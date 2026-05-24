const LYRIC_PROMPT =
  'You are reviewing a raw voice memo transcript from a singer-songwriter. The transcript may include humming, false starts, repeated phrases, and half-formed ideas alongside complete lyric lines. Identify lines that read as strong lyric candidates — lines with a clear image, a complete thought, or a musical phrase worth keeping. Return only a JSON array of the line indices (0-based) that are strong lyric candidates. Return nothing else.'

export async function flagLyricLineIndices(transcriptText: string): Promise<number[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Server missing ANTHROPIC_API_KEY')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: LYRIC_PROMPT,
      messages: [{ role: 'user', content: transcriptText }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Lyric flagging failed: ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[]
  }
  const raw = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '[]'
  const jsonText = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()

  const parsed = JSON.parse(jsonText) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0)
}
