import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useVein } from '@/context/VeinContext'
import { getFragmentsForMemo } from '@/lib/search'
import {
  formatFragmentStatus,
  formatFragmentType,
  formatTimestamp,
} from '@/lib/format'
import type { FragmentType } from '@/lib/types'
import { WaveformPlayer, type WaveformPlayerHandle } from '@/components/WaveformPlayer'
import { useMemoAudio } from '@/hooks/useMemoAudio'
import { TranscriptPanel } from '@/components/TranscriptPanel'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { TagAssignPanel } from '@/components/TagControls'
import { SongPicker } from '@/components/SongPicker'
import { NewSongFromMemoModal } from '@/components/NewSongFromMemoModal'

const FRAGMENT_TYPES: FragmentType[] = ['melody', 'lyric', 'groove', 'vibe', 'full_idea']

export function MemoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const seekOnLoad = parseFloat(searchParams.get('t') ?? '')
  const {
    data,
    updateMemo,
    addFragment,
    updateFragment,
    transcribeMemo,
    toggleMemoTag,
    uploadMemoAudio,
    deleteMemo,
    linkFragmentToSong,
  } = useVein()

  const memo = data?.memos.find((m) => m.id === id)
  const fragments = data && id ? getFragmentsForMemo(data, id) : []
  const { blobUrl, loading: audioLoading, error: audioError } = useMemoAudio(
    memo?.driveFileId,
    id,
  )
  const attachRef = useRef<HTMLInputElement>(null)
  const [attachBusy, setAttachBusy] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)

  const playerRef = useRef<WaveformPlayerHandle>(null)
  const [showFragmentForm, setShowFragmentForm] = useState(false)
  const [fragLabel, setFragLabel] = useState('')
  const [fragType, setFragType] = useState<FragmentType>('melody')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [titleEdit, setTitleEdit] = useState(memo?.title ?? '')
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [capturedAt, setCapturedAt] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [songPickerFragmentId, setSongPickerFragmentId] = useState<string | null>(null)
  const [showNewSongModal, setShowNewSongModal] = useState(false)

  useEffect(() => {
    setTitleEdit(memo?.title ?? '')
  }, [memo?.title])

  useEffect(() => {
    if (!Number.isNaN(seekOnLoad) && playerRef.current && blobUrl) {
      playerRef.current.seekTo(seekOnLoad)
    }
  }, [seekOnLoad, blobUrl])

  if (!data || !memo) {
    return (
      <p className="text-sm text-vein-muted">
        Memo not found. <Link to="/library">Back to library</Link>
      </p>
    )
  }

  const m = memo

  async function handleTranscribe() {
    setTranscribeError(null)
    setTranscribing(true)
    try {
      await transcribeMemo(m.id)
    } catch (e) {
      setTranscribeError(e instanceof Error ? e.message : 'Transcription failed')
    } finally {
      setTranscribing(false)
    }
  }

  function saveFragment() {
    if (!fragLabel.trim()) return
    const time = capturedAt
    addFragment({
      memoId: m.id,
      timestamp: time,
      label: fragLabel.trim(),
      type: fragType,
    })
    setFragLabel('')
    setShowFragmentForm(false)
  }

  function openFragmentForm() {
    setCapturedAt(playerRef.current?.getTime() ?? 0)
    setShowFragmentForm(true)
  }

  async function handleDeleteMemo() {
    const n = fragments.length
    const msg =
      n > 0
        ? `Delete "${m.title}" and its ${n} fragment(s)? The audio file will be removed from Google Drive.`
        : `Delete "${m.title}"? The audio file will be removed from Google Drive.`
    if (!confirm(msg)) return

    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteMemo(m.id)
      navigate('/library', { replace: true })
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete memo')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <div className="shrink-0 border-b border-vein-border pb-4">
        <Link to="/library" className="text-sm text-vein-muted hover:text-vein-text md:hidden">
          ← Library
        </Link>
        <input
          className="mt-2 w-full bg-transparent text-lg font-semibold text-vein-text outline-none"
          value={titleEdit}
          onChange={(e) => setTitleEdit(e.target.value)}
          onBlur={() => {
            if (titleEdit.trim() && titleEdit !== m.title) {
              updateMemo(m.id, { title: titleEdit.trim() })
            }
          }}
        />
        <TagAssignPanel tagIds={m.tagIds} onToggle={(tagId) => toggleMemoTag(m.id, tagId)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="!min-h-10"
            onClick={handleTranscribe}
            disabled={transcribing || m.transcriptionStatus === 'transcribing'}
          >
            {transcribing || m.transcriptionStatus === 'transcribing'
              ? 'Transcribing…'
              : 'Transcribe'}
          </Button>
          <Button variant="secondary" className="!min-h-10" onClick={() => setShowNewSongModal(true)}>
            New song from memo
          </Button>
          <Button
            variant="ghost"
            onClick={() => updateMemo(m.id, { status: 'reviewed' })}
          >
            Mark reviewed
          </Button>
          <Button
            variant="danger"
            className="!min-h-10"
            disabled={deleting}
            onClick={() => void handleDeleteMemo()}
          >
            {deleting ? 'Deleting…' : 'Delete memo'}
          </Button>
        </div>
        {deleteError && (
          <p className="mt-2 text-sm text-vein-error" role="alert">
            {deleteError}
          </p>
        )}
        {transcribeError && (
          <p className="mt-2 text-sm text-vein-error" role="alert">
            {transcribeError}
          </p>
        )}
        <div className="mt-4">
          {audioLoading && <p className="text-sm text-vein-muted">Loading audio…</p>}
          {(audioError || attachError) && (
            <p className="text-sm text-vein-error" role="alert">
              {attachError ?? audioError}
            </p>
          )}
          {blobUrl && <WaveformPlayer ref={playerRef} blobUrl={blobUrl} />}
          <input
            ref={attachRef}
            type="file"
            accept="audio/*,.m4a"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !id) return
              setAttachError(null)
              setAttachBusy(true)
              try {
                await uploadMemoAudio(id, file)
              } catch (err) {
                setAttachError(err instanceof Error ? err.message : 'Upload failed')
              } finally {
                setAttachBusy(false)
                e.target.value = ''
              }
            }}
          />
          <Button
            variant="secondary"
            className="mt-3 !min-h-10"
            disabled={attachBusy}
            onClick={() => attachRef.current?.click()}
          >
            {attachBusy ? 'Uploading…' : 'Attach audio file'}
          </Button>
          <p className="mt-1 text-xs text-vein-muted">
            Use this if the recording never reached Drive — pick the same audio from Files.
          </p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto pb-24 pt-4">
        <h2 className="text-sm font-medium text-vein-muted">Fragments</h2>
        <ul className="mt-2 space-y-2">
          {fragments.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border border-vein-border bg-vein-surface px-4 py-3"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="font-mono text-sm text-vein-accent underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      playerRef.current?.seekTo(f.timestamp)
                    }}
                  >
                    {formatTimestamp(f.timestamp)}
                  </button>
                  <span className="font-medium">{f.label}</span>
                  {f.isLyricCandidate && <Badge variant="accent">Lyric</Badge>}
                  <Badge variant="type">{formatFragmentType(f.type)}</Badge>
                  <Badge>{formatFragmentStatus(f.status)}</Badge>
                </div>
              </button>
              {expandedId === f.id && (
                <div className="mt-3 space-y-2 border-t border-vein-border pt-3">
                  <label className="block text-xs text-vein-muted">
                    Status
                    <select
                      className="mt-1 w-full rounded border border-vein-border bg-vein-bg px-2 py-1.5 text-sm"
                      value={f.status}
                      onChange={(e) =>
                        updateFragment(f.id, {
                          status: e.target.value as typeof f.status,
                        })
                      }
                    >
                      <option value="raw">raw</option>
                      <option value="in_use">in use</option>
                      <option value="developed">developed</option>
                      <option value="shelved">shelved</option>
                    </select>
                  </label>
                  {f.songIds.length > 0 && (
                    <ul className="text-xs text-vein-muted">
                      {f.songIds.map((sid) => {
                        const song = data.songs.find((s) => s.id === sid)
                        return (
                          <li key={sid}>
                            <Link to={`/song/${sid}`} className="text-vein-accent hover:underline">
                              {song?.title ?? 'Song'}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="!text-xs"
                      onClick={() => setSongPickerFragmentId(f.id)}
                    >
                      Add to song…
                    </Button>
                    <Button
                      variant="ghost"
                      className="!text-xs"
                      onClick={() => updateFragment(f.id, { status: 'shelved' })}
                    >
                      Shelve
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {m.transcript && <TranscriptPanel transcript={m.transcript} />}
      </div>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 mx-auto max-w-lg px-4 md:bottom-4 md:left-[300px]">
        {showFragmentForm ? (
          <div className="rounded-xl border border-vein-border bg-vein-surface p-4 shadow-lg">
            <p className="font-mono text-xs text-vein-accent">
              @ {formatTimestamp(capturedAt)}
            </p>
            <input
              className="mt-2 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
              placeholder="Label"
              value={fragLabel}
              onChange={(e) => setFragLabel(e.target.value)}
              autoFocus
            />
            <select
              className="mt-2 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
              value={fragType}
              onChange={(e) => setFragType(e.target.value as FragmentType)}
            >
              {FRAGMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatFragmentType(t)}
                </option>
              ))}
            </select>
            <div className="mt-3 flex gap-2">
              <Button onClick={saveFragment}>Save</Button>
              <Button variant="ghost" onClick={() => setShowFragmentForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button className="w-full shadow-lg" onClick={openFragmentForm}>
            Add fragment
          </Button>
        )}
      </div>

      {showNewSongModal && (
        <NewSongFromMemoModal
          memoId={m.id}
          memoTitle={m.title}
          onClose={() => setShowNewSongModal(false)}
        />
      )}
      {songPickerFragmentId && (
        <SongPicker
          data={data}
          fragmentId={songPickerFragmentId}
          onLink={(songId) => {
            linkFragmentToSong(songPickerFragmentId, songId)
            setSongPickerFragmentId(null)
          }}
          onClose={() => setSongPickerFragmentId(null)}
        />
      )}
    </div>
  )
}
