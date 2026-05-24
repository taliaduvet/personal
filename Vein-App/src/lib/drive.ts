import { getValidAccessToken } from './auth'
import { createEmptyVeinData } from './mutations'
import { parseVeinData } from './schema'
import { getDriveConfig, setDriveConfig } from './storage'
import type { VeinData, VeinDriveConfig } from './types'
import { VEIN_DATA_CACHE_KEY, VEIN_DATA_FILENAME } from './types'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

async function driveFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${DRIVE_API}${path}`, { ...init, headers })
}

async function driveError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } }
    return data.error?.message || `Google Drive error (${res.status})`
  } catch {
    return `Google Drive error (${res.status})`
  }
}

async function findFolder(parentId: string, name: string): Promise<string | null> {
  const q = encodeURIComponent(
    `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  )
  const res = await driveFetch(`/files?q=${q}&fields=files(id)&pageSize=1`)
  if (!res.ok) throw new Error(await driveError(res))
  const data = (await res.json()) as { files: { id: string }[] }
  return data.files[0]?.id ?? null
}

async function createFolder(parentId: string, name: string): Promise<string> {
  const res = await driveFetch('/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  if (!res.ok) throw new Error(await driveError(res))
  return ((await res.json()) as { id: string }).id
}

async function findFileInFolder(folderId: string, name: string): Promise<string | null> {
  const q = encodeURIComponent(
    `'${folderId}' in parents and name='${name}' and trashed=false`,
  )
  const res = await driveFetch(`/files?q=${q}&fields=files(id)&pageSize=1`)
  if (!res.ok) throw new Error(await driveError(res))
  const data = (await res.json()) as { files: { id: string }[] }
  return data.files[0]?.id ?? null
}

async function listChildren(folderId: string): Promise<{ id: string; name: string; mimeType: string }[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const res = await driveFetch(
    `/files?q=${q}&fields=files(id,name,mimeType)&pageSize=100`,
  )
  if (!res.ok) throw new Error(await driveError(res))
  return ((await res.json()) as { files: { id: string; name: string; mimeType: string }[] }).files
}

async function moveFileToFolder(fileId: string, folderId: string, removeParentId?: string): Promise<void> {
  const token = await getValidAccessToken()
  const body: { addParents: string; removeParents?: string } = { addParents: folderId }
  if (removeParentId && removeParentId !== folderId) {
    body.removeParents = removeParentId
  }
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await driveError(res))
}

