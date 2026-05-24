import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Fragment, VeinData } from '@/lib/types'
import { formatFragmentType, formatTimestamp } from '@/lib/format'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'

export function SongFragmentList({
  data,
  fragments,
  onReorder,
  onUnlink,
  onLinkFragment,
}: {
  data: VeinData
  fragments: Fragment[]
  onReorder: (orderedIds: string[]) => void
  onUnlink: (fragmentId: string) => void
  onLinkFragment?: () => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return
    const ids = fragments.map((f) => f.id)
    const fromIdx = ids.indexOf(fromId)
    const toIdx = ids.indexOf(toId)
    if (fromIdx < 0 || toIdx < 0) return
    const next = [...ids]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, fromId)
    onReorder(next)
  }

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Linked fragments</h2>
          <p className="mt-1 text-xs text-vein-muted">
            {fragments.length === 0
              ? 'Nothing linked yet — add from the panel above.'
              : `${fragments.length} linked · drag to set play and board order`}
          </p>
        </div>
        {onLinkFragment && fragments.length > 0 && (
          <Button variant="secondary" className="!min-h-9 !text-xs" onClick={onLinkFragment}>
            + Link more
          </Button>
        )}
      </div>
      {fragments.length === 0 ? (
        onLinkFragment ? (
          <Button className="mt-3 w-full sm:w-auto" variant="secondary" onClick={onLinkFragment}>
            Link your first fragment
          </Button>
        ) : (
          <p className="mt-2 text-sm text-vein-muted">No fragments linked yet.</p>
        )
      ) : (
        <ul className="mt-3 space-y-2">
          {fragments.map((f) => {
            const memo = data.memos.find((m) => m.id === f.memoId)
            return (
              <li
                key={f.id}
                draggable
                onDragStart={() => setDragId(f.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) reorder(dragId, f.id)
                  setDragId(null)
                }}
                onDragEnd={() => setDragId(null)}
                className={`rounded-xl border bg-vein-surface px-4 py-3 ${
                  dragId === f.id ? 'border-vein-accent opacity-80' : 'border-vein-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-vein-muted">Drag ⋮⋮</p>
                    <p className="font-medium">{f.label}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="type">{formatFragmentType(f.type)}</Badge>
                      <span className="font-mono text-xs text-vein-muted">
                        {formatTimestamp(f.timestamp)}
                      </span>
                    </div>
                    <Link
                      to={`/memo/${f.memoId}?t=${f.timestamp}`}
                      className="mt-2 inline-block text-sm text-vein-accent"
                    >
                      {memo?.title ?? 'Source memo'} →
                    </Link>
                  </div>
                  <Button
                    variant="ghost"
                    className="!text-xs shrink-0"
                    onClick={() => onUnlink(f.id)}
                  >
                    Unlink
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
