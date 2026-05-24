import { describe, expect, it } from 'vitest'
import {
  addFragment,
  addMemo,
  addSong,
  addSongFromMemo,
  createEmptyVeinData,
  deleteMemoFromCatalog,
  deleteSongFromCatalog,
  duplicateSong,
  linkFragmentToSong,
  reorderSongFragments,
  unlinkFragmentFromSong,
} from './mutations'
import { parseVeinData, normalizeVeinDataRaw } from './schema'

describe('parseVeinData', () => {
  it('accepts empty vault', () => {
    const data = parseVeinData(createEmptyVeinData())
    expect(data.memos).toEqual([])
  })

  it('normalizes legacy file without schemaVersion', () => {
    const legacy = { memos: [], fragments: [], songs: [], tags: [] }
    const data = parseVeinData(normalizeVeinDataRaw(legacy))
    expect(data.schemaVersion).toBe(2)
  })

  it('coerces string transcript to null', () => {
    const raw = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      memos: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'x',
          date: new Date().toISOString(),
          driveFileId: 'abc',
          status: 'untouched',
          transcript: 'old string transcript',
          fragments: [],
        },
      ],
      fragments: [],
      songs: [],
      tags: [],
    }
    const data = parseVeinData(raw)
    expect(data.memos[0].transcript).toBeNull()
  })
})

describe('mutations', () => {
  it('addMemo prepends memo', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'A', driveFileId: 'f1' })
    expect(data.memos).toHaveLength(1)
    expect(data.memos[0].title).toBe('A')
  })

  it('deleteMemoFromCatalog removes memo, fragments, and song links', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f1' })
    const memoId = data.memos[0].id
    const { data: withFrag, fragment } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'hook',
      type: 'melody',
    })
    const { data: withSong, song } = addSong(withFrag, { title: 'S' })
    data = linkFragmentToSong(withSong, fragment.id, song.id)

    data = deleteMemoFromCatalog(data, memoId)
    expect(data.memos).toHaveLength(0)
    expect(data.fragments).toHaveLength(0)
    expect(data.songs[0].fragmentIds).toHaveLength(0)
  })

  it('deleteSongFromCatalog removes song and unlinks fragments', () => {
    let data = createEmptyVeinData()
    const { data: withSong, song } = addSong(data, { title: 'S' })
    data = addMemo(withSong, { title: 'M', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: withFrag, fragment } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'hook',
      type: 'melody',
    })
    data = linkFragmentToSong(withFrag, fragment.id, song.id)

    data = deleteSongFromCatalog(data, song.id)
    expect(data.songs).toHaveLength(0)
    expect(data.fragments[0].songIds).toHaveLength(0)
    expect(data.memos).toHaveLength(1)
  })

  it('linkFragmentToSong updates both sides', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f1' })
    const memoId = data.memos[0].id
    const { data: withFragment, fragment } = addFragment(data, {
      memoId,
      timestamp: 10,
      label: 'hook',
      type: 'melody',
    })
    const { data: withSong, song } = addSong(withFragment, { title: 'S' })
    data = linkFragmentToSong(withSong, fragment.id, song.id)

    expect(data.fragments[0].songIds).toContain(song.id)
    expect(data.songs[0].fragmentIds).toContain(fragment.id)

    data = unlinkFragmentFromSong(data, fragment.id, song.id)
    expect(data.fragments[0].songIds).toHaveLength(0)
    expect(data.songs[0].fragmentIds).toHaveLength(0)
  })

  it('reorderSongFragments sets fragment order', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: d1, fragment: a } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'a',
      type: 'melody',
    })
    const { data: d2, fragment: b } = addFragment(d1, {
      memoId,
      timestamp: 2,
      label: 'b',
      type: 'lyric',
    })
    const { data: d3, song } = addSong(d2, { title: 'S' })
    data = linkFragmentToSong(linkFragmentToSong(d3, a.id, song.id), b.id, song.id)
    data = reorderSongFragments(data, song.id, [b.id, a.id])
    expect(data.songs[0].fragmentIds).toEqual([b.id, a.id])
  })

  it('addSongFromMemo links by mode', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: d1 } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'lyric bit',
      type: 'lyric',
    })
    const { data: d2 } = addFragment(d1, {
      memoId,
      timestamp: 2,
      label: 'groove',
      type: 'groove',
    })
    const result = addSongFromMemo(d2, memoId, 'lyric')
    expect(result).not.toBeNull()
    expect(result!.song.fragmentIds).toHaveLength(1)
  })

  it('duplicateSong copies metadata not fragments by default', () => {
    let data = createEmptyVeinData()
    const { data: d1, song } = addSong(data, { title: 'Original', key: 'Am' })
    const dup = duplicateSong(d1, song.id)
    expect(dup?.song.title).toContain('copy')
    expect(dup?.song.key).toBe('Am')
    expect(dup?.song.fragmentIds).toHaveLength(0)
  })
})
