import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVein } from '@/context/VeinContext'
import { SONG_FROM_MEMO_MODES, type SongFromMemoLinkMode } from '@/lib/types'
import { Button } from '@/components/Button'

export function NewSongFromMemoModal({
  memoId,
  memoTitle,
  onClose,
}: {
  memoId: string
  memoTitle: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { addSongFromMemo } = useVein()
  const [mode, setMode] = useState<SongFromMemoLinkMode>('lyric')
  const [title, setTitle] = useState(`${memoTitle} (song)`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const song = addSongFromMemo(memoId, mode, title.trim() || undefined)
      if (!song) {
        setError('Could not create song')
        return
      }
      onClose()
      navigate(`/song/${song.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create song')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-xl border border-vein-border bg-vein-surface p-4 shadow-xl">
        <h2 className="text-sm font-medium">New song from memo</h2>
        <p className="mt-1 text-xs text-vein-muted">Choose which fragments to link.</p>

        <label className="mt-4 block text-xs text-vein-muted">
          Song title
          <input
            className="mt-1 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <fieldset className="mt-4 space-y-2">
          {SONG_FROM_MEMO_MODES.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 ${
                mode === m.id ? 'border-vein-accent bg-vein-accent/10' : 'border-vein-border'
              }`}
            >
              <input
                type="radio"
                name="linkMode"
                className="mt-1"
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
              />
              <span>
                <span className="text-sm font-medium">{m.label}</span>
                <span className="mt-0.5 block text-xs text-vein-muted">{m.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {error && (
          <p className="mt-3 text-sm text-vein-error" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button disabled={busy} onClick={() => void create()}>
            {busy ? 'Creating…' : 'Create song'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
