import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ZodError } from 'zod'
import {
  bootstrapDriveVault,
  loadVeinData,
  repairDriveVault,
  saveVeinData,
} from '@/lib/drive'
import {
  addFragment,
  addMemo,
  addSong,
  addSongFromMemo,
  createTag,
  deleteMemoFromCatalog,
  deleteSongFromCatalog,
  deleteTag,
  duplicateSong,
  linkFragmentToSong,
  linkMemoToSong,
  reorderSongFragments,
  unlinkMemoFromSong,
  toggleMemoTag,
  toggleSongTag,
  unlinkFragmentFromSong,
  updateFragment,
  updateMemo,
  updateSong,
} from '@/lib/mutations'
import { catalogWasRepaired, repairVeinCatalog } from '@/lib/catalogRepair'
import { syncRecordingsToDrive, type SyncRecordingsReport } from '@/lib/syncRecordings'
import { applyLyricCandidatesToFragments, requestTranscription } from '@/lib/transcribe'
import type {
  Fragment,
  FragmentStatus,
  FragmentType,
  MemoStatus,
  SaveStatus,
  Song,
  SongFromMemoLinkMode,
  SongStatus,
  StandaloneLyric,
  Tag,
  TranscriptionStatus,
  Memo,
  TranscriptData,
  VeinData,
} from '@/lib/types'
import { cacheAudioBlob, cacheAudioForMemo, clearMemoAudioCache } from '@/lib/audioCache'
import { looksLikeDriveFileId, trashDriveFile, uploadAudioFile } from '@/lib/drive'

const DEBOUNCE_MS = 2000

interface VeinContextValue {
  data: VeinData | null
  vaultReady: boolean
  vaultLoading: boolean
  vaultError: string | null
  parseError: boolean
  saveStatus: SaveStatus
  saveError: string | null
  initVault: () => Promise<void>
  repairVault: () => Promise<void>
  retrySave: () => void
  /** Write vein-data.json immediately (use after uploads). */
  saveNow: () => Promise<void>
  /** Re-upload memos missing from Vein/Audio using this browser’s cache. */
  syncRecordingsToDrive: () => Promise<SyncRecordingsReport>
  setData: (updater: (prev: VeinData) => VeinData) => void
  addMemo: (input: { title: string; driveFileId: string; date?: string }) => Memo | null
  uploadMemoAudio: (memoId: string, file: File) => Promise<void>
  deleteMemo: (memoId: string) => Promise<void>
  updateMemo: (
    memoId: string,
    patch: Partial<{
      title: string
      status: MemoStatus
      transcript: TranscriptData | null
      transcriptionStatus: TranscriptionStatus
      tagIds: string[]
      driveFileId: string
    }>,
  ) => void
  transcribeMemo: (memoId: string) => Promise<void>
  createTag: (name: string) => Tag | null
  deleteTag: (tagId: string) => void
  toggleMemoTag: (memoId: string, tagId: string) => void
  toggleSongTag: (songId: string, tagId: string) => void
  addFragment: (input: {
    memoId: string
    timestamp: number
    label: string
    type: FragmentType
  }) => Fragment | null
  updateFragment: (
    fragmentId: string,
    patch: Partial<{
      label: string
      type: FragmentType
      status: FragmentStatus
      isLyricCandidate: boolean
    }>,
  ) => void
  linkFragmentToSong: (fragmentId: string, songId: string) => void
  unlinkFragmentFromSong: (fragmentId: string, songId: string) => void
  linkMemoToSong: (memoId: string, songId: string) => void
  unlinkMemoFromSong: (memoId: string, songId: string) => void
  addSong: (input?: Partial<{ title: string; notes: string; status: SongStatus }>) => Song | null
  addSongFromMemo: (
    memoId: string,
    mode: SongFromMemoLinkMode,
    title?: string,
  ) => Song | null
  duplicateSong: (songId: string, copyFragmentLinks?: boolean) => Song | null
  deleteSong: (songId: string) => Promise<void>
  reorderSongFragments: (songId: string, orderedFragmentIds: string[]) => void
  uploadSongReference: (songId: string, file: File) => Promise<void>
  clearSongReference: (songId: string) => Promise<void>
  updateSong: (
    songId: string,
    patch: Partial<{
      title: string
      notes: string
      status: SongStatus
      tagIds: string[]
      key: string
      bpm: string
      mood: string
      versionName: string
      referenceDriveFileId: string | null
      reelClipSeconds: number
      reelGapSeconds: number
      fragmentLyrics: Record<string, string>
      standaloneLyrics: StandaloneLyric[]
      memoIds: string[]
    }>,
  ) => void
}

