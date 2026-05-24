import { useState } from 'react'
import { useVein } from '@/context/VeinContext'
import { getTagsForIds } from '@/lib/tags'
import { memoCountForTag, songCountForTag } from '@/lib/search'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'

/** Filter chips for library / songs lists. */
export function TagFilterRow({
  filterTagIds,
  onChange,
  countFor = 'memo',
}: {
  filterTagIds: string[]
  onChange: (ids: string[]) => void
  countFor?: 'memo' | 'song'
}) {
  const { data } = useVein()
  if (!data || data.tags.length === 0) return null

  function toggleFilter(tagId: string) {
    if (filterTagIds.includes(tagId)) {
      onChange(filterTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...filterTagIds, tagId])
    }
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-vein-muted">Tags</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([])}
          className={
            filterTagIds.length === 0
              ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
              : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
          }
        >
          All
        </button>
        {data.tags.map((tag) => {
          const active = filterTagIds.includes(tag.id)
          const count =
            countFor === 'song' ? songCountForTag(data, tag.id) : memoCountForTag(data, tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleFilter(tag.id)}
              className={
                active
                  ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
                  : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
              }
            >
              {tag.name}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Assign tags to a memo or song; create new tags inline. */
export function TagAssignPanel({
  tagIds,
  onToggle,
}: {
  tagIds: string[]
  onToggle: (tagId: string) => void
}) {
  const { data, createTag } = useVein()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!data) return null

  const assigned = getTagsForIds(data, tagIds)

  function handleCreate() {
    setError(null)
    try {
      const tag = createTag(newName)
      if (tag) onToggle(tag.id)
      setNewName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create tag')
    }
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-vein-muted">Tags</p>
      {assigned.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {assigned.map((tag) => (
            <Badge key={tag.id} variant="type">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
      {data.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {data.tags.map((tag) => {
            const on = tagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggle(tag.id)}
                className={
                  on
                    ? 'rounded-full border border-vein-accent bg-vein-accent/20 px-3 py-1 text-xs font-medium text-vein-accent'
                    : 'rounded-full border border-vein-border px-3 py-1 text-xs text-vein-muted'
                }
              >
                {on ? '✓ ' : '+ '}
                {tag.name}
              </button>
            )
          })}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
          placeholder="New tag name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
        <Button variant="secondary" className="!min-h-10 shrink-0" onClick={handleCreate}>
          Add tag
        </Button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-vein-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Create and delete tags from the library. */
export function TagManagePanel() {
  const { data, createTag, deleteTag } = useVein()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  if (!data) return null

  function handleCreate() {
    setError(null)
    try {
      createTag(newName)
      setNewName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create tag')
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-vein-border bg-vein-surface/50 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium text-vein-muted"
        onClick={() => setOpen((o) => !o)}
      >
        Manage tags
        <span className="text-vein-accent">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="mt-3">
          {data.tags.length === 0 && (
            <p className="text-xs text-vein-muted">No tags yet. Create one below or on a memo.</p>
          )}
          <ul className="space-y-2">
            {data.tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-vein-border px-3 py-2 text-sm"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-vein-muted">
                  {memoCountForTag(data, tag.id)} memo · {songCountForTag(data, tag.id)} song
                </span>
                <Button
                  variant="ghost"
                  className="!min-h-8 !px-2 !text-xs"
                  onClick={() => deleteTag(tag.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
              placeholder="New tag"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
              }}
            />
            <Button variant="secondary" className="!min-h-10" onClick={handleCreate}>
              Create
            </Button>
          </div>
          {error && (
            <p className="mt-1 text-xs text-vein-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
