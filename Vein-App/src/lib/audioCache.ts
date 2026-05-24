const DB_NAME = 'vein-audio'
const STORE = 'blobs'
const VERSION = 1

const MEMO_KEY_PREFIX = 'memo:'

export function memoCacheKey(memoId: string): string {
  return `${MEMO_KEY_PREFIX}${memoId}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
  })
}

async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(blob, key)
  })
  db.close()
}

async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    tx.onerror = () => reject(tx.error)
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as Blob) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

export async function cacheAudioBlob(driveFileId: string, blob: Blob): Promise<void> {
  await putBlob(driveFileId, blob)
}

export async function cacheAudioForMemo(memoId: string, blob: Blob): Promise<void> {
  await putBlob(memoCacheKey(memoId), blob)
}

export async function listCachedAudioIds(): Promise<string[]> {
  const db = await openDb()
  const ids = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    tx.onerror = () => reject(tx.error)
    const req = tx.objectStore(STORE).getAllKeys()
    req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String))
    req.onerror = () => reject(req.error)
  })
  db.close()
  return ids
}

export async function getCachedAudioBlob(driveFileId: string): Promise<Blob | null> {
  return getBlob(driveFileId)
}

export async function getCachedAudioForMemo(memoId: string): Promise<Blob | null> {
  return getBlob(memoCacheKey(memoId))
}

/** Prefer memo cache, then Drive file id cache. */
export async function getCachedAudioForUpload(
  memoId: string,
  driveFileId: string,
): Promise<Blob | null> {
  const byMemo = await getCachedAudioForMemo(memoId)
  if (byMemo && byMemo.size >= 512) return byMemo
  const byDrive = await getCachedAudioBlob(driveFileId)
  if (byDrive && byDrive.size >= 512) return byDrive
  return null
}

export async function linkMemoCacheToDriveFile(
  memoId: string,
  driveFileId: string,
): Promise<void> {
  const blob = await getCachedAudioForMemo(memoId)
  if (blob) await cacheAudioBlob(driveFileId, blob)
}

export async function clearMemoAudioCache(
  driveFileId: string,
  memoId: string,
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    const store = tx.objectStore(STORE)
    store.delete(driveFileId)
    store.delete(memoCacheKey(memoId))
  })
  db.close()
}
