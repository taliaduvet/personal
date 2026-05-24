import { getSongBoardLines } from './songBoard'
import type { VeinData } from './types'

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function exportSongLineageText(data: VeinData, songId: string): string {
  const song = data.songs.find((s) => s.id === songId)
  if (!song) return ''

  const meta: string[] = [
    song.title,
    `Status: ${song.status}`,
  ]
  if (song.versionName) meta.push(`Version: ${song.versionName}`)
  if (song.key) meta.push(`Key: ${song.key}`)
  if (song.bpm) meta.push(`BPM: ${song.bpm}`)
  if (song.mood) meta.push(`Mood: ${song.mood}`)
  if (song.notes) meta.push(`Notes: ${song.notes}`)

  const linkedMemos = song.memoIds
    .map((mid) => data.memos.find((m) => m.id === mid))
    .filter(Boolean)

  const lines: string[] = [...meta]

  if (linkedMemos.length > 0) {
    lines.push('', 'Linked memos:')
    for (const memo of linkedMemos) {
      if (!memo) continue
      const count = data.fragments.filter((f) => f.memoId === memo.id).length
      lines.push(`- ${memo.title} (${count} fragment(s) in vault)`)
    }
  }

  lines.push('', 'Fragments (in order):')

  for (const fragmentId of song.fragmentIds) {
    const fragment = data.fragments.find((f) => f.id === fragmentId)
    if (!fragment) continue
    const memo = data.memos.find((m) => m.id === fragment.memoId)
    lines.push(
      `- ${fragment.label} (${fragment.type}) @ ${formatTimestamp(fragment.timestamp)} — from memo "${memo?.title ?? 'Unknown'}"`,
    )
  }

  const board = getSongBoardLines(data, songId)
  if (board.length > 0 || song.standaloneLyrics.length > 0) {
    lines.push('', 'Lyric & idea board:')
    for (const row of board) {
      lines.push(
        `[${formatTimestamp(row.timestamp)}] ${row.fragmentLabel} (${row.fragmentType}) — ${row.memoTitle}`,
      )
      if (row.lines.length > 0) {
        for (const line of row.lines) {
          lines.push(`  (transcript) ${line.replace(/^★ /, '')}`)
        }
      }
      const manual = song.fragmentLyrics[row.fragmentId]?.trim()
      if (manual) {
        for (const line of manual.split('\n').filter(Boolean)) {
          lines.push(`  (your lyrics) ${line}`)
        }
      }
    }
    for (const block of song.standaloneLyrics) {
      const text = block.text.trim()
      if (text) {
        lines.push('', '(standalone lyrics)')
        for (const line of text.split('\n').filter(Boolean)) {
          lines.push(`  ${line}`)
        }
      }
    }
  }

  return lines.join('\n')
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
