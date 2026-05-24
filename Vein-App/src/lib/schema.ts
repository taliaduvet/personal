import { z } from 'zod'
import { repairVeinCatalog } from './catalogRepair'

const transcriptSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
})

const transcriptSchema = z
  .object({
    text: z.string(),
    segments: z.array(transcriptSegmentSchema),
    lyricLineIndices: z.array(z.number().int().nonnegative()),
  })
  .nullable()

const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(48),
})

const memoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  date: z.string(),
  driveFileId: z.string(),
  status: z.enum(['untouched', 'reviewed', 'has_fragments']),
  transcript: transcriptSchema,
  fragments: z.array(z.string().uuid()),
  tagIds: z.array(z.string().uuid()),
  transcriptionStatus: z.enum(['idle', 'transcribing', 'failed']).optional(),
})

const fragmentSchema = z.object({
  id: z.string().uuid(),
  memoId: z.string().uuid(),
  timestamp: z.number().nonnegative(),
  label: z.string(),
  type: z.enum(['melody', 'lyric', 'groove', 'vibe', 'full_idea']),
  status: z.enum(['raw', 'in_use', 'developed', 'shelved']),
  isLyricCandidate: z.boolean(),
  songIds: z.array(z.string().uuid()),
})

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  notes: z.string(),
  status: z.enum(['sketching', 'in_progress', 'done']),
  fragmentIds: z.array(z.string().uuid()),
  memoIds: z.array(z.string().uuid()),
  tagIds: z.array(z.string().uuid()),
  updatedAt: z.string(),
  key: z.string(),
  bpm: z.string(),
  mood: z.string(),
  versionName: z.string(),
  referenceDriveFileId: z.string().nullable(),
  reelClipSeconds: z.number().positive().max(120),
  reelGapSeconds: z.number().nonnegative().max(30),
  fragmentLyrics: z.record(z.string(), z.string()),
  standaloneLyrics: z.array(
    z.object({
      id: z.string().uuid(),
      text: z.string(),
    }),
  ),
})

export const veinDataSchema = z.object({
  schemaVersion: z.number().int().positive(),
  updatedAt: z.string(),
  tags: z.array(tagSchema),
  memos: z.array(memoSchema),
  fragments: z.array(fragmentSchema),
  songs: z.array(songSchema),
})

export type VeinDataParsed = z.infer<typeof veinDataSchema>

/** Coerce Phase 1 / hand-edited files into a shape Zod can validate. */
export function normalizeVeinDataRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const o = raw as Record<string, unknown>
  const memos = Array.isArray(o.memos)
    ? o.memos.map((m) => {
        if (!m || typeof m !== 'object') return m
        const memo = m as Record<string, unknown>
        return {
          ...memo,
          transcript: typeof memo.transcript === 'string' ? null : memo.transcript,
          transcriptionStatus: memo.transcriptionStatus ?? 'idle',
          tagIds: Array.isArray(memo.tagIds) ? memo.tagIds : [],
        }
      })
    : []
  const now = new Date().toISOString()
  const songs = Array.isArray(o.songs)
    ? o.songs.map((s) => {
        if (!s || typeof s !== 'object') return s
        const song = s as Record<string, unknown>
        return {
          ...song,
          tagIds: Array.isArray(song.tagIds) ? song.tagIds : [],
          memoIds: Array.isArray(song.memoIds) ? song.memoIds : [],
          updatedAt: typeof song.updatedAt === 'string' ? song.updatedAt : now,
          key: typeof song.key === 'string' ? song.key : '',
          bpm: typeof song.bpm === 'string' ? song.bpm : '',
          mood: typeof song.mood === 'string' ? song.mood : '',
          versionName: typeof song.versionName === 'string' ? song.versionName : '',
          referenceDriveFileId:
            typeof song.referenceDriveFileId === 'string' ? song.referenceDriveFileId : null,
          reelClipSeconds:
            typeof song.reelClipSeconds === 'number' ? song.reelClipSeconds : 12,
          reelGapSeconds: typeof song.reelGapSeconds === 'number' ? song.reelGapSeconds : 0.5,
          fragmentLyrics:
            song.fragmentLyrics && typeof song.fragmentLyrics === 'object' && !Array.isArray(song.fragmentLyrics)
              ? (song.fragmentLyrics as Record<string, string>)
              : {},
          standaloneLyrics: Array.isArray(song.standaloneLyrics) ? song.standaloneLyrics : [],
        }
      })
    : []
  const schemaVersion = typeof o.schemaVersion === 'number' ? o.schemaVersion : 1
  return {
    schemaVersion: schemaVersion < 2 ? 2 : schemaVersion,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
    tags: Array.isArray(o.tags) ? o.tags : [],
    memos,
    fragments: Array.isArray(o.fragments) ? o.fragments : [],
    songs,
  }
}

export function parseVeinData(raw: unknown): VeinDataParsed {
  const parsed = veinDataSchema.parse(normalizeVeinDataRaw(raw))
  return repairVeinCatalog(parsed) as VeinDataParsed
}
