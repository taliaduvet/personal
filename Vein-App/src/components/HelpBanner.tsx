import { useState } from 'react'
import { HELP_IMPORT_KEY, HELP_SHORTCUT_KEY, IOS_INSTALL_KEY } from '@/lib/constants'

function appOrigin(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin
}

export function RecordShortcutHelpBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(HELP_SHORTCUT_KEY) === '1',
  )

  if (dismissed) return null

  const recordUrl = `${appOrigin()}/library?record=1`

  return (
    <div className="mb-4 rounded-xl border border-vein-border bg-vein-surface p-4 text-sm text-vein-text">
      <p className="font-medium text-vein-accent">Quick record from your Home Screen</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-vein-muted">
        <li>
          Open the <strong>Shortcuts</strong> app → <strong>New Shortcut</strong>.
        </li>
        <li>
          Add <strong>Open URL</strong> and paste:{' '}
          <code className="break-all text-xs text-vein-text">{recordUrl}</code>
        </li>
        <li>
          Name it <strong>Record in Vein</strong> → tap the shortcut →{' '}
          <strong>Add to Home Screen</strong>.
        </li>
        <li>
          First time: sign in to Vein if asked, then tap <strong>Start recording</strong>.
        </li>
      </ol>
      <button
        type="button"
        className="mt-3 text-xs text-vein-accent underline"
        onClick={() => {
          localStorage.setItem(HELP_SHORTCUT_KEY, '1')
          setDismissed(true)
        }}
      >
        Got it
      </button>
    </div>
  )
}

export function ImportHelpBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(HELP_IMPORT_KEY) === '1',
  )

  if (dismissed) return null

  return (
    <div className="mb-4 rounded-xl border border-vein-accent/30 bg-vein-accent/10 p-4 text-sm text-vein-text">
      <p>
        <strong>Record</strong> captures audio here, or import from Files: share from Voice Memos
        to <strong>Files</strong>, then tap <strong>Import</strong>.
      </p>
      <button
        type="button"
        className="mt-3 text-xs text-vein-accent underline"
        onClick={() => {
          localStorage.setItem(HELP_IMPORT_KEY, '1')
          setDismissed(true)
        }}
      >
        Got it
      </button>
    </div>
  )
}

export function IosInstallBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(IOS_INSTALL_KEY) === '1',
  )

  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone)

  if (dismissed || !isIos || isStandalone) return null

  return (
    <div className="mb-4 rounded-xl border border-vein-border bg-vein-surface p-4 text-sm text-vein-muted">
      <p>
        Install Vein: tap <strong>Share</strong> → <strong>Add to Home Screen</strong> for the best
        experience.
      </p>
      <button
        type="button"
        className="mt-2 text-xs text-vein-accent underline"
        onClick={() => {
          localStorage.setItem(IOS_INSTALL_KEY, '1')
          setDismissed(true)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
