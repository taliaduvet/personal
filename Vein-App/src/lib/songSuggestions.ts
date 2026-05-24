import type { Fragment, VeinData } from './types'

function scoreFragment(data: VeinData, songId: string, fragment: Fragment): number {
  const song = data.songs.find((s) => s.id === songId)
  if (!song || song.fragmentIds.includes(fragment.id)) return -1

  let score = 0
  const memo = data.memos.find((m) => m.id === fragment.memoId)
  const lineageMemoIds = new Set(
    song.fragmentIds
      .map((fid) => data.fragments.find((f) => f.id === fid)?.memoId)
      .filter(Boolean) as string[],
  )

  if (lineageMemoIds.has(fragment.memoId)) score += 4
  if (song.tagIds.some((tid) => memo?.tagIds.includes(tid))) score += 3
  if (fragment.type === 'lyric' || fragment.isLyricCandidate) score += 2
  if (fragment.type === 'full_idea') score += 1
  if (fragment.songIds.length === 0) score += 1

  return score
}

/** Unlinked fragments ranked for linking to this song. */
export function suggestFragmentsForSong(
  data: VeinData,
  songId: string,
  limit = 8,
): Fragment[] {
  return [...data.fragments]
    .map((f) => ({ f, score: scoreFragment(data, songId, f) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.f)
}
