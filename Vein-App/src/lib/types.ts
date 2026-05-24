export interface VeinDriveConfig {
  rootFolderId: string
  audioFolderId: string
  dataFolderId: string
  dataFileId: string
}

export type MemoStatus = 'untouched' | 'reviewed' | 'has_fragments'

/** Display order for library status sections and filters */
export const MEMO_STATUS_ORDER: MemoStatus[] = ['untouched', 'reviewed', 'has_fragments']
export type TranscriptionStatus = 'idle' | 'transcribing' | 'failed'
export type FragmentType = 'melody' | 'lyric' | 'groove' | 'vibe' | 'full_idea'
export type FragmentStatus = 'raw' | 'in_use' | 'developed' | 'shelved'
export type SongStatus = 'sketching' | 'in_progress' | 'done'

/** How to link fragments when creating a song from a memo (user choice). */
export type SongFromMemoLinkMode = 'all' | 'lyric' | 'lyric_and_full_idea'

export const SONG_FROM_MEMO_MODES: {
  id: SongFromMemoLinkMode
  label: string
  description: string
}[] = [
  { id: 'all', label: 'All fragments', description: 'Every fragment from this memo' },
  {
    id: 'lyric',
    label: 'Lyric highlights',
    description: 'Lyric type or flagged as lyric candidate',
  },
  {
    id: 'lyric_and_full_idea',
    label: 'Lyrics + full ideas',
    description: 'Lyric highlights plus full-idea fragments',
  },
]

export const DEFAULT_REEL_CLIP_SECONDS = 12
export const DEFAULT_REEL_GAP_SECONDS = 0.5

export const VEIN_SCHEMA_VERSION = 2

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptData {
  text: string
  segments: TranscriptSegment[]
  lyricLineIndices: number[]
}

export interface Tag {
  id: string
  name: string
}

export interface Memo {
  id: string
  title: string
  date: string
  driveFileId: string
  status: MemoStatus
  transcript: TranscriptData | null
  fragments: string[]
  tagIds: string[]
  transcriptionStatus?: TranscriptionStatus
}

export interface Fragment {
  id: string
  memoId: string
  timestamp: number
  label: string
  type: FragmentType
  status: FragmentStatus
  isLyricCandidate: boolean
  songIds: string[]
}

export interface StandaloneLyric {
  id: string
  text: string
}

export interface Song {
  id: string
  title: string
  notes: string
  status: SongStatus
  fragmentIds: string[]
  /** Whole memos attached as sources (typically links all their fragments too). */
  memoIds: string[]
  tagIds: string[]
  updatedAt: string
  key: string
  bpm: string
  mood: string
  versionName: string
  referenceDriveFileId: string | null
  reelClipSeconds: number
  reelGapSeconds: number
  /** User-written lyrics per linked fragment (no transcript required). */
  fragmentLyrics: Record<string, string>
  /** Freeform lyric blocks on the board (not tied to a fragment). */
  standaloneLyrics: StandaloneLyric[]
}

export interface VeinData {
  schemaVersion: number
  updatedAt: string
  tags: Tag[]
  memos: Memo[]
  fragments: Fragment[]
  songs: Song[]
}

export interface TokenSet {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const VEIN_DATA_FILENAME = 'vein-data.json'
export const DRIVE_CONFIG_KEY = 'vein-drive-config'
export const TOKEN_KEY = 'vein-tokens'
export const PKCE_VERIFIER_KEY = 'vein-pkce-verifier'
export const VEIN_DATA_CACHE_KEY = 'vein-data-cache'

export function createDefaultSongFields(
  overrides?: Partial<
    Pick<
      Song,
      | 'title'
      | 'notes'
      | 'status'
      | 'tagIds'
      | 'fragmentIds'
      | 'memoIds'
      | 'key'
      | 'bpm'
      | 'mood'
      | 'versionName'
      | 'referenceDriveFileId'
      | 'reelClipSeconds'
      | 'reelGapSeconds'
      | 'fragmentLyrics'
      | 'standaloneLyrics'
    >
  >,
): Omit<Song, 'id'> {
  const now = new Date().toISOString()
  return {
    title: overrides?.title ?? 'Untitled song',
    notes: overrides?.notes ?? '',
    status: overrides?.status ?? 'sketching',
    fragmentIds: overrides?.fragmentIds ?? [],
    memoIds: overrides?.memoIds ?? [],
    tagIds: overrides?.tagIds ?? [],
    updatedAt: now,
    key: overrides?.key ?? '',
    bpm: overrides?.bpm ?? '',
    mood: overrides?.mood ?? '',
    versionName: overrides?.versionName ?? '',
    referenceDriveFileId: overrides?.referenceDriveFileId ?? null,
    reelClipSeconds: overrides?.reelClipSeconds ?? DEFAULT_REEL_CLIP_SECONDS,
    reelGapSeconds: overrides?.reelGapSeconds ?? DEFAULT_REEL_GAP_SECONDS,
    fragmentLyrics: overrides?.fragmentLyrics ?? {},
    standaloneLyrics: overrides?.standaloneLyrics ?? [],
  }
}
