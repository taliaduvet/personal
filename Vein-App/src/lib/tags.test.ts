import { describe, expect, it } from 'vitest'
import {
  addMemo,
  createEmptyVeinData,
  createTag,
  deleteTag,
  toggleMemoTag,
} from './mutations'
import { searchMemos } from './search'

describe('tags', () => {
  it('creates tag and dedupes by name', () => {
    const data = createEmptyVeinData()
    const a = createTag(data, 'Demo')
    const b = createTag(a.data, '  demo  ')
    expect(b.tag.id).toBe(a.tag.id)
    expect(b.data.tags).toHaveLength(1)
  })

  it('deleteTag removes from memos', () => {
    let data = createEmptyVeinData()
    const { data: withTag, tag } = createTag(data, 'wip')
    data = addMemo(withTag, { title: 'M', driveFileId: 'f' })
    data = toggleMemoTag(data, data.memos[0].id, tag.id)
    data = deleteTag(data, tag.id)
    expect(data.tags).toHaveLength(0)
    expect(data.memos[0].tagIds).toHaveLength(0)
  })

  it('searchMemos matches tag names and filters', () => {
    let data = createEmptyVeinData()
    const { data: t1, tag } = createTag(data, 'album-a')
    data = addMemo(t1, { title: 'One', driveFileId: 'a' })
    data = addMemo(data, { title: 'Two', driveFileId: 'b' })
    data = toggleMemoTag(data, data.memos[0].id, tag.id)

    expect(searchMemos(data, 'album')).toHaveLength(1)
    expect(searchMemos(data, '', [tag.id])).toHaveLength(1)
    expect(searchMemos(data, '', [tag.id])).toHaveLength(1)
  })
})
