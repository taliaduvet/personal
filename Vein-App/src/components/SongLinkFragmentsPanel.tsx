import { useMemo, useState } from 'react'
import { getAvailableFragmentsForSong } from '@/lib/search'
import { formatFragmentType, formatTimestamp } from '@/lib/format'
import type { VeinData } from '@/lib/types'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { SearchField } from '@/components/SearchField'

type FilterMode = 'all' | 'lyric'

export function SongLinkFragmentsPanel({
  data,
  songId,
  onLink,
  onBrowseAll,
}: {
  data: VeinData
  songId: string
  onLink: (fragmentId: string) => void
  onBrowseAll?: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')

  const available = useMemo(
    () =>
      getAvailableFragmentsForSong(data, songId, query, {
        lyricOnly: filter === 'lyric',
      }),
    [data, songId, query, filter],
  )

  const song = data.songs.find((s) => s.id === songId)
  const vaultTotal = data.fragments.length
  const linkedOnSong = song?.fragmentIds.length ?? 0
  const linkedReal =
    song?.fragmentIds.filter((fid) => data.fragments.some((f) => f.id === fid)).length ?? 0
  const staleLinks = linkedOnSong - linkedReal

  const totalUnlinked = useMemo(
    () => getAvailableFragmentsForSong(data, songId).length,
    [data, songId],
  )

  return (
    <section className="mt-8 rounded-xl border border-vein-border bg-vein-surface/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Link fragments</h2>
          <p className="mt-1 text-xs text-vein-muted">
            {vaultTotal === 0
              ? 'Add fragments from a memo first, then link them here.'
              : `Pull ideas from any memo — ${totalUnlinked} available to link`}
          </p>
        </div>
        {onBrowseAll && totalUnlinked > 8 && (
          <Button variant="ghost" className="!text-xs" onClick={onBrowseAll}>
            Full-screen picker
          </Button>
        )}
      </div>

      <SearchField
        placeholder="Search by label, memo, or type…"
        value={query}
        onChange={setQuery}
        className="mt-3 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={
            filter === 'all'
              ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
              : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
          }
        >
          All types
        </button>
        <button
          type="button"
          onClick={() => setFilter('lyric')}
          className={
            filter === 'lyric'
              ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
              : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
          }
        >
          Lyric highlights
        </button>
      </div>

      <ul className="mt-3 max-h-56 space-y-0 overflow-y-auto">
        {available.length === 0 && (
          <li className="py-6 text-center text-sm text-vein-muted">
            {vaultTotal === 0
              ? 'No fragments in your vault yet. Open a memo and tap Add fragment.'
              : totalUnlinked === 0
                ? 'Every available fragment is already linked to this song.'
                : staleLinks > 0
                  ? 'Broken links on this song were cleared — try again in a moment.'
                  : 'No fragments match your search.'}
          </li>
        )}
        {available.slice(0, 40).map((f) => {
          const memo = data.memos.find((m) => m.id === f.memoId)
          return (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 border-b border-vein-border/60 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.label}</p>
                <p className="text-xs text-vein-muted">
                  {memo?.title ?? 'Memo'} · {formatTimestamp(f.timestamp)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="type">{formatFragmentType(f.type)}</Badge>
                  {f.isLyricCandidate && <Badge variant="accent">Lyric</Badge>}
                </div>
              </div>
              <Button
                variant="secondary"
                className="shrink-0 !min-h-9 !text-xs"
                onClick={() => onLink(f.id)}
              >
                Link
              </Button>
            </li>
          )
        })}
      </ul>
      {available.length > 40 && (
        <p className="mt-2 text-xs text-vein-muted">
          Showing 40 of {available.length}. Refine search or use full-screen picker.
        </p>
      )}
    </section>
  )
}
