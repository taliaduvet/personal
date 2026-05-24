import { songCountByStatus } from '@/lib/search'
import { formatSongStatus } from '@/lib/format'
import type { SongStatus } from '@/lib/types'
import { useVein } from '@/context/VeinContext'
import type { SongListFilter, SongStatusFilterValue } from '@/lib/search'

export function SongStatusFilterRow({
  filterStatus,
  onChange,
}: {
  filterStatus: SongStatusFilterValue
  onChange: (value: SongStatusFilterValue) => void
}) {
  const { data } = useVein()
  if (!data) return null

  const statuses: SongStatus[] = ['sketching', 'in_progress', 'done']
  const total = data.songs.length

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-vein-muted">Status</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('all')}
          className={
            filterStatus === 'all'
              ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
              : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
          }
        >
          All
          <span className="ml-1 opacity-70">({total})</span>
        </button>
        {statuses.map((status) => {
          const count = songCountByStatus(data, status)
          const active = filterStatus === status
          return (
            <button
              key={status}
              type="button"
              onClick={() => onChange(status)}
              className={
                active
                  ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
                  : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
              }
            >
              {formatSongStatus(status)}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const LIST_FILTERS: { id: SongListFilter; label: string }[] = [
  { id: 'all', label: 'All songs' },
  { id: 'no_fragments', label: 'Empty' },
  { id: 'has_fragments', label: 'Has fragments' },
  { id: 'developing', label: 'Developing' },
]

export function SongListFilterRow({
  listFilter,
  onChange,
}: {
  listFilter: SongListFilter
  onChange: (value: SongListFilter) => void
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-vein-muted">Pipeline</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LIST_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={
              listFilter === f.id
                ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
                : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
            }
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