const VeinContext = createContext<VeinContextValue | null>(null)

export function VeinProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<VeinData | null>(null)
  const [vaultReady, setVaultReady] = useState(false)
  const [vaultLoading, setVaultLoading] = useState(true)
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [parseError, setParseError] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const dataRef = useRef<VeinData | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)

  dataRef.current = data

  const flushSave = useCallback(async (): Promise<void> => {
    const snapshot = dataRef.current
    if (!snapshot || !vaultReady) return

    if (savingRef.current) {
      pendingRef.current = true
      return
    }

    savingRef.current = true
    setSaveStatus('saving')
    setSaveError(null)

    try {
      await saveVeinData(snapshot)
      setSaveStatus('saved')
    } catch (e) {
      setSaveStatus('error')
      const msg = e instanceof Error ? e.message : 'Could not save to Drive'
      setSaveError(msg)
      throw e instanceof Error ? e : new Error(msg)
    } finally {
      savingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        await flushSave()
      }
    }
  }, [vaultReady])

  const saveNow = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    await flushSave()
  }, [flushSave])

  const runSyncRecordings = useCallback(async (): Promise<SyncRecordingsReport> => {
    const snapshot = dataRef.current
    if (!snapshot || !vaultReady) throw new Error('Vault not ready')

    const report = await syncRecordingsToDrive(snapshot)
    setDataState(report.data)
    dataRef.current = report.data
    await saveNow()
    return report
  }, [vaultReady, saveNow])

  const deleteSong = useCallback(
    async (songId: string) => {
      const snapshot = dataRef.current
      const song = snapshot?.songs.find((s) => s.id === songId)
      if (song?.referenceDriveFileId && looksLikeDriveFileId(song.referenceDriveFileId)) {
        try {
          await trashDriveFile(song.referenceDriveFileId)
        } catch {
          // continue catalog removal
        }
      }

      setDataState((prev) => {
        if (!prev) return prev
        const next = deleteSongFromCatalog(prev, songId)
        dataRef.current = next
        return next
      })
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      await saveNow()
    },
    [saveNow],
  )

  const deleteMemo = useCallback(
    async (memoId: string) => {
      const snapshot = dataRef.current
      const memo = snapshot?.memos.find((m) => m.id === memoId)
      if (!memo) return

      if (looksLikeDriveFileId(memo.driveFileId)) {
        try {
          await trashDriveFile(memo.driveFileId)
        } catch {
          // continue — still remove from catalog so app state matches intent
        }
      }

      try {
        await clearMemoAudioCache(memo.driveFileId, memoId)
      } catch {
        // non-fatal
      }

      setDataState((prev) => {
        if (!prev) return prev
        const next = deleteMemoFromCatalog(prev, memoId)
        dataRef.current = next
        return next
      })
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      await saveNow()
    },
    [saveNow],
  )

  const uploadMemoAudio = useCallback(
    async (memoId: string, file: File) => {
      const id = await uploadAudioFile(file)
      await cacheAudioBlob(id, file)
      await cacheAudioForMemo(memoId, file)
      setDataState((prev) => {
        if (!prev) return prev
        const next = updateMemo(prev, memoId, { driveFileId: id })
        dataRef.current = next
        return next
      })
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      await saveNow()
    },
    [saveNow],
  )

  const scheduleSave = useCallback(() => {
    if (savingRef.current) {
      pendingRef.current = true
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void flushSave()
    }, DEBOUNCE_MS)
  }, [flushSave])

  /** Apply catalog changes immediately (needed before navigate). */
  const commitData = useCallback(
    (next: VeinData) => {
      const repaired = repairVeinCatalog(next)
      setDataState(repaired)
      dataRef.current = repaired
      scheduleSave()
    },
    [scheduleSave],
  )

  const addSongAction = useCallback(
    (input?: Partial<{ title: string; notes: string; status: SongStatus }>) => {
      const prev = dataRef.current
      if (!prev) return null
      const result = addSong(prev, input)
      commitData(result.data)
      return result.song
    },
    [commitData],
  )

  const addSongFromMemoAction = useCallback(
    (memoId: string, mode: SongFromMemoLinkMode, title?: string) => {
      const prev = dataRef.current
      if (!prev) return null
      const result = addSongFromMemo(prev, memoId, mode, title)
      if (!result) return null
      commitData(result.data)
      return result.song
    },
    [commitData],
  )

  const duplicateSongAction = useCallback(
    (songId: string, copyFragmentLinks = false) => {
      const prev = dataRef.current
      if (!prev) return null
      const result = duplicateSong(prev, songId, { copyFragmentLinks })
      if (!result) return null
      commitData(result.data)
      return result.song
    },
    [commitData],
  )

  const uploadSongReference = useCallback(
    async (songId: string, file: File) => {
      const snapshot = dataRef.current
      const song = snapshot?.songs.find((s) => s.id === songId)
      if (!song) return

      if (song.referenceDriveFileId && looksLikeDriveFileId(song.referenceDriveFileId)) {
        try {
          await trashDriveFile(song.referenceDriveFileId)
        } catch {
          /* replace anyway */
        }
      }

      const id = await uploadAudioFile(file)
      await cacheAudioBlob(id, file)
      setDataState((prev) => {
        if (!prev) return prev
        const next = updateSong(prev, songId, { referenceDriveFileId: id })
        dataRef.current = next
        return next
      })
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      await saveNow()
    },
    [saveNow],
  )

  const clearSongReference = useCallback(
    async (songId: string) => {
      const snapshot = dataRef.current
      const song = snapshot?.songs.find((s) => s.id === songId)
      if (!song?.referenceDriveFileId) return

      if (looksLikeDriveFileId(song.referenceDriveFileId)) {
        try {
          await trashDriveFile(song.referenceDriveFileId)
        } catch {
          /* continue */
        }
      }

      setDataState((prev) => {
        if (!prev) return prev
        const next = updateSong(prev, songId, { referenceDriveFileId: null })
        dataRef.current = next
        return next
      })
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      await saveNow()
    },
    [saveNow],
  )

  const addMemoAction = useCallback(
    (input: { title: string; driveFileId: string; date?: string }) => {
      const prev = dataRef.current
      if (!prev) return null
      const next = addMemo(prev, input)
      commitData(next)
      return next.memos[0] ?? null
    },
    [commitData],
  )

  const addFragmentAction = useCallback(
    (input: {
      memoId: string
      timestamp: number
      label: string
      type: FragmentType
    }) => {
      const prev = dataRef.current
      if (!prev) return null
      const result = addFragment(prev, input)
      commitData(result.data)
      return result.fragment
    },
    [commitData],
  )

  const createTagAction = useCallback(
    (name: string) => {
      const prev = dataRef.current
      if (!prev) return null
      const result = createTag(prev, name)
      commitData(result.data)
      return result.tag
    },
    [commitData],
  )

  const setData = useCallback(
    (updater: (prev: VeinData) => VeinData) => {
      setDataState((prev) => {
        if (!prev) return prev
        const next = repairVeinCatalog(updater(prev))
        dataRef.current = next
        return next
      })
      scheduleSave()
    },
    [scheduleSave],
  )

  const initVault = useCallback(async () => {
    setVaultLoading(true)
    setVaultError(null)
    setParseError(false)
    try {
      await bootstrapDriveVault()
      const loaded = await loadVeinData()
      setDataState(loaded)
      dataRef.current = loaded
      setVaultReady(true)
      setSaveStatus('saved')
    } catch (e) {
      if (e instanceof SyntaxError || e instanceof ZodError) {
        setParseError(true)
        setVaultError('Your vein-data.json file could not be read.')
      } else {
        setVaultError(e instanceof Error ? e.message : 'Could not load vault')
      }
      setVaultReady(false)
    } finally {
      setVaultLoading(false)
    }
  }, [])

  const repairVault = useCallback(async () => {
    setVaultLoading(true)
    setVaultError(null)
    setParseError(false)
    try {
      await repairDriveVault()
      const loaded = await loadVeinData()
      setDataState(loaded)
      dataRef.current = loaded
      setVaultReady(true)
      setSaveStatus('saved')
    } catch (e) {
      setVaultReady(false)
      if (e instanceof SyntaxError || e instanceof ZodError) {
        setParseError(true)
        setVaultError('Your vein-data.json file could not be read.')
      } else {
        setParseError(false)
        setVaultError(e instanceof Error ? e.message : 'Repair failed')
      }
    } finally {
      setVaultLoading(false)
    }
  }, [])

  const retrySave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    void flushSave()
  }, [flushSave])

  const transcribeMemo = useCallback(
    async (memoId: string) => {
      const memo = dataRef.current?.memos.find((m) => m.id === memoId)
      if (!memo) return

      setData((d) => updateMemo(d, memoId, { transcriptionStatus: 'transcribing' }))

      try {
        const result = await requestTranscription(memo.driveFileId)
        const transcript: TranscriptData = {
          text: result.text,
          segments: result.segments,
          lyricLineIndices: result.lyricLineIndices,
        }
        setData((d) => {
          const next = updateMemo(d, memoId, {
            transcript,
            transcriptionStatus: 'idle',
          })
          return applyLyricCandidatesToFragments(next, memoId, transcript)
        })
      } catch (e) {
        setData((d) => updateMemo(d, memoId, { transcriptionStatus: 'failed' }))
        throw e
      }
    },
    [setData],
  )

  useEffect(() => {
    void initVault()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [initVault])

  /** Heal stale song↔fragment links in memory (e.g. ghost fragmentIds on a song). */
  useEffect(() => {
    const snapshot = dataRef.current
    if (!vaultReady || !snapshot) return
    const repaired = repairVeinCatalog(snapshot)
    if (!catalogWasRepaired(snapshot, repaired)) return
    setDataState(repaired)
    dataRef.current = repaired
    void flushSave()
  }, [vaultReady, data, flushSave])

  const value = useMemo<VeinContextValue>(
    () => ({
      data,
      vaultReady,
      vaultLoading,
      vaultError,
      parseError,
      saveStatus,
      saveError,
      initVault,
      repairVault,
      retrySave,
      saveNow,
      syncRecordingsToDrive: runSyncRecordings,
      setData,
      addMemo: addMemoAction,
      uploadMemoAudio,
      deleteMemo,
      deleteSong,
      updateMemo: (memoId, patch) =>
        setData((d) => updateMemo(d, memoId, patch)),
      addFragment: addFragmentAction,
      updateFragment: (fragmentId, patch) =>
        setData((d) => updateFragment(d, fragmentId, patch)),
      linkFragmentToSong: (fragmentId, songId) =>
        setData((d) => linkFragmentToSong(d, fragmentId, songId)),
      unlinkFragmentFromSong: (fragmentId, songId) =>
        setData((d) => unlinkFragmentFromSong(d, fragmentId, songId)),
      linkMemoToSong: (memoId, songId) =>
        setData((d) => linkMemoToSong(d, memoId, songId)),
      unlinkMemoFromSong: (memoId, songId) =>
        setData((d) => unlinkMemoFromSong(d, memoId, songId)),
      addSong: addSongAction,
      addSongFromMemo: addSongFromMemoAction,
      duplicateSong: duplicateSongAction,
      reorderSongFragments: (songId, orderedFragmentIds) =>
        setData((d) => reorderSongFragments(d, songId, orderedFragmentIds)),
      uploadSongReference,
      clearSongReference,
      updateSong: (songId, patch) =>
        setData((d) => updateSong(d, songId, patch)),
      createTag: createTagAction,
      deleteTag: (tagId) => setData((d) => deleteTag(d, tagId)),
      toggleMemoTag: (memoId, tagId) =>
        setData((d) => toggleMemoTag(d, memoId, tagId)),
      toggleSongTag: (songId, tagId) =>
        setData((d) => toggleSongTag(d, songId, tagId)),
      transcribeMemo,
    }),
    [
      data,
      vaultReady,
      vaultLoading,
      vaultError,
      parseError,
      saveStatus,
      saveError,
      initVault,
      repairVault,
      retrySave,
      saveNow,
      runSyncRecordings,
      setData,
      transcribeMemo,
      addSongFromMemoAction,
      duplicateSongAction,
      uploadSongReference,
      clearSongReference,
    ],
  )

  return <VeinContext.Provider value={value}>{children}</VeinContext.Provider>
}

export function useVein(): VeinContextValue {
  const ctx = useContext(VeinContext)
  if (!ctx) throw new Error('useVein must be used within VeinProvider')
  return ctx
}
