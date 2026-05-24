import { useMemo, useState } from 'react'
import type { VeinData } from '@/lib/types'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { formatSongStatus } from '@/lib/format'
import { SearchField } from '@/components/SearchField'

export function SongPicker({
  data,
  fragmentId,
  onLink,
  onClose,
}: {
  data: VeinData
  fragmentId: string
  onLink: (songId: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const fragment = data.fragments.find((f) => f.id === fragmentId)

  const available = useMemo(() => {
    const linked = new Set(fragment?.songIds ?? [])
    return data.songs.filter((s) => !linked.has(s.id))
  }, [data.songs, fragment?.songIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return available
    return available.filter((s) => s.title.toLowerCase().includes(q))
  }, [available, query])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
      <div className="max-h-[80dvh] w-full max-w-lg overflow-hidden rounded-xl border border-vein-border bg-vein-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-vein-border px-4 py-3">
          <h2 className="text-sm font-medium">Add to song</h2>
          <button type="button" className="text-sm text-vein-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">
          <SearchField
            placeholder="Search songs…"
            value={query}
            onChange={setQuery}
            className="w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
          />
          <ul className="mt-3 max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="py-4 text-center text-sm text-vein-muted">No songs found.</li>
            )}
            {filtered.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 border-b border-vein-border py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <Badge>{formatSongStatus(s.status)}</Badge>
                </div>
                <Button variant="secondary" className="shrink-0" onClick={() => onLink(s.id)}>
                  Link
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
