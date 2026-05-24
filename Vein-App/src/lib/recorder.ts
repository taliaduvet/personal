/** MIME types to try, in preference order (Safari → M4A, Chrome → WebM). */
const RECORDER_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  '',
] as const

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const mime of RECORDER_MIME_CANDIDATES) {
    if (!mime || MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export function extensionForMime(mime: string): string {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('webm')) return 'webm'
  return 'dat'
}

export function recordingFileName(mime: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `vein-recording-${stamp}.${extensionForMime(mime)}`
}

export function formatRecordingDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}
