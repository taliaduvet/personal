import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isRecordingSupported,
  pickRecorderMimeType,
  recordingFileName,
} from '@/lib/recorder'

export type RecorderPhase = 'idle' | 'recording' | 'ready'

export function useAudioRecorder() {
  const [phase, setPhase] = useState<RecorderPhase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileRef = useRef<File | null>(null)

  const supported = isRecordingSupported()

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    stopTracks()
    recorderRef.current = null
    chunksRef.current = []
    fileRef.current = null
    setSeconds(0)
    setPhase('idle')
    setError(null)
    setMimeType('')
  }, [clearTimer, stopTracks])

  useEffect(() => () => reset(), [reset])

  const start = useCallback(async () => {
    if (!supported) {
      setError('Recording is not supported in this browser.')
      return
    }
    setError(null)
    fileRef.current = null
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickRecorderMimeType()
      setMimeType(mime)
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onerror = () => {
        setError('Recording failed. Try again.')
        reset()
      }

      recorder.onstop = () => {
        clearTimer()
        stopTracks()
        const type = mime || recorder.mimeType || 'audio/mp4'
        const blob = new Blob(chunksRef.current, { type })
        const file = new File([blob], recordingFileName(type), { type })
        fileRef.current = file
        if (file.size < 512) {
          setError(
            'Nothing was captured. Record for at least a few seconds, then tap Stop and Save to library.',
          )
          setPhase('idle')
          fileRef.current = null
          return
        }
        setPhase('ready')
      }

      // No timeslice — iOS Safari often drops chunks when using start(1000)
      recorder.start()
      setSeconds(0)
      setPhase('recording')
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      stopTracks()
      const msg =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access denied. Allow the mic in Settings, then try again.'
          : e instanceof Error
            ? e.message
            : 'Could not start recording.'
      setError(msg)
      setPhase('idle')
    }
  }, [supported, clearTimer, stopTracks, reset])

  const stop = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return
    if (rec.state === 'recording') {
      try {
        rec.requestData()
      } catch {
        // optional on some browsers
      }
    }
    rec.stop()
  }, [])

  const cancel = useCallback(() => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null
      rec.stop()
    }
    reset()
  }, [reset])

  const getFile = useCallback(() => fileRef.current, [])

  return {
    supported,
    phase,
    seconds,
    error,
    mimeType,
    start,
    stop,
    cancel,
    reset,
    getFile,
  }
}
