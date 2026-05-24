import { describe, expect, it } from 'vitest'
import {
  addFragment,
  addMemo,
  addSong,
  createEmptyVeinData,
  linkMemoToSong,
  unlinkMemoFromSong,
} from './mutations'

describe('linkMemoToSong', () => {
  it('adds memo and links all its fragments', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'Session A', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: d1 } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'a',
      type: 'melody',
    })
    const { data: d1b } = addFragment(d1, {
      memoId,
      timestamp: 2,
      label: 'b',
      type: 'lyric',
    })
    const { data: d2, song } = addSong(d1b, { title: 'Track' })

    data = linkMemoToSong(d2, memoId, song.id)
    const s = data.songs.find((x) => x.id === song.id)!
    expect(s.memoIds).toContain(memoId)
    expect(s.fragmentIds).toHaveLength(2)
  })

  it('unlinkMemoFromSong removes memo and its fragments from song', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: d1, fragment } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'x',
      type: 'melody',
    })
    const { data: d2, song } = addSong(d1, { title: 'S' })
    data = linkMemoToSong(d2, memoId, song.id)
    data = unlinkMemoFromSong(data, memoId, song.id)

    const s = data.songs.find((x) => x.id === song.id)!
    expect(s.memoIds).not.toContain(memoId)
    expect(s.fragmentIds).not.toContain(fragment.id)
  })
})
