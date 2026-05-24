import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAudioBlob } from '@/lib/drive'
import { cacheAudioBlob, getCachedAudioBlob, getCachedAudioForMemo } from '@/lib/audioCache'
import { formatTimestamp } from '@/lib/format'
import type { Fragment, Song, VeinData } from '@/lib/types'
import { Button } from '@/components/Button'
import { useMemoAudio } from '@/hooks/useMemoAudio'
import { WaveformPlayer } from '@/components/WaveformPlayer'

interface ReelClip {
  fragment: Fragment
  memoTitle: string
  driveFileId: string
  memoId: string
}

export function SongReelPanel({
  data,
  song,
  fragments,
}: {
  data: VeinData
  song: Song
  fragments: Fragment[]
}) {
  const clips: ReelClip[] = fragments
    .map((f) => {
      const memo = data.memos.find((m) => m.id === f.memoId)
      if (!memo?.driveFileId) return null
      return {
        fragment: f,
        memoTitle: memo.title,
        driveFileId: memo.driveFileId,
        memoId: memo.id,
      }
    })
    .filter((c): c is ReelClip => c !== null)

  const [playing, setPlaying] = useState(false)
  const [clipIndex, setClipIndex] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refAudio = useMemoAudio(song.referenceDriveFileId ?? undefined)

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current)
    stopTimerRef.current = null
    gapTimerRef.current = null
  }, [])

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const stopReel = useCallback(() => {
    clearTimers()
    audioRef.current?.pause()
    audioRef.current = null
    revokeUrl()
    setPlaying(false)
  }, [clearTimers, revokeUrl])

  const loadBlobForClip = useCallback(async (clip: ReelClip): Promise<Blob> => {
    let blob =
      (await getCachedAudioForMemo(clip.memoId)) ??
      (await getCachedAudioBlob(clip.driveFileId))
    if (!blob) {
      blob = await fetchAudioBlob(clip.driveFileId)
      await cacheAudioBlob(clip.driveFileId, blob)
    }
    return blob
  }, [])

  const playClipAt = useCallback(
    async (index: number) => {
      if (index >= clips.length) {
        stopReel()
        setStatus('Reel finished')
        return
      }

      const clip = clips[index]
      setClipIndex(index)
      setStatus(`${clip.fragment.label} @ ${formatTimestamp(clip.fragment.timestamp)}`)

      try {
        revokeUrl()
        const blob = await loadBlobForClip(clip)
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        const audio = new Audio(url)
        audioRef.current = audio

        await new Promise<void>((resolve, reject) => {
          audio.onerror = () => reject(new Error('Playback failed'))
          audio.oncanplaythrough = () => resolve()
          audio.load()
        })

        audio.currentTime = clip.fragment.timestamp
        await audio.play()

        stopTimerRef.current = setTimeout(() => {
          audio.pause()
          revokeUrl()
          gapTimerRef.current = setTimeout(() => {
            void playClipAt(index + 1)
          }, song.reelGapSeconds * 1000)
        }, song.reelClipSeconds * 1000)
      } catch (e) {
        stopReel()
        setStatus(e instanceof Error ? e.message : 'Could not play clip')
      }
    },
    [
      clips,
      loadBlobForClip,
      song.reelClipSeconds,
      song.reelGapSeconds,
      stopReel,
      revokeUrl,
    ],
  )

  useEffect(() => () => stopReel(), [stopReel])

  return (
    <section className="mt-8 rounded-xl border border-vein-border bg-vein-surface p-4">
      <h2 className="text-sm font-medium">Listening reel</h2>
      <p className="mt-1 text-xs text-vein-muted">
        Plays each linked fragment for {song.reelClipSeconds}s, then waits {song.reelGapSeconds}s.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={clips.length === 0 || playing}
          onClick={() => {
            setPlaying(true)
            setStatus(null)
            void playClipAt(0)
          }}
        >
          {playing ? `Playing ${clipIndex + 1}/${clips.length}…` : 'Play reel'}
        </Button>
        {playing && (
          <Button variant="ghost" onClick={stopReel}>
            Stop
          </Button>
        )}
      </div>
      {status && <p className="mt-2 text-xs text-vein-muted">{status}</p>}
      {clips.length === 0 && (
        <p className="mt-2 text-sm text-vein-muted">
          Link fragments whose memos are synced to Drive.
        </p>
      )}

      {song.referenceDriveFileId && (
        <div className="mt-6 border-t border-vein-border pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-vein-muted">
            Reference demo
          </h3>
          {refAudio.loading && (
            <p className="mt-2 text-sm text-vein-muted">Loading reference…</p>
          )}
          {refAudio.error && (
            <p className="mt-2 text-sm text-vein-error">{refAudio.error}</p>
          )}
          {refAudio.blobUrl && <WaveformPlayer blobUrl={refAudio.blobUrl} />}
        </div>
      )}
    </section>
  )
}