async function trashFile(fileId: string): Promise<void> {
  const res = await driveFetch(`/files/${fileId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) })
  if (!res.ok) throw new Error(await driveError(res))
}

async function createJsonFile(folderId: string, name: string, content: object): Promise<string> {
  const token = await getValidAccessToken()
  const boundary = `vein_${crypto.randomUUID()}`
  const meta = JSON.stringify({ name, parents: [folderId], mimeType: 'application/json' })
  const jsonBody = JSON.stringify(content)
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonBody}\r\n` +
    `--${boundary}--`

  const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error(await driveError(res))
  return ((await res.json()) as { id: string }).id
}

function cacheGoodData(data: VeinData): void {
  try {
    sessionStorage.setItem(VEIN_DATA_CACHE_KEY, JSON.stringify(data))
  } catch {
    // quota — non-fatal
  }
}

export function getCachedVeinData(): VeinData | null {
  try {
    const raw = sessionStorage.getItem(VEIN_DATA_CACHE_KEY)
    if (!raw) return null
    return parseVeinData(JSON.parse(raw))
  } catch {
    return null
  }
}

async function findAllVeinRootFolders(): Promise<string[]> {
  const q = encodeURIComponent(
    "name='Vein' and mimeType='application/vnd.google-apps.folder' and trashed=false",
  )
  const res = await driveFetch(`/files?q=${q}&fields=files(id)&pageSize=20`)
  if (!res.ok) throw new Error(await driveError(res))
  return ((await res.json()) as { files: { id: string }[] }).files.map((f) => f.id)
}

async function scoreVeinRoot(rootId: string): Promise<number> {
  let score = 0
  const dataFolderId = await findFolder(rootId, 'Data')
  const audioFolderId = await findFolder(rootId, 'Audio')
  if (audioFolderId) score += 10
  if (dataFolderId) {
    score += 20
    const dataFileId = await findFileInFolder(dataFolderId, VEIN_DATA_FILENAME)
    if (dataFileId) score += 100
  }
  return score
}

async function pickBestVeinRoot(): Promise<string> {
  const roots = await findAllVeinRootFolders()
  if (roots.length === 0) {
    const token = await getValidAccessToken()
    const res = await fetch(`${DRIVE_API}/files?fields=id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Vein', mimeType: 'application/vnd.google-apps.folder' }),
    })
    if (!res.ok) throw new Error(await driveError(res))
    return ((await res.json()) as { id: string }).id
  }

  let best = roots[0]
  let bestScore = await scoreVeinRoot(best)
  for (const id of roots.slice(1)) {
    const s = await scoreVeinRoot(id)
    if (s > bestScore) {
      best = id
      bestScore = s
    }
  }
  return best
}

async function ensureVaultUnderRoot(rootFolderId: string): Promise<VeinDriveConfig> {
  let audioFolderId = await findFolder(rootFolderId, 'Audio')
  if (!audioFolderId) audioFolderId = await createFolder(rootFolderId, 'Audio')

  let dataFolderId = await findFolder(rootFolderId, 'Data')
  if (!dataFolderId) dataFolderId = await createFolder(rootFolderId, 'Data')

  let dataFileId = await findFileInFolder(dataFolderId, VEIN_DATA_FILENAME)

  if (!dataFileId) {
    const q = encodeURIComponent(`name='${VEIN_DATA_FILENAME}' and trashed=false`)
    const search = await driveFetch(`/files?q=${q}&fields=files(id,parents)&pageSize=5`)
    if (search.ok) {
      const found = ((await search.json()) as { files: { id: string; parents?: string[] }[] }).files[0]
      if (found) {
        dataFileId = found.id
        const parents = found.parents ?? []
        if (!parents.includes(dataFolderId)) {
          const oldParent = parents[0]
          await moveFileToFolder(dataFileId, dataFolderId, oldParent)
        }
      }
    }
  }

  if (!dataFileId) {
    dataFileId = await createJsonFile(dataFolderId, VEIN_DATA_FILENAME, createEmptyVeinData())
  }

  const config: VeinDriveConfig = {
    rootFolderId,
    audioFolderId,
    dataFolderId,
    dataFileId,
  }
  setDriveConfig(config)
  return config
}

async function mergeDuplicateRoots(primaryRootId: string, duplicateRootIds: string[]): Promise<number> {
  const primaryAudio = await findFolder(primaryRootId, 'Audio')
  const primaryData = await findFolder(primaryRootId, 'Data')
  if (!primaryAudio || !primaryData) return 0

  let moved = 0
  for (const dupId of duplicateRootIds) {
    if (dupId === primaryRootId) continue
    const children = await listChildren(dupId)
    for (const child of children) {
      if (child.mimeType === 'application/vnd.google-apps.folder') {
        const subChildren = await listChildren(child.id)
        const targetParent =
          child.name === 'Audio' ? primaryAudio : child.name === 'Data' ? primaryData : null
        if (targetParent) {
          for (const f of subChildren) {
            await moveFileToFolder(f.id, targetParent, child.id)
            moved++
          }
        }
        await trashFile(child.id)
      } else {
        await moveFileToFolder(child.id, primaryAudio, dupId)
        moved++
      }
    }
    await trashFile(dupId)
  }
  return moved
}

export interface RepairVaultResult {
  config: VeinDriveConfig
  duplicateFoldersRemoved: number
  filesMoved: number
}

/** Find the best Vein folder, ensure Audio/Data/vein-data.json, merge duplicates to Trash. */
export async function repairDriveVault(): Promise<RepairVaultResult> {
  const roots = await findAllVeinRootFolders()
  const primaryRootId = await pickBestVeinRoot()
  const config = await ensureVaultUnderRoot(primaryRootId)
  const duplicates = roots.filter((id) => id !== primaryRootId)
  const filesMoved = await mergeDuplicateRoots(primaryRootId, duplicates)
  return {
    config,
    duplicateFoldersRemoved: duplicates.length,
    filesMoved,
  }
}

export async function bootstrapDriveVault(): Promise<VeinDriveConfig> {
  const existing = getDriveConfig()
  if (existing?.dataFileId) {
    try {
      await loadVeinDataRaw(existing.dataFileId)
      return existing
    } catch {
      // stale — repair below
    }
  }
  const { config } = await repairDriveVault()
  return config
}

export async function fetchVeinDataRawText(fileId: string): Promise<string> {
  const token = await getValidAccessToken()
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await driveError(res))
  return res.text()
}

export async function loadVeinDataRaw(fileId: string): Promise<VeinData> {
  const text = await fetchVeinDataRawText(fileId)
  const parsed = parseVeinData(JSON.parse(text))
  cacheGoodData(parsed)
  return parsed
}

export async function loadVeinData(): Promise<VeinData> {
  const config = getDriveConfig()
  if (!config?.dataFileId) throw new Error('Vault not initialized')
  return loadVeinDataRaw(config.dataFileId)
}

export async function saveVeinData(data: VeinData): Promise<void> {
  const config = getDriveConfig()
  if (!config?.dataFileId) throw new Error('Vault not initialized')

  const payload = { ...data, updatedAt: new Date().toISOString() }
  const token = await getValidAccessToken()
  const res = await fetch(
    `${DRIVE_UPLOAD}/files/${config.dataFileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) throw new Error(await driveError(res))
  cacheGoodData(payload)
}

export async function resetVeinDataFile(): Promise<VeinData> {
  const empty = createEmptyVeinData()
  await saveVeinData(empty)
  return empty
}

export async function fetchAudioBlob(fileId: string): Promise<Blob> {
  const token = await getValidAccessToken()
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await driveError(res))
  return res.blob()
}

/** Multipart upload so the file lands in Vein/Audio in one step (media-only uploads often miss the folder). */
async function uploadBinaryToFolder(
  folderId: string,
  fileName: string,
  mimeType: string,
  bytes: ArrayBuffer,
): Promise<string> {
  const token = await getValidAccessToken()
  const boundary = `vein_${crypto.randomUUID()}`
  const meta = JSON.stringify({ name: fileName, parents: [folderId], mimeType })
  const encoder = new TextEncoder()
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  )
  const suffix = encoder.encode(`\r\n--${boundary}--`)
  const body = new Blob([prefix, bytes, suffix])

  const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error(await driveError(res))
  return ((await res.json()) as { id: string }).id
}

export interface DriveFileMeta {
  id: string
  name: string
  parents?: string[]
  size?: string
  trashed?: boolean
}

export async function getDriveFileMeta(fileId: string): Promise<DriveFileMeta | null> {
  const res = await driveFetch(
    `/files/${fileId}?fields=id,name,parents,size,trashed`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await driveError(res))
  return (await res.json()) as DriveFileMeta
}

/** Google Drive search does not support `id='...'` — that caused "Invalid Value" errors. */
export async function isFileInFolder(fileId: string, folderId: string): Promise<boolean> {
  if (!looksLikeDriveFileId(fileId)) return false
  try {
    const meta = await getDriveFileMeta(fileId)
    if (!meta || meta.trashed) return false
    if (meta.parents?.includes(folderId)) return true
    const children = await listChildren(folderId)
    return children.some((c) => c.id === fileId)
  } catch {
    return false
  }
}

export function looksLikeDriveFileId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{12,64}$/.test(id)
}

