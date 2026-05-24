import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runTranscribe } from './lib/transcribeCore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { driveFileId?: string; accessToken?: string }
  if (!body.driveFileId || !body.accessToken) {
    return res.status(400).json({ error: 'Missing driveFileId or accessToken' })
  }

  try {
    const result = await runTranscribe(body.driveFileId, body.accessToken)
    return res.status(200).json(result)
  } catch (e) {
    const err = e as Error & { code?: string }
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({
        error:
          'This memo is too large to transcribe (over 25MB). Export a shorter clip from Voice Memos and import again.',
      })
    }
    console.error('transcribe error', e)
    return res.status(500).json({
      error: err.message || 'Transcription failed',
    })
  }
}
