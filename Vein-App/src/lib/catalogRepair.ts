import { touchData } from './mutations'
import type { MemoStatus, VeinData } from './types'

/**
 * Fix drift between songs.fragmentIds, fragments.songIds, and memos.fragments.
 * Common symptom: “every fragment already on this song” while the linked list is empty.
 */
export function repairVeinCatalog(data: VeinData): VeinData {
  const fragmentById = new Map(data.fragments.map((f) => [f.id, f]))
  const memoById = new Set(data.memos.map((m) => m.id))

  const songs = data.songs.map((song) => ({
    ...song,
    memoIds: (song.memoIds ?? []).filter((mid) => memoById.has(mid)),
    fragmentIds: song.fragmentIds.filter((fid) => fragmentById.has(fid)),
  }))

  const fragments = data.fragments.map((f) => ({
    ...f,
    songIds: songs.filter((s) => s.fragmentIds.includes(f.id)).map((s) => s.id),
  }))

  const memos = data.memos.map((m) => {
    const ids = fragments.filter((f) => f.memoId === m.id).map((f) => f.id)
    let status: MemoStatus = m.status
    if (ids.length > 0) {
      status = 'has_fragments'
    } else if (m.status === 'has_fragments') {
      status = 'reviewed'
    }
    return { ...m, fragments: ids, status }
  })

  return touchData({ ...data, songs, fragments, memos })
}

export function catalogWasRepaired(before: VeinData, after: VeinData): boolean {
  return JSON.stringify(before) !== JSON.stringify(after)
}
