import { describe, expect, it } from 'vitest'
import { createEmptyVeinData, addMemo, addSong, addFragment, linkFragmentToSong } from './mutations'
import { getSongBoardLines } from './songBoard'
import type { TranscriptData } from './types'

describe('getSongBoardLines', () => {
  it('includes transcript near fragment timestamp', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const transcript: TranscriptData = {
      text: 'hello world',
      segments: [{ start: 5, end: 8, text: 'hello world' }],
      lyricLineIndices: [0],
    }
    data = {
      ...data,
      memos: data.memos.map((m) =>
        m.id === memoId ? { ...m, transcript } : m,
      ),
    }
    const { data: d2, fragment } = addFragment(data, {
      memoId,
      timestamp: 6,
      label: 'bit',
      type: 'lyric',
    })
    const { data: d3, song } = addSong(d2, { title: 'S' })
    data = linkFragmentToSong(d3, fragment.id, song.id)

    const rows = getSongBoardLines(data, song.id)
    expect(rows[0].lines.some((l) => l.includes('hello'))).toBe(true)
  })
})
