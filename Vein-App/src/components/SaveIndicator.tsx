import { useVein } from '@/context/VeinContext'
import { Button } from '@/components/Button'

export function SaveIndicator() {
  const { saveStatus, saveError, retrySave, vaultReady } = useVein()

  if (!vaultReady) return null

  if (saveStatus === 'idle') return null

  if (saveStatus === 'saving') {
    return (
      <span className="font-mono text-xs text-vein-muted" role="status" aria-live="polite">
        Saving…
      </span>
    )
  }

  if (saveStatus === 'saved') {
    return (
      <span className="font-mono text-xs text-vein-accent-dim" role="status" aria-live="polite">
        Saved
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-vein-error" role="alert">
        {saveError ?? 'Save failed'}
      </span>
      <Button variant="ghost" className="!min-h-8 !px-2 !py-1 text-xs" onClick={retrySave}>
        Retry
      </Button>
    </div>
  )
}
