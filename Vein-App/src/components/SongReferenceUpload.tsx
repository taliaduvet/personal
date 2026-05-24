import { useRef, useState } from 'react'
import type { Song } from '@/lib/types'
import { Button } from '@/components/Button'

export function SongReferenceUpload({
  song,
  onUpload,
  onClear,
}: {
  song: Song
  onUpload: (file: File) => Promise<void>
  onClear: () => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mt-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-vein-muted">
        Reference demo
      </h3>
      <p className="mt-1 text-xs text-vein-muted">
        Optional full-track reference (saved to your Drive vault).
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true)
          setError(null)
          try {
            await onUpload(file)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
          } finally {
            setBusy(false)
            e.target.value = ''
          }
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading…' : song.referenceDriveFileId ? 'Replace demo' : 'Upload demo'}
        </Button>
        {song.referenceDriveFileId && (
          <Button
            variant="ghost"
            className="!text-xs"
            disabled={busy}
            onClick={() => void onClear()}
          >
            Remove demo
          </Button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-vein-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
