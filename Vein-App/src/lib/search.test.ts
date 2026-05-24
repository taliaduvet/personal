import { describe, expect, it } from 'vitest'
import { createEmptyVeinData, addMemo, addFragment } from './mutations'
import { searchMemos } from './search'

describe('searchMemos', () => {
  it('finds memos by title', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'Bridge idea', driveFileId: 'a' })
    data = addMemo(data, { title: 'Chorus hum', driveFileId: 'b' })
    expect(searchMemos(data, 'bridge')).toHaveLength(1)
  })

  it('filters memos by status', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'A', driveFileId: 'a' })
    data = addMemo(data, { title: 'B', driveFileId: 'b' })
    data = {
      ...data,
      memos: data.memos.map((m) =>
        m.title === 'B' ? { ...m, status: 'reviewed' as const } : m,
      ),
    }
    expect(searchMemos(data, '', [], 'untouched')).toHaveLength(1)
    expect(searchMemos(data, '', [], 'untouched')[0].title).toBe('A')
  })

  it('finds memos by fragment label', () => {
    let data = createEmptyVeinData()
    data = addMemo(data, { title: 'M1', driveFileId: 'a' })
    const memoId = data.memos[0].id
    data = addFragment(data, {
      memoId,
      timestamp: 1,
      label: 'catchy hook',
      type: 'melody',
    }).data
    expect(searchMemos(data, 'hook')).toHaveLength(1)
  })
})
