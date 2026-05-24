import { useMemo, useState } from 'react'
import { fragmentCountForMemo, getAvailableMemosForSong } from '@/lib/search'
import { formatMemoDate } from '@/lib/format'
import type { VeinData } from '@/lib/types'
import { Button } from '@/components/Button'
import { SearchField } from '@/components/SearchField'

export function SongLinkMemosPanel({
  data,
  songId,
  onLink,
}: {
  data: VeinData
  songId: string
  onLink: (memoId: string) => void
}) {
  const [query, setQuery] = useState('')

  const available = useMemo(
    () => getAvailableMemosForSong(data, songId, query),
    [data, songId, query],
  )

  const totalAvailable = useMemo(
    () => getAvailableMemosForSong(data, songId).length,
    [data, songId],
  )

  return (
    <section className="mt-8 rounded-xl border border-vein-border bg-vein-surface/80 p-4">
      <div>
        <h2 className="text-sm font-medium">Link entire memos</h2>
        <p className="mt-1 text-xs text-vein-muted">
          Attach a full recording session — all its fragments join this song at once.
          {totalAvailable > 0 && ` · ${totalAvailable} memo(s) available`}
        </p>
      </div>

      <SearchField
        placeholder="Search memo titles…"
        value={query}
        onChange={setQuery}
        className="mt-3 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
      />

      <ul className="mt-3 max-h-48 space-y-0 overflow-y-auto">
        {available.length === 0 && (
          <li className="py-6 text-center text-sm text-vein-muted">
            {totalAvailable === 0
              ? data.memos.length === 0
                ? 'No memos in your vault yet. Record one from the Library.'
                : 'Every memo is already linked to this song.'
              : 'No memos match your search.'}
          </li>
        )}
        {available.map((m) => {
          const count = fragmentCountForMemo(data, m)
          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 border-b border-vein-border/60 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.title}</p>
                <p className="text-xs text-vein-muted">
                  {formatMemoDate(m.date)} · {count} fragment{count === 1 ? '' : 's'}
                </p>
                {count === 0 && (
                  <p className="mt-1 text-xs text-vein-warm">No fragments yet — memo still links</p>
                )}
              </div>
              <Button
                variant="secondary"
                className="shrink-0 !min-h-9 !text-xs"
                onClick={() => onLink(m.id)}
              >
                Link memo
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
