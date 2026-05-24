import { findTagByName, normalizeTagName } from './tags'
import { getFragmentsForMemo } from './search'
import type {
  Fragment,
  FragmentType,
  Memo,
  MemoStatus,
  Song,
  SongFromMemoLinkMode,
  Tag,
  VeinData,
} from './types'
import { createDefaultSongFields } from './types'

function touchSong(song: Song): Song {
  return { ...song, updatedAt: new Date().toISOString() }
}

function mapSong(data: VeinData, songId: string, fn: (s: Song) => Song): VeinData {
  return touchData({
    ...data,
    songs: data.songs.map((s) => (s.id === songId ? fn(s) : s)),
  })
}

export function touchData(data: VeinData): VeinData {
  return { ...data, updatedAt: new Date().toISOString() }
}

export function addMemo(
  data: VeinData,
  input: { title: string; driveFileId: string; date?: string },
): VeinData {
  const memo: Memo = {
    id: crypto.randomUUID(),
    title: input.title,
    date: input.date ?? new Date().toISOString(),
    driveFileId: input.driveFileId,
    status: 'untouched',
    transcript: null,
    fragments: [],
    tagIds: [],
    transcriptionStatus: 'idle',
  }
  return touchData({ ...data, memos: [memo, ...data.memos] })
}

export function updateMemo(
  data: VeinData,
  memoId: string,
  patch: Partial<
    Pick<Memo, 'title' | 'status' | 'transcript' | 'transcriptionStatus' | 'tagIds' | 'driveFileId'>
  >,
): VeinData {
  return touchData({
    ...data,
    memos: data.memos.map((m) => (m.id === memoId ? { ...m, ...patch } : m)),
  })
}

/** Remove memo, its fragments, and unlink those fragments from songs. */
export function deleteMemoFromCatalog(data: VeinData, memoId: string): VeinData {
  const fragmentIdsToRemove = new Set(
    data.fragments.filter((f) => f.memoId === memoId).map((f) => f.id),
  )
  if (fragmentIdsToRemove.size === 0 && !data.memos.some((m) => m.id === memoId)) {
    return data
  }

  return touchData({
    ...data,
    memos: data.memos.filter((m) => m.id !== memoId),
    fragments: data.fragments.filter((f) => f.memoId !== memoId),
    songs: data.songs.map((s) => ({
      ...s,
      fragmentIds: s.fragmentIds.filter((fid) => !fragmentIdsToRemove.has(fid)),
    })),
  })
}

export function addFragment(
  data: VeinData,
  input: {
    memoId: string
    timestamp: number
    label: string
    type: FragmentType
  },
): { data: VeinData; fragment: Fragment } {
  const fragment: Fragment = {
    id: crypto.randomUUID(),
    memoId: input.memoId,
    timestamp: input.timestamp,
    label: input.label,
    type: input.type,
    status: 'raw',
    isLyricCandidate: false,
    songIds: [],
  }

  const next = touchData({
    ...data,
    fragments: [...data.fragments, fragment],
    memos: data.memos.map((m) => {
      if (m.id !== input.memoId) return m
      const fragments = [...m.fragments, fragment.id]
      const status: MemoStatus = 'has_fragments'
      return { ...m, fragments, status }
    }),
  })

  return { data: next, fragment }
}

export function updateFragment(
  data: VeinData,
  fragmentId: string,
  patch: Partial<Pick<Fragment, 'label' | 'type' | 'status' | 'isLyricCandidate'>>,
): VeinData {
  return touchData({
    ...data,
    fragments: data.fragments.map((f) =>
      f.id === fragmentId ? { ...f, ...patch } : f,
    ),
  })
}

export function linkFragmentToSong(
  data: VeinData,
  fragmentId: string,
  songId: string,
): VeinData {
  const fragment = data.fragments.find((f) => f.id === fragmentId)
  const song = data.songs.find((s) => s.id === songId)
  if (!fragment || !song) return data

  const fragmentIds = song.fragmentIds.includes(fragmentId)
    ? song.fragmentIds
    : [...song.fragmentIds, fragmentId]
  const songIds = fragment.songIds.includes(songId)
    ? fragment.songIds
    : [...fragment.songIds, songId]

  return touchData({
    ...data,
    fragments: data.fragments.map((f) =>
      f.id === fragmentId ? { ...f, songIds } : f,
    ),
    songs: data.songs.map((s) =>
      s.id === songId ? touchSong({ ...s, fragmentIds }) : s,
    ),
  })
}

