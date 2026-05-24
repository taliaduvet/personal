import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Button } from '@/components/Button'

export interface WaveformPlayerHandle {
  seekTo: (seconds: number) => void
  getTime: () => number
}

interface WaveformPlayerProps {
  blobUrl: string | null
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const WaveformPlayer = forwardRef<WaveformPlayerHandle, WaveformPlayerProps>(
  function WaveformPlayer({ blobUrl }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WaveSurfer | null>(null)
    const [playing, setPlaying] = useState(false)
    const [current, setCurrent] = useState(0)
    const [duration, setDuration] = useState(0)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        const ws = wsRef.current
        if (!ws || !ready) return
        ws.setTime(seconds)
        setCurrent(seconds)
      },
      getTime() {
        return wsRef.current?.getCurrentTime() ?? 0
      },
    }))

    useEffect(() => {
      if (!blobUrl || !containerRef.current) return

      setReady(false)
      setError(null)
      setPlaying(false)
      setCurrent(0)
      setDuration(0)

      const ws = WaveSurfer.create({
        container: containerRef.current,
        url: blobUrl,
        height: 72,
        waveColor: '#2a3660',
        progressColor: '#9b6cff',
        cursorColor: '#b0cdfd',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        interact: true,
        dragToSeek: true,
      })

      wsRef.current = ws

      ws.on('ready', () => {
        setReady(true)
        setDuration(ws.getDuration())
      })
      ws.on('timeupdate', (t) => setCurrent(t))
      ws.on('play', () => setPlaying(true))
      ws.on('pause', () => setPlaying(false))
      ws.on('finish', () => setPlaying(false))
      ws.on('error', () => setError('Could not load waveform for this file.'))

      return () => {
        ws.destroy()
        wsRef.current = null
      }
    }, [blobUrl])

    function handlePlayPause() {
      const ws = wsRef.current
      if (!ws || !ready) return
      setError(null)
      try {
        void ws.playPause()
      } catch {
        setError('Tap Play to start (required on iPhone).')
      }
    }

    return (
      <div>
        <div
          ref={containerRef}
          className="min-h-[72px] w-full cursor-pointer rounded-lg bg-vein-bg/80 md:touch-auto touch-pan-y"
          role="slider"
          aria-label="Audio waveform — drag or tap to seek"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button onClick={handlePlayPause} disabled={!ready}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <span className="font-mono text-xs text-vein-muted tabular-nums">
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>
        {error && (
          <p className="mt-2 text-sm text-vein-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)
