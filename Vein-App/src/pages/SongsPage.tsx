import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useVein } from '@/context/VeinContext'
import {
  formatFragmentTypeSummary,
  fragmentTypeSummaryForSong,
  searchSongs,
  sourceMemoCountForSong,
  type SongListFilter,
  type SongStatusFilterValue,
} from '@/lib/search'
import { getTagsForIds } from '@/lib/tags'
import { formatSongStatus } from '@/lib/format'
import { TagFilterRow, TagManagePanel } from '@/components/TagControls'
import { SongListFilterRow, SongStatusFilterRow } from '@/components/SongStatusFilter'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { SearchField } from '@/components/SearchField'

export function SongsPage() {
  const navigate = useNavigate()
  const { data, addSong } = useVein()
  const [query, setQuery] = useState('')
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<SongStatusFilterValue>('all')
  const [listFilter, setListFilter] = useState<SongListFilter>('all')

  if (!data) return null

  const songs = searchSongs(
    data,
    query,
    filterTagIds,
    filterStatus === 'all' ? null : filterStatus,
    listFilter,
  )

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Songs</h1>
        <Button
          variant="secondary"
          onClick={() => {
            const song = addSong({ title: 'Untitled song' })
            if (song) navigate(`/song/${song.id}`)
          }}
        >
          New song
        </Button>
      </div>

      <SearchField
        placeholder="Search titles, notes, fragments, and tags…"
        value={query}
        onChange={setQuery}
        className="mt-4 w-full rounded-lg border border-vein-border bg-vein-surface px-3 py-2.5 text-sm"
      />

      <SongStatusFilterRow filterStatus={filterStatus} onChange={setFilterStatus} />
      <SongListFilterRow listFilter={listFilter} onChange={setListFilter} />

      <TagFilterRow
        filterTagIds={filterTagIds}
        onChange={setFilterTagIds}
        countFor="song"
      />
      <TagManagePanel />

      <ul className="mt-4 space-y-2">
        {songs.length === 0 && (
          <li className="rounded-xl border border-vein-border bg-vein-surface px-4 py-8 text-center text-sm text-vein-muted">
            {query ||
            filterTagIds.length > 0 ||
            filterStatus !== 'all' ||
            listFilter !== 'all'
              ? 'No songs match your filters.'
              : 'No songs yet. Tap New song to start tracking a track.'}
          </li>
        )}
        {songs.map((song) => (
          <li key={song.id}>
            <Link
              to={`/song/${song.id}`}
              className="block rounded-xl border border-vein-border bg-vein-surface px-4 py-3 active:bg-vein-accent/10"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{song.title}</p>
                <Badge>{formatSongStatus(song.status)}</Badge>
              </div>
              <p className="mt-2 font-mono text-xs text-vein-muted">
                {song.fragmentIds.length} fragment(s) · {sourceMemoCountForSong(data, song.id)}{' '}
                memo(s)
                {song.key || song.bpm ? (
                  <>
                    {' '}
                    · {[song.key, song.bpm ? `${song.bpm} bpm` : ''].filter(Boolean).join(' ')}
                  </>
                ) : null}
              </p>
              {song.fragmentIds.length > 0 && (
                <p className="mt-1 text-xs text-vein-muted">
                  {formatFragmentTypeSummary(fragmentTypeSummaryForSong(data, song.id))}
                </p>
              )}
              <p className="mt-1 text-xs text-vein-muted/80">
                Updated {new Date(song.updatedAt).toLocaleDateString()}
              </p>
              {song.tagIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {getTagsForIds(data, song.tagIds).map((tag) => (
                    <Badge key={tag.id} variant="type">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
