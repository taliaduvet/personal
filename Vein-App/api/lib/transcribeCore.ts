import { flagLyricLineIndices } from './flagLyrics'

const WHISPER_MAX = 25 * 1024 * 1024

async function downloadFromDrive(fileId: string, accessToken: string): Promise<Buffer> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Could not download audio from Drive (${res.status}): ${err.slice(0, 120)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export type TranscribeCoreResult = {
  text: string
  segments: { start: number; end: number; text: string }[]
  lyricLineIndices: number[]
}

export async function runTranscribe(
  driveFileId: string,
  accessToken: string,
): Promise<TranscribeCoreResult> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) throw new Error('Server missing OPENAI_API_KEY')

  const audio = await downloadFromDrive(driveFileId, accessToken)
  if (audio.length > WHISPER_MAX) {
    throw Object.assign(new Error('FILE_TOO_LARGE'), { code: 'FILE_TOO_LARGE' })
  }

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/mp4' }), 'memo.m4a')
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  })

  if (!whisperRes.ok) {
    const err = await whisperRes.text()
    throw new Error(`Transcription service error: ${err.slice(0, 200)}`)
  }

  const whisper = (await whisperRes.json()) as {
    text?: string
    segments?: { start: number; end: number; text: string }[]
  }

  const text = whisper.text ?? ''
  const segments = (whisper.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }))

  let lyricLineIndices: number[] = []
  try {
    lyricLineIndices = await flagLyricLineIndices(text)
  } catch (e) {
    console.error('lyric flagging failed', e)
  }

  return { text, segments, lyricLineIndices }
}
