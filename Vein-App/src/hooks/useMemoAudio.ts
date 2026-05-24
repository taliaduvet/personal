import { useEffect, useState } from 'react'
import { fetchAudioBlob } from '@/lib/drive'
import {
  cacheAudioBlob,
  cacheAudioForMemo,
  getCachedAudioBlob,
  getCachedAudioForMemo,
} from '@/lib/audioCache'

export function useMemoAudio(
  driveFileId: string | undefined,
  memoId?: string,
) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!driveFileId && !memoId) return

    let url: string | null = null
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        let blob =
          (memoId ? await getCachedAudioForMemo(memoId) : null) ??
          (driveFileId ? await getCachedAudioBlob(driveFileId) : null)
        if (!blob && driveFileId) {
          blob = await fetchAudioBlob(driveFileId)
        }
        if (!blob) {
          throw new Error('Audio not available. Attach a file below or sync from the device you recorded on.')
        }
        if (driveFileId) await cacheAudioBlob(driveFileId, blob)
        if (memoId) await cacheAudioForMemo(memoId, blob)
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Audio failed to load. Try again or re-import the memo.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      setBlobUrl(null)
    }
  }, [driveFileId, memoId])

  return { blobUrl, loading, error }
}
