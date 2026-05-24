import type { Fragment, TranscriptData, VeinData } from './types'

export interface SongBoardLine {
  fragmentId: string
  fragmentLabel: string
  fragmentType: Fragment['type']
  timestamp: number
  memoId: string
  memoTitle: string
  lines: string[]
  isLyricHighlight: boolean
}

/** Transcript lines near a fragment timestamp (±window). */
export function transcriptLinesNearTime(
  transcript: TranscriptData | null | undefined,
  timestamp: number,
  windowSec = 10,
): string[] {
  if (!transcript?.segments?.length) return []

  const lines: string[] = []
  const seen = new Set<string>()
  const lyricIndices = new Set(transcript.lyricLineIndices ?? [])

  transcript.segments.forEach((seg, index) => {
    const mid = (seg.start + seg.end) / 2
    if (Math.abs(mid - timestamp) > windowSec && seg.end < timestamp - windowSec) return
    if (seg.start > timestamp + windowSec) return
    const text = seg.text.trim()
    if (!text || seen.has(text)) return
    seen.add(text)
    const prefix = lyricIndices.has(index) ? '★ ' : ''
    lines.push(`${prefix}${text}`)
  })

  if (lines.length === 0 && transcript.text.trim()) {
    return [transcript.text.trim().slice(0, 280)]
  }

  return lines
}

export function getSongBoardLines(data: VeinData, songId: string): SongBoardLine[] {
  const song = data.songs.find((s) => s.id === songId)
  if (!song) return []

  return song.fragmentIds
    .map((fid) => {
      const fragment = data.fragments.find((f) => f.id === fid)
      if (!fragment) return null
      const memo = data.memos.find((m) => m.id === fragment.memoId)
      const lines = transcriptLinesNearTime(memo?.transcript, fragment.timestamp)
      const isLyricHighlight =
        fragment.type === 'lyric' ||
        fragment.isLyricCandidate ||
        lines.some((l) => l.startsWith('★ '))

      return {
        fragmentId: fragment.id,
        fragmentLabel: fragment.label,
        fragmentType: fragment.type,
        timestamp: fragment.timestamp,
        memoId: fragment.memoId,
        memoTitle: memo?.title ?? 'Unknown memo',
        lines,
        isLyricHighlight,
      }
    })
    .filter((row): row is SongBoardLine => row !== null)
}
