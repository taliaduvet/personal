import { describe, expect, it } from 'vitest'
import { createEmptyVeinData, addMemo, addSong, addFragment, linkFragmentToSong } from './mutations'
import { exportSongLineageText } from './export'

describe('exportSongLineageText', () => {
  it('includes song title and fragment lineage', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'Source memo', driveFileId: 'f1' })
    const memoId = data.memos[0].id
    const { data: d2, fragment } = addFragment(data, {
      memoId,
      timestamp: 42,
      label: 'Main hook',
      type: 'melody',
    })
    const { data: d3, song } = addSong(d2, { title: 'My Song' })
    data = linkFragmentToSong(d3, fragment.id, song.id)

    const text = exportSongLineageText(data, song.id)
    expect(text).toContain('My Song')
    expect(text).toContain('Main hook')
    expect(text).toContain('Source memo')
    expect(text).toContain('0:42')
  })
})
