import { Link } from 'react-router-dom'
import { fragmentCountForMemo } from '@/lib/search'
import { formatMemoDate } from '@/lib/format'
import type { VeinData } from '@/lib/types'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'

export function SongLinkedMemosList({
  data,
  songId,
  onUnlink,
}: {
  data: VeinData
  songId: string
  onUnlink: (memoId: string) => void
}) {
  const song = data.songs.find((s) => s.id === songId)
  const memos = (song?.memoIds ?? [])
    .map((mid) => data.memos.find((m) => m.id === mid))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))

  if (memos.length === 0) return null

  return (
    <section className="mt-6">
      <h2 className="text-sm font-medium">Linked memos</h2>
      <p className="mt-1 text-xs text-vein-muted">Full sessions attached to this song.</p>
      <ul className="mt-3 space-y-2">
        {memos.map((m) => {
          const count = fragmentCountForMemo(data, m)
          const linkedFrags = data.fragments.filter(
            (f) => f.memoId === m.id && song?.fragmentIds.includes(f.id),
          ).length
          return (
            <li
              key={m.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-vein-border bg-vein-surface px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  to={`/memo/${m.id}`}
                  className="font-medium text-vein-accent hover:underline"
                >
                  {m.title}
                </Link>
                <p className="mt-1 text-xs text-vein-muted">{formatMemoDate(m.date)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="type">
                    {linkedFrags}/{count} fragments on song
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                className="shrink-0 !text-xs"
                onClick={() => onUnlink(m.id)}
              >
                Unlink memo
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
