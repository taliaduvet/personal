import { suggestFragmentsForSong } from '@/lib/songSuggestions'
import { formatFragmentType, formatTimestamp } from '@/lib/format'
import type { VeinData } from '@/lib/types'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'

export function SongSuggestions({
  data,
  songId,
  onLink,
}: {
  data: VeinData
  songId: string
  onLink: (fragmentId: string) => void
}) {
  const suggestions = suggestFragmentsForSong(data, songId, 6)
  if (suggestions.length === 0) return null

  return (
    <section className="mt-6 rounded-xl border border-dashed border-vein-accent/40 bg-vein-accent/5 px-4 py-3">
      <h2 className="text-sm font-medium text-vein-accent">Suggested fragments</h2>
      <p className="mt-1 text-xs text-vein-muted">
        Same tags, same memos, or lyric highlights not linked yet.
      </p>
      <ul className="mt-3 space-y-2">
        {suggestions.map((f) => {
          const memo = data.memos.find((m) => m.id === f.memoId)
          return (
            <li key={f.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.label}</p>
                <p className="text-xs text-vein-muted">
                  {memo?.title} · {formatTimestamp(f.timestamp)}
                </p>
                <Badge variant="type">{formatFragmentType(f.type)}</Badge>
              </div>
              <Button variant="secondary" className="shrink-0 !text-xs" onClick={() => onLink(f.id)}>
                Link
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
