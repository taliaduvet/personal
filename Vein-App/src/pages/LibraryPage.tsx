import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useVein } from '@/context/VeinContext'
import { cacheAudioBlob, cacheAudioForMemo } from '@/lib/audioCache'
import { uploadAudioFile } from '@/lib/drive'
import { driveFolderUrl } from '@/lib/syncRecordings'
import { searchMemos } from '@/lib/search'
import { MEMO_STATUS_ORDER } from '@/lib/types'
import { TagFilterRow, TagManagePanel } from '@/components/TagControls'
import {
  MemoStatusFilterRow,
  type MemoStatusFilterValue,
} from '@/components/MemoStatusFilter'
import { MemoListItem } from '@/components/MemoListItem'
import { WHISPER_MAX_BYTES } from '@/lib/constants'
import { formatMemoStatus } from '@/lib/format'
import {
  ImportHelpBanner,
  IosInstallBanner,
  RecordShortcutHelpBanner,
} from '@/components/HelpBanner'
import { RecordMemoPanel } from '@/components/RecordMemoPanel'
import { Button } from '@/components/Button'
import { SearchField } from '@/components/SearchField'

export function LibraryPage() {
  const { data, addMemo, repairVault, saveNow, syncRecordingsToDrive } = useVein()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<MemoStatusFilterValue>('all')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showRecord, setShowRecord] = useState(false)
  const [recordFromShortcut, setRecordFromShortcut] = useState(false)
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const openedShortcutRef = useRef(false)
  const [syncing, setSyncing] = useState(false)
  const [syncReport, setSyncReport] = useState<string | null>(null)

  useEffect(() => {
    const wantsRecord =
      searchParams.get('record') === '1' || searchParams.get('record') === 'true'
    if (!wantsRecord || openedShortcutRef.current) return
    openedShortcutRef.current = true
    setShowRecord(true)
    setRecordFromShortcut(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('record')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  if (!data) return null

  const statusParam =
    filterStatus === 'all' ? null : filterStatus
  const memos = searchMemos(data, query, filterTagIds, statusParam)
  const showGrouped =
    filterStatus === 'all' && !query.trim() && filterTagIds.length === 0
  const busy = importing || savingRecord

  async function saveMemoFile(file: File) {
    if (file.size > WHISPER_MAX_BYTES) {
      throw new Error('Recording is over 25MB. Stop sooner and try again.')
    }
    const id = await uploadAudioFile(file)
    const title = file.name.replace(/\.[^.]+$/, '') || 'Voice memo'
    const memo = addMemo({ title, driveFileId: id })
    await cacheAudioBlob(id, file)
    if (memo) await cacheAudioForMemo(memo.id, file)
    await saveNow()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)

    if (file.size > WHISPER_MAX_BYTES) {
      setImportError(
        'File is over 25MB. Export a shorter clip from Voice Memos before importing.',
      )
      e.target.value = ''
      return
    }

    setImporting(true)
    try {
      await saveMemoFile(file)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function handleRecordSave(file: File) {
    setRecordError(null)
    setSavingRecord(true)
    try {
      await saveMemoFile(file)
      setShowRecord(false)
      setRecordFromShortcut(false)
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : 'Save failed')
      throw err
    } finally {
      setSavingRecord(false)
    }
  }

  function closeRecord() {
    setShowRecord(false)
    setRecordFromShortcut(false)
    setRecordError(null)
  }

  const [syncFolderUrl, setSyncFolderUrl] = useState<string | null>(null)

  async function handleSyncToDrive() {
    setSyncing(true)
    setSyncReport(null)
    setSyncFolderUrl(null)
    try {
      const report = await syncRecordingsToDrive()
      setSyncFolderUrl(driveFolderUrl(report.audioFolderId))

      const ok = report.results.filter((r) => r.status === 'ok').length
      const moved = report.results.filter((r) => r.status === 'moved').length
      const reuploaded = report.results.filter((r) => r.status === 'reuploaded').length
      const failed = report.results.filter((r) => r.status === 'failed')

      const parts: string[] = []
      if (report.mergedFromBrowser > 0) {
        parts.push(`${report.mergedFromBrowser} memo(s) restored from this browser`)
      }
      if (reuploaded > 0) parts.push(`${reuploaded} uploaded`)
      if (moved > 0) parts.push(`${moved} moved`)
      if (ok > 0) parts.push(`${ok} already in Vein/Audio`)

      const vaultCount = report.filesInVault.length
      const catalogCount = report.memosInCatalog
      parts.push(
        `Drive folder has ${vaultCount} audio file${vaultCount === 1 ? '' : 's'} (${catalogCount} memo${catalogCount === 1 ? '' : 's'} in catalog)`,
      )

      if (vaultCount === 0 && catalogCount > 0) {
        parts.push(
          'No audio in Vein/Audio yet — open each memo on this device, wait for it to load, then sync again',
        )
      }

      setSyncReport(parts.join(' · '))

      if (failed.length > 0) {
        setSyncReport(
          `${parts.join(' · ')}. Still missing: ${failed.map((f) => `${f.title} (${f.detail ?? 'failed'})`).join('; ')}`,
        )
      }
    } catch (err) {
      setSyncReport(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <IosInstallBanner />
      <RecordShortcutHelpBanner />
      <ImportHelpBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold md:hidden">Library</h1>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.m4a"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            onClick={() => {
              setRecordFromShortcut(false)
              setShowRecord(true)
            }}
            disabled={busy}
          >
            Record
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </div>

      {showRecord && (
        <RecordMemoPanel
          fromShortcut={recordFromShortcut}
          saving={savingRecord}
          saveError={recordError}
          onSave={handleRecordSave}
          onClose={closeRecord}
        />
      )}

      <SearchField
        placeholder="Search titles, fragments, and tags…"
        value={query}
        onChange={setQuery}
        className="mt-4 w-full rounded-lg border border-vein-border bg-vein-surface px-3 py-2.5 text-sm"
      />

      <MemoStatusFilterRow filterStatus={filterStatus} onChange={setFilterStatus} />
      <TagFilterRow filterTagIds={filterTagIds} onChange={setFilterTagIds} />
      <TagManagePanel />

      {importError && (
        <p className="mt-3 text-sm text-vein-error" role="alert">
          {importError}
        </p>
      )}

      <div className="mt-4 space-y-6 pb-4">
        {memos.length === 0 && (
          <p className="rounded-xl border border-vein-border bg-vein-surface px-4 py-8 text-center text-sm text-vein-muted">
            {query || filterTagIds.length > 0 || filterStatus !== 'all'
              ? 'No memos match your filters.'
              : 'No memos yet — tap Record or Import your first voice memo.'}
          </p>
        )}

        {showGrouped && memos.length > 0 ? (
          MEMO_STATUS_ORDER.map((status) => {
            const group = memos.filter((m) => m.status === status)
            if (group.length === 0) return null
            return (
              <section key={status}>
                <h2 className="text-sm font-semibold text-vein-text">
                  {formatMemoStatus(status)}
                  <span className="ml-2 font-normal text-vein-muted">({group.length})</span>
                </h2>
                <ul className="mt-2 space-y-2">
                  {group.map((memo) => (
                    <MemoListItem key={memo.id} data={data} memo={memo} />
                  ))}
                </ul>
              </section>
            )
          })
        ) : (
          <ul className="space-y-2">
            {memos.map((memo) => (
              <MemoListItem key={memo.id} data={data} memo={memo} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-vein-border pt-4">
        <Button
          variant="secondary"
          className="w-full"
          disabled={syncing || busy}
          onClick={() => void handleSyncToDrive()}
        >
          {syncing ? 'Syncing to Drive…' : 'Sync recordings to Drive'}
        </Button>
        <p className="text-xs text-vein-muted">
          Uploads memos that are only on this device into <strong>Vein/Audio</strong> and saves your
          catalog. Use the same phone or computer you recorded on.
        </p>
        {syncReport && (
          <p className="text-sm text-vein-text" role="status">
            {syncReport}
          </p>
        )}
        {syncFolderUrl && (
          <a
            href={syncFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-vein-accent underline"
          >
            Open Vein → Audio folder in Google Drive
          </a>
        )}
        <Button variant="ghost" className="text-xs" onClick={() => void repairVault()}>
          Repair Drive vault
        </Button>
      </div>
    </div>
  )
}
