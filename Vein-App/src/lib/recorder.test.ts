import { describe, expect, it } from 'vitest'
import { extensionForMime, formatRecordingDuration, recordingFileName } from './recorder'

describe('recorder helpers', () => {
  it('maps mime to extension', () => {
    expect(extensionForMime('audio/mp4')).toBe('m4a')
    expect(extensionForMime('audio/webm')).toBe('webm')
  })

  it('formats duration', () => {
    expect(formatRecordingDuration(65)).toBe('1:05')
    expect(formatRecordingDuration(0)).toBe('0:00')
  })

  it('builds stable filename pattern', () => {
    expect(recordingFileName('audio/mp4')).toMatch(/^vein-recording-.+\.m4a$/)
  })
})
