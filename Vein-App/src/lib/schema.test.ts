import { describe, expect, it } from 'vitest'
import { normalizeVeinDataRaw, veinDataSchema } from './schema'

describe('normalizeVeinDataRaw', () => {
  it('adds schemaVersion and empty arrays when missing', () => {
    const normalized = normalizeVeinDataRaw({
      memos: [],
    }) as Record<string, unknown>
    expect(normalized.schemaVersion).toBe(2)
    expect(normalized.tags).toEqual([])
    expect(normalized.fragments).toEqual([])
    expect(normalized.songs).toEqual([])
    expect(typeof normalized.updatedAt).toBe('string')
  })

  it('clears legacy string transcript so Zod can validate', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const normalized = normalizeVeinDataRaw({
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      memos: [
        {
          id,
          title: 't',
          date: new Date().toISOString(),
          driveFileId: 'x',
          status: 'untouched',
          transcript: 'hello world',
          fragments: [],
        },
      ],
      fragments: [],
      songs: [],
      tags: [],
    }) as { memos: { transcript: null; transcriptionStatus: string; tagIds: string[] }[] }
    expect(normalized.memos[0].transcript).toBeNull()
    expect(normalized.memos[0].transcriptionStatus).toBe('idle')
    expect(normalized.memos[0].tagIds).toEqual([])
  })
})

describe('veinDataSchema', () => {
  it('accepts a minimal valid vault', () => {
    const data = {
      schemaVersion: 2,
      updatedAt: new Date().toISOString(),
      tags: [],
      memos: [],
      fragments: [],
      songs: [],
    }
    expect(veinDataSchema.safeParse(data).success).toBe(true)
  })
})
