import { useMemo, useState } from 'react'
import { getAvailableFragmentsForSong } from '@/lib/search'
import { formatFragmentType, formatTimestamp } from '@/lib/format'
import type { VeinData } from '@/lib/types'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { SearchField } from '@/components/SearchField'

export function FragmentPicker({
  data,
  songId,
  onLink,
  onClose,
}: {
  data: VeinData
  songId: string
  onLink: (fragmentId: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => getAvailableFragmentsForSong(data, songId, query),
    [data, songId, query],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
      <div className="max-h-[80dvh] w-full max-w-lg overflow-hidden rounded-xl border border-vein-border bg-vein-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-vein-border px-4 py-3">
          <h2 className="text-sm font-medium">Link fragment to song</h2>
          <button type="button" className="text-sm text-vein-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">
          <SearchField
            placeholder="Search fragments…"
            value={query}
            onChange={setQuery}
            className="w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
            autoFocus
          />
          <ul className="mt-3 max-h-[50dvh] overflow-y-auto">
            {filtered.length === 0 && (
              <li className="py-4 text-center text-sm text-vein-muted">No fragments found.</li>
            )}
            {filtered.map((f) => {
              const memo = data.memos.find((m) => m.id === f.memoId)
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 border-b border-vein-border py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-vein-muted">
                      {memo?.title ?? 'Unknown memo'} · {formatTimestamp(f.timestamp)}
                    </p>
                    <Badge variant="type">{formatFragmentType(f.type)}</Badge>
                  </div>
                  <Button variant="secondary" className="shrink-0" onClick={() => onLink(f.id)}>
                    Link
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
