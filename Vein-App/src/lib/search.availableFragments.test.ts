import { describe, expect, it } from 'vitest'
import {
  addFragment,
  addMemo,
  addSong,
  createEmptyVeinData,
  linkFragmentToSong,
} from './mutations'
import { getAvailableFragmentsForSong, fragmentMatchesSearchQuery } from './search'

describe('getAvailableFragmentsForSong', () => {
  it('excludes fragments already on the song', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: d1, fragment: linked } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'on song',
      type: 'melody',
    })
    const { data: d2, fragment: free } = addFragment(d1, {
      memoId,
      timestamp: 2,
      label: 'free',
      type: 'lyric',
    })
    const { data: d3, song } = addSong(d2, { title: 'S' })
    data = linkFragmentToSong(d3, linked.id, song.id)

    const available = getAvailableFragmentsForSong(data, song.id)
    expect(available.map((f) => f.id)).toEqual([free.id])
  })

  it('matches memo title and human-readable fragment types', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'Kitchen hum', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: d1, fragment } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'bit',
      type: 'full_idea',
    })
    const { data: withSong, song } = addSong(d1, { title: 'S' })

    expect(fragmentMatchesSearchQuery(withSong, fragment, 'kitchen')).toBe(true)
    expect(fragmentMatchesSearchQuery(withSong, fragment, 'full idea')).toBe(true)
    expect(getAvailableFragmentsForSong(withSong, song.id, 'kitchen')).toHaveLength(1)
    expect(getAvailableFragmentsForSong(withSong, song.id, 'full idea')).toHaveLength(1)
    expect(getAvailableFragmentsForSong(withSong, song.id, 'nope')).toHaveLength(0)
  })
})