export async function listVaultAudioFiles(): Promise<
  { id: string; name: string; mimeType: string }[]
> {
  const config = getDriveConfig()
  if (!config?.audioFolderId) return []
  const children = await listChildren(config.audioFolderId)
  return children.filter((c) => c.mimeType !== 'application/vnd.google-apps.folder')
}

export async function moveAudioIntoVaultFolder(
  fileId: string,
  audioFolderId: string,
): Promise<void> {
  const meta = await getDriveFileMeta(fileId)
  if (!meta || meta.trashed) throw new Error('Audio file not found on Drive')
  if (meta.parents?.includes(audioFolderId)) return
  const removeParent = meta.parents?.[0]
  await moveFileToFolder(fileId, audioFolderId, removeParent)
}

export async function trashDriveFile(fileId: string): Promise<void> {
  await trashFile(fileId)
}

export async function uploadAudioFile(file: File): Promise<string> {
  if (file.size < 512) {
    throw new Error(
      'Recording is empty or too short. Record for at least a few seconds, then tap Save to library.',
    )
  }

  const { config } = await repairDriveVault()
  if (!config.audioFolderId) throw new Error('Audio folder not ready')

  const mime = file.type || 'audio/mp4'
  const bytes = await file.arrayBuffer()
  const id = await uploadBinaryToFolder(config.audioFolderId, file.name, mime, bytes)
  const placed = await isFileInFolder(id, config.audioFolderId)
  if (!placed) {
    throw new Error('Upload did not land in Vein/Audio. Tap Repair Drive vault and try again.')
  }
  return id
}
