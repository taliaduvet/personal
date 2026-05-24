import { memoCountByStatus } from '@/lib/search'
import { formatMemoStatus } from '@/lib/format'
import { MEMO_STATUS_ORDER, type MemoStatus } from '@/lib/types'
import { useVein } from '@/context/VeinContext'

export type MemoStatusFilterValue = MemoStatus | 'all'

export function MemoStatusFilterRow({
  filterStatus,
  onChange,
}: {
  filterStatus: MemoStatusFilterValue
  onChange: (value: MemoStatusFilterValue) => void
}) {
  const { data } = useVein()
  if (!data) return null

  const total = data.memos.length

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-vein-muted">Category</p>
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
        {MEMO_STATUS_ORDER.map((status) => {
          const count = memoCountByStatus(data, status)
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
              {formatMemoStatus(status)}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