export function unlinkFragmentFromSong(
  data: VeinData,
  fragmentId: string,
  songId: string,
): VeinData {
  const fragment = data.fragments.find((f) => f.id === fragmentId)
  let next = touchData({
    ...data,
    fragments: data.fragments.map((f) =>
      f.id === fragmentId
        ? { ...f, songIds: f.songIds.filter((id) => id !== songId) }
        : f,
    ),
    songs: data.songs.map((s) =>
      s.id === songId
        ? touchSong({
            ...s,
            fragmentIds: s.fragmentIds.filter((id) => id !== fragmentId),
          })
        : s,
    ),
  })

  if (fragment) {
    const song = next.songs.find((s) => s.id === songId)
    const stillHasMemoOnSong = song?.fragmentIds.some((fid) => {
      const f = next.fragments.find((x) => x.id === fid)
      return f?.memoId === fragment.memoId
    })
    if (!stillHasMemoOnSong) {
      next = mapSong(next, songId, (s) => ({
        ...s,
        memoIds: s.memoIds.filter((id) => id !== fragment.memoId),
      }))
    }
  }

  return next
}

/** Attach a memo to a song and link all of its fragments. */
export function linkMemoToSong(
  data: VeinData,
  memoId: string,
  songId: string,
): VeinData {
  const memo = data.memos.find((m) => m.id === memoId)
  const song = data.songs.find((s) => s.id === songId)
  if (!memo || !song) return data

  let next = mapSong(data, songId, (s) =>
    touchSong({
      ...s,
      memoIds: s.memoIds.includes(memoId) ? s.memoIds : [...s.memoIds, memoId],
    }),
  )

  for (const f of getFragmentsForMemo(next, memoId)) {
    next = linkFragmentToSong(next, f.id, songId)
  }

  return next
}

/** Detach a memo from a song and unlink all of its fragments from this song. */
export function unlinkMemoFromSong(
  data: VeinData,
  memoId: string,
  songId: string,
): VeinData {
  const memo = data.memos.find((m) => m.id === memoId)
  if (!memo) return data

  let next = mapSong(data, songId, (s) =>
    touchSong({
      ...s,
      memoIds: s.memoIds.filter((id) => id !== memoId),
    }),
  )

  for (const f of next.fragments.filter((fr) => fr.memoId === memoId)) {
    if (f.songIds.includes(songId)) {
      next = unlinkFragmentFromSong(next, f.id, songId)
    }
  }

  return next
}

export function reorderSongFragments(
  data: VeinData,
  songId: string,
  orderedFragmentIds: string[],
): VeinData {
  const song = data.songs.find((s) => s.id === songId)
  if (!song) return data

  const current = new Set(song.fragmentIds)
  if (
    orderedFragmentIds.length !== song.fragmentIds.length ||
    !orderedFragmentIds.every((id) => current.has(id))
  ) {
    return data
  }

  return mapSong(data, songId, (s) => touchSong({ ...s, fragmentIds: orderedFragmentIds }))
}

export function fragmentsForMemoLinkMode(
  fragments: Fragment[],
  mode: SongFromMemoLinkMode,
): Fragment[] {
  if (mode === 'all') return fragments
  if (mode === 'lyric') {
    return fragments.filter((f) => f.type === 'lyric' || f.isLyricCandidate)
  }
  return fragments.filter(
    (f) =>
      f.type === 'lyric' ||
      f.isLyricCandidate ||
      f.type === 'full_idea',
  )
}

export function addSong(
  data: VeinData,
  input?: Partial<
    Pick<Song, 'title' | 'notes' | 'status' | 'tagIds' | 'key' | 'bpm' | 'mood' | 'versionName'>
  >,
): { data: VeinData; song: Song } {
  const song: Song = {
    id: crypto.randomUUID(),
    ...createDefaultSongFields(input),
  }
  return {
    data: touchData({ ...data, songs: [...data.songs, song] }),
    song,
  }
}

