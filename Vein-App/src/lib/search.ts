import { formatFragmentStatus, formatFragmentType } from './format'
import { tagNamesForIds } from './tags'
import type { Fragment, FragmentType, Memo, MemoStatus, Song, SongStatus, VeinData } from './types'

/** True if every whitespace-separated term appears somewhere in the fragment’s searchable text. */
export function fragmentMatchesSearchQuery(
  data: VeinData,
  fragment: Fragment,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const memo = data.memos.find((m) => m.id === fragment.memoId)
  const tagText = memo ? tagNamesForIds(data, memo.tagIds).join(' ') : ''
  const typeLabel = formatFragmentType(fragment.type)
  const haystack = [
    fragment.label,
    memo?.title ?? '',
    typeLabel,
    fragment.type.replace(/_/g, ' '),
    fragment.type,
    formatFragmentStatus(fragment.status),
    tagText,
  ]
    .join(' ')
    .toLowerCase()

  const terms = q.split(/\s+/).filter(Boolean)
  return terms.every((term) => haystack.includes(term))
}

export type SongListFilter = 'all' | 'no_fragments' | 'has_fragments' | 'developing'

export type SongStatusFilterValue = SongStatus | 'all'

function sortMemosNewestFirst(memos: Memo[]): Memo[] {
  return [...memos].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

function matchesTagFilter(tagIds: string[], filterTagIds: string[]): boolean {
  if (filterTagIds.length === 0) return true
  return filterTagIds.some((id) => tagIds.includes(id))
}

export function memoCountByStatus(data: VeinData, status: MemoStatus): number {
  return data.memos.filter((m) => m.status === status).length
}

export function searchMemos(
  data: VeinData,
  query: string,
  filterTagIds: string[] = [],
  filterStatus?: MemoStatus | null,
): Memo[] {
  const q = query.trim().toLowerCase()
  let list = sortMemosNewestFirst(data.memos).filter((m) =>
    matchesTagFilter(m.tagIds, filterTagIds),
  )
  if (filterStatus) {
    list = list.filter((m) => m.status === filterStatus)
  }
  if (!q) return list

  return list.filter((m) => {
    const tagText = tagNamesForIds(data, m.tagIds).join(' ').toLowerCase()
    const fragmentLabels = data.fragments
      .filter((f) => f.memoId === m.id)
      .map((f) => `${f.label} ${formatFragmentType(f.type)}`)
      .join(' ')
      .toLowerCase()
    const blob = [m.title, tagText, fragmentLabels].join(' ').toLowerCase()
    const terms = q.split(/\s+/).filter(Boolean)
    return terms.every((term) => blob.includes(term))
  })
}

function sortSongsByUpdated(songs: Song[]): Song[] {
  return [...songs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function songCountByStatus(data: VeinData, status: SongStatus): number {
  return data.songs.filter((s) => s.status === status).length
}

export function fragmentTypeSummaryForSong(
  data: VeinData,
  songId: string,
): Partial<Record<FragmentType, number>> {
  const song = data.songs.find((s) => s.id === songId)
  if (!song) return {}
  const counts: Partial<Record<FragmentType, number>> = {}
  for (const fid of song.fragmentIds) {
    const f = data.fragments.find((x) => x.id === fid)
    if (!f) continue
    counts[f.type] = (counts[f.type] ?? 0) + 1
  }
  return counts
}

export function formatFragmentTypeSummary(summary: Partial<Record<FragmentType, number>>): string {
  const parts = (Object.entries(summary) as [FragmentType, number][])
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${type.replace('_', ' ')}`)
  return parts.join(' · ')
}

function matchesSongListFilter(data: VeinData, song: Song, filter: SongListFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'no_fragments') return song.fragmentIds.length === 0
  if (filter === 'has_fragments') return song.fragmentIds.length > 0
  if (filter === 'developing') {
    if (song.status !== 'in_progress') return false
    return song.fragmentIds.some((fid) => {
      const f = data.fragments.find((x) => x.id === fid)
      return f && (f.type === 'lyric' || f.isLyricCandidate)
    })
  }
  return true
}

export function searchSongs(
  data: VeinData,
  query: string,
  filterTagIds: string[] = [],
  filterStatus?: SongStatus | null,
  listFilter: SongListFilter = 'all',
): Song[] {
  const q = query.trim().toLowerCase()
  let list = sortSongsByUpdated(data.songs).filter(
    (s) =>
      matchesTagFilter(s.tagIds, filterTagIds) &&
      matchesSongListFilter(data, s, listFilter),
  )
  if (filterStatus) {
    list = list.filter((s) => s.status === filterStatus)
  }
  if (!q) return list

  return list.filter((s) => {
    const tagText = tagNamesForIds(data, s.tagIds).join(' ').toLowerCase()
    const fragmentText = s.fragmentIds
      .map((fid) => data.fragments.find((f) => f.id === fid))
      .filter((f): f is Fragment => Boolean(f))
      .map((f) => {
        const memo = data.memos.find((m) => m.id === f.memoId)
        return `${f.label} ${memo?.title ?? ''} ${formatFragmentType(f.type)}`
      })
      .join(' ')
      .toLowerCase()

    const blob = [
      s.title,
      s.notes,
      s.key,
      s.mood,
      s.versionName,
      tagText,
      fragmentText,
    ]
      .join(' ')
      .toLowerCase()

    const terms = q.split(/\s+/).filter(Boolean)
    return terms.every((term) => blob.includes(term))
  })
}

/** Fragments not yet linked to this song, optionally filtered by search query. */
/** Memos not yet attached to this song. */
export function getAvailableMemosForSong(
  data: VeinData,
  songId: string,
  query = '',
): Memo[] {
  const song = data.songs.find((s) => s.id === songId)
  const linked = new Set(song?.memoIds ?? [])
  const q = query.trim().toLowerCase()

  return [...data.memos]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((m) => !linked.has(m.id))
    .filter((m) => {
      if (!q) return true
      const tagText = tagNamesForIds(data, m.tagIds).join(' ').toLowerCase()
      const fragCount = data.fragments.filter((f) => f.memoId === m.id).length
      const blob = [m.title, tagText, `${fragCount} fragments`].join(' ').toLowerCase()
      const terms = q.split(/\s+/).filter(Boolean)
      return terms.every((term) => blob.includes(term))
    })
}

export function getAvailableFragmentsForSong(
  data: VeinData,
  songId: string,
  query = '',
  options?: { lyricOnly?: boolean },
): Fragment[] {
  const song = data.songs.find((s) => s.id === songId)
  const linked = new Set(song?.fragmentIds ?? [])
  return data.fragments.filter((f) => {
    if (linked.has(f.id)) return false
    if (options?.lyricOnly && f.type !== 'lyric' && !f.isLyricCandidate) return false
    return fragmentMatchesSearchQuery(data, f, query)
  })
}

export function getFragmentsForMemo(data: VeinData, memoId: string): Fragment[] {
  return data.fragments
    .filter((f) => f.memoId === memoId)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function fragmentCountForMemo(data: VeinData, memo: Memo): number {
  return data.fragments.filter((f) => f.memoId === memo.id).length
}

export function sourceMemoCountForSong(data: VeinData, songId: string): number {
  const song = data.songs.find((s) => s.id === songId)
  const memoIds = new Set(song?.memoIds ?? [])
  for (const f of data.fragments.filter((fr) => fr.songIds.includes(songId))) {
    memoIds.add(f.memoId)
  }
  return memoIds.size
}

export function memoCountForTag(data: VeinData, tagId: string): number {
  return data.memos.filter((m) => m.tagIds.includes(tagId)).length
}

export function songCountForTag(data: VeinData, tagId: string): number {
  return data.songs.filter((s) => s.tagIds.includes(tagId)).length
}
