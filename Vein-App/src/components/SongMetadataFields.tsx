import type { Song } from '@/lib/types'

/** Version / key / BPM / mood — shown inside a collapsible “Track details” block. */
export function SongMetadataFields({
  song,
  onUpdate,
}: {
  song: Song
  onUpdate: (patch: Partial<Pick<Song, 'key' | 'bpm' | 'mood' | 'versionName'>>) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs text-vein-muted">
        Version name
        <input
          className="mt-1 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
          placeholder="demo 2"
          value={song.versionName}
          onChange={(e) => onUpdate({ versionName: e.target.value })}
        />
      </label>
      <label className="block text-xs text-vein-muted">
        Key
        <input
          className="mt-1 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
          placeholder="Am"
          value={song.key}
          onChange={(e) => onUpdate({ key: e.target.value })}
        />
      </label>
      <label className="block text-xs text-vein-muted">
        BPM
        <input
          className="mt-1 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
          placeholder="120"
          value={song.bpm}
          onChange={(e) => onUpdate({ bpm: e.target.value })}
        />
      </label>
      <label className="block text-xs text-vein-muted">
        Mood
        <input
          className="mt-1 w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm"
          placeholder="dreamy, dark…"
          value={song.mood}
          onChange={(e) => onUpdate({ mood: e.target.value })}
        />
      </label>
    </div>
  )
}