export function addSongFromMemo(
  data: VeinData,
  memoId: string,
  mode: SongFromMemoLinkMode,
  title?: string,
): { data: VeinData; song: Song } | null {
  const memo = data.memos.find((m) => m.id === memoId)
  if (!memo) return null

  const toLink = fragmentsForMemoLinkMode(getFragmentsForMemo(data, memoId), mode)
  const { data: withSong, song } = addSong(data, {
    title: title?.trim() || `${memo.title} (song)`,
  })

  let next = linkMemoToSong(withSong, memoId, song.id)
  if (mode !== 'all') {
    const allowed = new Set(toLink.map((f) => f.id))
    const songAfter = next.songs.find((s) => s.id === song.id)!
    for (const fid of [...songAfter.fragmentIds]) {
      if (!allowed.has(fid)) {
        next = unlinkFragmentFromSong(next, fid, song.id)
      }
    }
  }

  return { data: next, song: next.songs.find((s) => s.id === song.id)! }
}

export function duplicateSong(
  data: VeinData,
  songId: string,
  options?: { copyFragmentLinks?: boolean },
): { data: VeinData; song: Song } | null {
  const source = data.songs.find((s) => s.id === songId)
  if (!source) return null

  const { data: withSong, song } = addSong(data, {
    title: `${source.title} (copy)`,
    notes: source.notes,
    status: source.status,
    tagIds: [...source.tagIds],
    key: source.key,
    bpm: source.bpm,
    mood: source.mood,
    versionName: source.versionName,
  })

  if (!options?.copyFragmentLinks) {
    return { data: withSong, song }
  }

  let next = withSong
  for (const memoId of source.memoIds) {
    next = linkMemoToSong(next, memoId, song.id)
  }
  for (const fid of source.fragmentIds) {
    next = linkFragmentToSong(next, fid, song.id)
  }
  return { data: next, song: next.songs.find((s) => s.id === song.id)! }
}

export function updateSong(
  data: VeinData,
  songId: string,
  patch: Partial<
    Pick<
      Song,
      | 'title'
      | 'notes'
      | 'status'
      | 'tagIds'
      | 'key'
      | 'bpm'
      | 'mood'
      | 'versionName'
      | 'referenceDriveFileId'
      | 'reelClipSeconds'
      | 'reelGapSeconds'
      | 'fragmentLyrics'
      | 'standaloneLyrics'
      | 'memoIds'
    >
  >,
): VeinData {
  return mapSong(data, songId, (s) => touchSong({ ...s, ...patch }))
}

/** Remove song and unlink it from all fragments (fragments themselves stay). */
export function deleteSongFromCatalog(data: VeinData, songId: string): VeinData {
  if (!data.songs.some((s) => s.id === songId)) return data

  return touchData({
    ...data,
    songs: data.songs.filter((s) => s.id !== songId),
    fragments: data.fragments.map((f) => ({
      ...f,
      songIds: f.songIds.filter((id) => id !== songId),
    })),
  })
}

export function createTag(data: VeinData, name: string): { data: VeinData; tag: Tag } {
  const normalized = normalizeTagName(name)
  if (!normalized) throw new Error('Tag name cannot be empty')

  const existing = findTagByName(data, normalized)
  if (existing) return { data, tag: existing }

  const tag: Tag = { id: crypto.randomUUID(), name: normalized }
  const tags = [...data.tags, tag].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
  return { data: touchData({ ...data, tags }), tag }
}

export function deleteTag(data: VeinData, tagId: string): VeinData {
  return touchData({
    ...data,
    tags: data.tags.filter((t) => t.id !== tagId),
    memos: data.memos.map((m) => ({
      ...m,
      tagIds: m.tagIds.filter((id) => id !== tagId),
    })),
    songs: data.songs.map((s) => ({
      ...s,
      tagIds: s.tagIds.filter((id) => id !== tagId),
    })),
  })
}

export function toggleMemoTag(data: VeinData, memoId: string, tagId: string): VeinData {
  return touchData({
    ...data,
    memos: data.memos.map((m) => {
      if (m.id !== memoId) return m
      const has = m.tagIds.includes(tagId)
      const tagIds = has ? m.tagIds.filter((id) => id !== tagId) : [...m.tagIds, tagId]
      return { ...m, tagIds }
    }),
  })
}

export function toggleSongTag(data: VeinData, songId: string, tagId: string): VeinData {
  return touchData({
    ...data,
    songs: data.songs.map((s) => {
      if (s.id !== songId) return s
      const has = s.tagIds.includes(tagId)
      const tagIds = has ? s.tagIds.filter((id) => id !== tagId) : [...s.tagIds, tagId]
      return { ...s, tagIds }
    }),
  })
}

export function createEmptyVeinData(): VeinData {
  return {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    tags: [],
    memos: [],
    fragments: [],
    songs: [],
  }
}
