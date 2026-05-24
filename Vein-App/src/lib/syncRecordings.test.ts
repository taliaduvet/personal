import { afterEach, describe, expect, it, vi } from 'vitest'
import { addMemo, createEmptyVeinData } from './mutations'
import { mergeBrowserCatalogIntoData } from './syncRecordings'
import { VEIN_DATA_CACHE_KEY } from './types'

describe('mergeBrowserCatalogIntoData', () => {
  const store = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
  afterEach(() => store.clear())

  it('adds memos present only in session cache', () => {
    let drive = createEmptyVeinData()
    drive = addMemo(drive, { title: 'On Drive', driveFileId: 'a' })

    const cached = addMemo(createEmptyVeinData(), {
      title: 'Local only',
      driveFileId: 'b',
    })
    sessionStorage.setItem(VEIN_DATA_CACHE_KEY, JSON.stringify(cached))

    const { data, merged } = mergeBrowserCatalogIntoData(drive)
    expect(merged).toBe(1)
    expect(data.memos).toHaveLength(2)
    expect(data.memos.some((m) => m.title === 'Local only')).toBe(true)

  })
})
