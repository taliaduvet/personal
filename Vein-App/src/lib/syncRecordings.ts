import {
  cacheAudioBlob,
  cacheAudioForMemo,
  getCachedAudioForUpload,
  linkMemoCacheToDriveFile,
} from './audioCache'
import {
  getCachedVeinData,
  getDriveFileMeta,
  isFileInFolder,
  listVaultAudioFiles,
  looksLikeDriveFileId,
  moveAudioIntoVaultFolder,
  repairDriveVault,
  trashDriveFile,
  uploadAudioFile,
} from './drive'
import { touchData } from './mutations'
import type { Memo, VeinData } from './types'

export type SyncMemoStatus = 'ok' | 'moved' | 'reuploaded' | 'failed'

export interface SyncMemoResult {
  memoId: string
  title: string
  status: SyncMemoStatus
  detail?: string
}

export interface SyncRecordingsReport {
  results: SyncMemoResult[]
  mergedFromBrowser: number
  data: VeinData
  audioFolderId: string
  filesInVault: { id: string; name: string }[]
  memosInCatalog: number
}

const MIN_AUDIO_BYTES = 512

export function mergeBrowserCatalogIntoData(data: VeinData): { data: VeinData; merged: number } {
  const cached = getCachedVeinData()
  if (!cached) return { data, merged: 0 }

  const known = new Set(data.memos.map((m) => m.id))
  const extra = cached.memos.filter((m) => !known.has(m.id))
  if (extra.length === 0) return { data, merged: 0 }

  return {
    data: touchData({
      ...data,
      tags: data.tags.length > 0 ? data.tags : cached.tags ?? [],
      memos: [...extra, ...data.memos],
    }),
    merged: extra.length,
  }
}

function blobToUploadFile(blob: Blob, title: string): File {
  const ext = blob.type.includes('webm') ? 'webm' : 'm4a'
  const mime = blob.type || 'audio/mp4'
  const safe = title.replace(/[^\w\s-]/g, '').trim() || 'voice-memo'
  return new File([blob], `${safe}.${ext}`, { type: mime })
}

async function reuploadFromCache(memo: Memo, blob: Blob): Promise<string> {
  const file = blobToUploadFile(blob, memo.title)
  const newId = await uploadAudioFile(file)
  await cacheAudioBlob(newId, blob)
  await cacheAudioForMemo(memo.id, blob)

  if (looksLikeDriveFileId(memo.driveFileId) && memo.driveFileId !== newId) {
    try {
      const oldMeta = await getDriveFileMeta(memo.driveFileId)
      if (oldMeta?.id) await trashDriveFile(oldMeta.id)
    } catch {
      // best-effort
    }
  }
  return newId
}

export async function syncRecordingsToDrive(data: VeinData): Promise<SyncRecordingsReport> {
  const { config } = await repairDriveVault()
  const audioFolderId = config.audioFolderId
  if (!audioFolderId) throw new Error('Audio folder not ready')

  const { data: mergedData, merged } = mergeBrowserCatalogIntoData(data)
  const results: SyncMemoResult[] = []
  let nextMemos = [...mergedData.memos]

  for (const memo of mergedData.memos) {
    try {
      if (looksLikeDriveFileId(memo.driveFileId)) {
        if (await isFileInFolder(memo.driveFileId, audioFolderId)) {
          results.push({ memoId: memo.id, title: memo.title, status: 'ok' })
          continue
        }
      }

      const cached = await getCachedAudioForUpload(memo.id, memo.driveFileId)
      if (cached) {
        const newId = await reuploadFromCache(memo, cached)
        nextMemos = nextMemos.map((m) =>
          m.id === memo.id ? { ...m, driveFileId: newId } : m,
        )
        results.push({
          memoId: memo.id,
          title: memo.title,
          status: 'reuploaded',
          detail: 'Uploaded from audio saved in this browser',
        })
        continue
      }

      if (looksLikeDriveFileId(memo.driveFileId)) {
        const meta = await getDriveFileMeta(memo.driveFileId)
        if (meta && !meta.trashed && Number(meta.size ?? 0) >= MIN_AUDIO_BYTES) {
          await moveAudioIntoVaultFolder(memo.driveFileId, audioFolderId)
          if (await isFileInFolder(memo.driveFileId, audioFolderId)) {
            results.push({
              memoId: memo.id,
              title: memo.title,
              status: 'moved',
              detail: 'Moved into Vein/Audio',
            })
            continue
          }
        }
      }

      results.push({
        memoId: memo.id,
        title: memo.title,
        status: 'failed',
        detail:
          'No audio in this browser. Open the memo (wait for the waveform), or use Attach audio on that memo.',
      })
    } catch (e) {
      results.push({
        memoId: memo.id,
        title: memo.title,
        status: 'failed',
        detail: e instanceof Error ? e.message : 'Sync failed',
      })
    }
  }

  const filesInVault = (await listVaultAudioFiles()).map((f) => ({
    id: f.id,
    name: f.name,
  }))

  return {
    results,
    mergedFromBrowser: merged,
    data: touchData({ ...mergedData, memos: nextMemos }),
    audioFolderId,
    filesInVault,
    memosInCatalog: nextMemos.length,
  }
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`
}

export { linkMemoCacheToDriveFile }
