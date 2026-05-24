import type { FragmentType, FragmentStatus, MemoStatus, SongStatus } from './types'

export function formatMemoStatus(status: MemoStatus): string {
  const map: Record<MemoStatus, string> = {
    untouched: 'Untouched',
    reviewed: 'Reviewed',
    has_fragments: 'Has fragments',
  }
  return map[status]
}

export function formatFragmentType(type: FragmentType): string {
  return type.replace('_', ' ')
}

export function formatFragmentStatus(status: FragmentStatus): string {
  return status.replace('_', ' ')
}

export function formatSongStatus(status: SongStatus): string {
  return status.replace('_', ' ')
}

export function formatMemoDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
