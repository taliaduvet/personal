import { Link } from 'react-router-dom'
import { fragmentCountForMemo } from '@/lib/search'
import { getTagsForIds } from '@/lib/tags'
import { formatMemoDate, formatMemoStatus } from '@/lib/format'
import type { Memo, VeinData } from '@/lib/types'
import { Badge } from '@/components/Badge'

export function MemoListItem({ data, memo }: { data: VeinData; memo: Memo }) {
  return (
    <li>
      <Link
        to={`/memo/${memo.id}`}
        className="block rounded-xl border border-vein-border bg-vein-surface px-4 py-3 active:bg-vein-accent/10"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{memo.title}</p>
            <p className="mt-0.5 text-xs text-vein-muted">{formatMemoDate(memo.date)}</p>
          </div>
          <Badge>{formatMemoStatus(memo.status)}</Badge>
        </div>
        <p className="mt-2 font-mono text-xs text-vein-accent-dim">
          {fragmentCountForMemo(data, memo)} fragment
          {fragmentCountForMemo(data, memo) === 1 ? '' : 's'}
        </p>
        {memo.tagIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {getTagsForIds(data, memo.tagIds).map((tag) => (
              <Badge key={tag.id} variant="type">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </Link>
    </li>
  )
}
