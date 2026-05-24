import { useEffect } from 'react'
import { formatRecordingDuration } from '@/lib/recorder'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { Button } from '@/components/Button'

type Props = {
  onSave: (file: File) => Promise<void>
  onClose: () => void
  saving: boolean
  saveError: string | null
  /** Opened via ?record=1 — show shortcut hint, do not auto-start mic (iOS needs a tap). */
  fromShortcut?: boolean
}

export function RecordMemoPanel({
  onSave,
  onClose,
  saving,
  saveError,
  fromShortcut,
}: Props) {
  const {
    supported,
    phase,
    seconds,
    error,
    start,
    stop,
    cancel,
    reset,
    getFile,
  } = useAudioRecorder()

  useEffect(() => {
    return () => reset()
  }, [reset])

  async function handleSave() {
    const file = getFile()
    if (!file) {
      return
    }
    if (file.size < 512) {
      return
    }
    await onSave(file)
    reset()
  }

  if (!supported) {
    return (
      <div className="mt-4 rounded-xl border border-vein-border bg-vein-surface p-4 text-sm">
        <p className="text-vein-error">
          Recording isn&apos;t available here. Use <strong>Import memo</strong> or open Vein in
          Safari / Chrome on your phone.
        </p>
        <Button variant="ghost" className="mt-3" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-vein-accent/40 bg-vein-surface p-4">
      {fromShortcut && phase === 'idle' && (
        <p className="mb-3 text-sm text-vein-muted">
          Shortcut opened Vein — tap <strong>Start recording</strong> below (mic needs your tap on
          iPhone).
        </p>
      )}

      {phase === 'recording' && (
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 animate-pulse rounded-full bg-vein-error"
            aria-hidden
          />
          <p className="font-mono text-2xl text-vein-accent">{formatRecordingDuration(seconds)}</p>
          <p className="text-sm text-vein-muted">Recording…</p>
        </div>
      )}

      {phase === 'ready' && (
        <p className="text-sm text-vein-text">
          Clip ready ({formatRecordingDuration(seconds)}) — tap <strong>Save to library</strong>{' '}
          to upload to Google Drive (audio + catalog entry).
        </p>
      )}

      {phase === 'idle' && !error && (
        <p className="text-sm text-vein-muted">Capture a new voice memo into your Drive vault.</p>
      )}

      {(error || saveError) && (
        <p className="mt-2 text-sm text-vein-error" role="alert">
          {error ?? saveError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {phase === 'idle' && (
          <Button onClick={() => void start()} disabled={saving}>
            Start recording
          </Button>
        )}
        {phase === 'recording' && (
          <Button onClick={stop} disabled={saving}>
            Stop
          </Button>
        )}
        {phase === 'ready' && (
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save to library'}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            cancel()
            onClose()
          }}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
