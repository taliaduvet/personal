import { describe, expect, it } from 'vitest'
import {
  addFragment,
  addMemo,
  addSong,
  createEmptyVeinData,
  linkFragmentToSong,
} from './mutations'
import { catalogWasRepaired, repairVeinCatalog } from './catalogRepair'

describe('repairVeinCatalog', () => {
  it('removes ghost fragmentIds from songs so fragments show as linkable', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M', driveFileId: 'f' })
    const memoId = data.memos[0].id
    const { data: withFrag, fragment } = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'hook',
      type: 'melody',
    })
    const { data: withSong, song } = addSong(withFrag, { title: 'S' })

    const ghostId = '00000000-0000-4000-8000-000000000099'
    const broken = {
      ...withSong,
      songs: withSong.songs.map((s) =>
        s.id === song.id ? { ...s, fragmentIds: [ghostId] } : s,
      ),
    }

    expect(broken.songs[0].fragmentIds).toHaveLength(1)
    const repaired = repairVeinCatalog(broken)
    expect(catalogWasRepaired(broken, repaired)).toBe(true)
    expect(repaired.songs[0].fragmentIds).toHaveLength(0)

    const linked = linkFragmentToSong(repaired, fragment.id, song.id)
    expect(linked.songs[0].fragmentIds).toContain(fragment.id)
  })
})
