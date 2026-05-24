import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchVeinDataRawText, getCachedVeinData, resetVeinDataFile } from '@/lib/drive'
import { getDriveConfig } from '@/lib/storage'
import { useVein } from '@/context/VeinContext'
import { Button } from '@/components/Button'

export function RecoveryPage() {
  const navigate = useNavigate()
  const { initVault, vaultError, vaultReady, parseError } = useVein()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const config = getDriveConfig()

  useEffect(() => {
    if (vaultReady && !parseError) {
      navigate('/', { replace: true })
    }
  }, [vaultReady, parseError, navigate])

  async function handleDownloadBackup() {
    if (!config?.dataFileId) return
    setBusy(true)
    setMessage(null)
    try {
      const text = await fetchVeinDataRawText(config.dataFileId)
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vein-data-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Backup downloaded.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (
      !confirm(
        'Reset vein-data.json to empty? This replaces your catalog file in Drive. Download a backup first if unsure.',
      )
    ) {
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await resetVeinDataFile()
      await initVault()
      navigate('/', { replace: true })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  const cached = getCachedVeinData()

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <h1 className="text-xl font-semibold text-vein-error">Vault needs attention</h1>
      <p className="mt-3 text-sm text-vein-muted">
        {vaultError ??
          'vein-data.json is missing or corrupted. You can download a backup or start fresh.'}
      </p>
      {cached && (
        <p className="mt-2 text-xs text-vein-muted">
          A last-good copy from this browser session is cached ({cached.memos.length} memos).
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3">
        <Button variant="secondary" onClick={handleDownloadBackup} disabled={busy || !config}>
          Download backup from Drive
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void (async () => {
              setBusy(true)
              setMessage(null)
              await initVault()
              setBusy(false)
            })()
          }}
          disabled={busy}
        >
          Try loading again
        </Button>
        <Button onClick={handleReset} disabled={busy}>
          Reset to empty vault
        </Button>
      </div>
      {message && <p className="mt-4 text-sm text-vein-muted">{message}</p>}
    </div>
  )
}
