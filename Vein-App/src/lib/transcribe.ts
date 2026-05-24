import { getValidAccessToken } from './auth'
import type { TranscriptData, VeinData } from './types'

export interface TranscribeResult {
  text: string
  segments: TranscriptData['segments']
  lyricLineIndices: number[]
}

export async function requestTranscription(driveFileId: string): Promise<TranscribeResult> {
  const accessToken = await getValidAccessToken()
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driveFileId, accessToken }),
  })

  const data = (await res.json().catch(() => ({}))) as TranscribeResult & { error?: string }

  if (!res.ok) {
    throw new Error(data.error || `Transcription failed (${res.status})`)
  }

  return data
}

/** Set isLyricCandidate on fragments whose timestamp falls in a flagged segment window. */
export function applyLyricCandidatesToFragments(
  data: VeinData,
  memoId: string,
  transcript: TranscriptData,
): VeinData {
  const flaggedRanges = transcript.lyricLineIndices
    .map((i) => transcript.segments[i] ?? null)
    .filter(Boolean) as TranscriptData['segments']

  const fragments = data.fragments.map((f) => {
    if (f.memoId !== memoId) return f
    const inRange = flaggedRanges.some(
      (seg) => f.timestamp >= seg.start && f.timestamp <= seg.end + 0.5,
    )
    const lineMatch = transcript.lyricLineIndices.some((lineIdx) => {
      const seg = transcript.segments[lineIdx]
      return seg && f.timestamp >= seg.start && f.timestamp <= seg.end + 0.5
    })
    return {
      ...f,
      isLyricCandidate: inRange || lineMatch,
    }
  })

  return { ...data, fragments }
}
