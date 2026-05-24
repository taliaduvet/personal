import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useVein } from '@/context/VeinContext'
import { exportSongLineageText, downloadTextFile } from '@/lib/export'
import { FragmentPicker } from '@/components/FragmentPicker'
import { SongLinkFragmentsPanel } from '@/components/SongLinkFragmentsPanel'
import { SongLinkMemosPanel } from '@/components/SongLinkMemosPanel'
import { SongLinkedMemosList } from '@/components/SongLinkedMemosList'
import { SongMetadataFields } from '@/components/SongMetadataFields'
import { SongLyricBoard } from '@/components/SongLyricBoard'
import { SongFragmentList } from '@/components/SongFragmentList'
import { SongSuggestions } from '@/components/SongSuggestions'
import { SongReelPanel } from '@/components/SongReelPanel'
import { SongReferenceUpload } from '@/components/SongReferenceUpload'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { TagAssignPanel } from '@/components/TagControls'
import { Button } from '@/components/Button'
import type { Fragment, SongStatus } from '@/lib/types'

function trackDetailsSummary(song: {
  versionName: string
  key: string
  bpm: string
  mood: string
}): string {
  const parts = [
    song.versionName && `v: ${song.versionName}`,
    song.key,
    song.bpm && `${song.bpm} bpm`,
    song.mood,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Empty — tap to add'
}

export function SongDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    data,
    updateSong,
    linkFragmentToSong,
    unlinkFragmentFromSong,
    linkMemoToSong,
    unlinkMemoFromSong,
    reorderSongFragments,
    toggleSongTag,
    deleteSong,
    duplicateSong,
    uploadSongReference,
    clearSongReference,
  } = useVein()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const song = data?.songs.find((s) => s.id === id)

  if (!data || !song) {
    return (
      <p className="text-sm text-vein-muted">
        Song not found. <Link to="/songs">Back to songs</Link>
      </p>
    )
  }

  const s = song
  const lineage: Fragment[] = s.fragmentIds
    .map((fid) => data.fragments.find((f) => f.id === fid))
    .filter((f): f is Fragment => Boolean(f))

  async function handleDeleteSong() {
    const msg =
      lineage.length > 0
        ? `Delete "${s.title}"? ${lineage.length} linked fragment(s) will be unlinked but not deleted.`
        : `Delete "${s.title}"?`
    if (!confirm(msg)) return

    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSong(s.id)
      navigate('/songs', { replace: true })
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete song')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="pb-8">
      <Link to="/songs" className="text-sm text-vein-muted hover:text-vein-text md:hidden">
        ← Songs
      </Link>

      <input
        className="mt-3 w-full bg-transparent text-xl font-semibold outline-none"
        value={s.title}
        onChange={(e) => updateSong(s.id, { title: e.target.value })}
      />

      <label className="mt-3 block text-xs text-vein-muted">
        Workflow status
        <select
          className="mt-1 w-full max-w-xs rounded-lg border border-vein-border bg-vein-surface px-3 py-2 text-sm"
          value={s.status}
          onChange={(e) =>
            updateSong(s.id, { status: e.target.value as SongStatus })
          }
        >
          <option value="sketching">sketching</option>
          <option value="in_progress">in progress</option>
          <option value="done">done</option>
        </select>
      </label>

      <TagAssignPanel tagIds={s.tagIds} onToggle={(tagId) => toggleSongTag(s.id, tagId)} />

      <label className="mt-4 block text-xs text-vein-muted">
        Working notes
        <textarea
          className="mt-1 min-h-[100px] w-full rounded-lg border border-vein-border bg-vein-surface px-3 py-2 text-sm"
          placeholder="Ideas, structure, to-dos while you work…"
          value={s.notes}
          onChange={(e) => updateSong(s.id, { notes: e.target.value })}
        />
      </label>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            const copy = duplicateSong(s.id, false)
            if (copy) navigate(`/song/${copy.id}`)
          }}
        >
          Duplicate
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const text = exportSongLineageText(data, s.id)
            downloadTextFile(`${s.title.replace(/\s+/g, '-')}-lineage.txt`, text)
          }}
        >
          Export lineage
        </Button>
        <Button
          variant="danger"
          disabled={deleting}
          onClick={() => void handleDeleteSong()}
        >
          {deleting ? 'Deleting…' : 'Delete song'}
        </Button>
      </div>
      {deleteError && (
        <p className="mt-2 text-sm text-vein-error" role="alert">
          {deleteError}
        </p>
      )}

      <SongSuggestions
        data={data}
        songId={s.id}
        onLink={(fragmentId) => linkFragmentToSong(fragmentId, s.id)}
      />

      <SongLinkMemosPanel
        data={data}
        songId={s.id}
        onLink={(memoId) => linkMemoToSong(memoId, s.id)}
      />

      <SongLinkedMemosList
        data={data}
        songId={s.id}
        onUnlink={(memoId) => unlinkMemoFromSong(memoId, s.id)}
      />

      <SongLinkFragmentsPanel
        data={data}
        songId={s.id}
        onLink={(fragmentId) => linkFragmentToSong(fragmentId, s.id)}
        onBrowseAll={() => setPickerOpen(true)}
      />

      <SongFragmentList
        data={data}
        fragments={lineage}
        onReorder={(orderedIds) => reorderSongFragments(s.id, orderedIds)}
        onUnlink={(fragmentId) => unlinkFragmentFromSong(fragmentId, s.id)}
        onLinkFragment={() => setPickerOpen(true)}
      />

      <SongLyricBoard
        data={data}
        song={s}
        onUpdate={(patch) => updateSong(s.id, patch)}
      />

      <SongReelPanel data={data} song={s} fragments={lineage} />

      <CollapsibleSection
        title="Track details"
        summary={trackDetailsSummary(s)}
      >
        <SongMetadataFields
          song={s}
          onUpdate={(patch) => updateSong(s.id, patch)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Playback & reference demo"
        summary={
          s.referenceDriveFileId
            ? `Reference on Drive · ${s.reelClipSeconds}s clips`
            : `${s.reelClipSeconds}s clips · no reference uploaded`
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-vein-muted">
            Reel clip (seconds)
            <input
              type="number"
              min={3}
              max={60}
              className="mt-1 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
              value={s.reelClipSeconds}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v) && v >= 3 && v <= 60) {
                  updateSong(s.id, { reelClipSeconds: v })
                }
              }}
            />
          </label>
          <label className="block text-xs text-vein-muted">
            Reel gap (seconds)
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              className="mt-1 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
              value={s.reelGapSeconds}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v) && v >= 0 && v <= 10) {
                  updateSong(s.id, { reelGapSeconds: v })
                }
              }}
            />
          </label>
        </div>
        <SongReferenceUpload
          song={s}
          onUpload={(file) => uploadSongReference(s.id, file)}
          onClear={() => clearSongReference(s.id)}
        />
      </CollapsibleSection>

      {pickerOpen && (
        <FragmentPicker
          data={data}
          songId={s.id}
          onLink={(fragmentId) => {
            linkFragmentToSong(fragmentId, s.id)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
