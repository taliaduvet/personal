import { Link } from 'react-router-dom'
import { getSongBoardLines } from '@/lib/songBoard'
import { formatTimestamp } from '@/lib/format'
import type { Song, StandaloneLyric, VeinData } from '@/lib/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'

export function SongLyricBoard({
  data,
  song,
  onUpdate,
}: {
  data: VeinData
  song: Song
  onUpdate: (
    patch: Partial<Pick<Song, 'fragmentLyrics' | 'standaloneLyrics'>>,
  ) => void
}) {
  const rows = getSongBoardLines(data, song.id)

  function setFragmentLyric(fragmentId: string, text: string) {
    onUpdate({
      fragmentLyrics: { ...song.fragmentLyrics, [fragmentId]: text },
    })
  }

  function addStandaloneLine() {
    const entry: StandaloneLyric = { id: crypto.randomUUID(), text: '' }
    onUpdate({ standaloneLyrics: [...song.standaloneLyrics, entry] })
  }

  function updateStandalone(id: string, text: string) {
    onUpdate({
      standaloneLyrics: song.standaloneLyrics.map((l) =>
        l.id === id ? { ...l, text } : l,
      ),
    })
  }

  function removeStandalone(id: string) {
    onUpdate({
      standaloneLyrics: song.standaloneLyrics.filter((l) => l.id !== id),
    })
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium">Lyric & idea board</h2>
      <p className="mt-1 text-xs text-vein-muted">
        Type your own lyrics anytime—transcript lines appear when available.
      </p>

      {rows.length > 0 && (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => {
            const manual = song.fragmentLyrics[row.fragmentId] ?? ''
            const hasTranscript = row.lines.length > 0
            return (
              <li
                key={row.fragmentId}
                className="rounded-xl border border-vein-border bg-vein-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.fragmentLabel}</span>
                  <span className="font-mono text-xs text-vein-accent">
                    {formatTimestamp(row.timestamp)}
                  </span>
                  {row.isLyricHighlight && (
                    <Badge variant="accent">Lyric</Badge>
                  )}
                </div>
                <Link
                  to={`/memo/${row.memoId}?t=${row.timestamp}`}
                  className="mt-1 block text-xs text-vein-muted hover:text-vein-accent"
                >
                  {row.memoTitle} →
                </Link>

                {hasTranscript && (
                  <ul className="mt-2 space-y-1 text-sm leading-relaxed text-vein-muted">
                    {row.lines.map((line, i) => (
                      <li
                        key={i}
                        className={line.startsWith('★ ') ? 'text-vein-accent-mint' : ''}
                      >
                        {line.replace(/^★ /, '')}
                      </li>
                    ))}
                  </ul>
                )}

                <label className="mt-3 block text-xs text-vein-muted">
                  Your lyrics
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-lg border border-vein-border bg-vein-bg px-3 py-2 text-sm leading-relaxed"
                    placeholder="Write lyrics for this moment—even without a transcript…"
                    value={manual}
                    onChange={(e) => setFragmentLyric(row.fragmentId, e.target.value)}
                  />
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-vein-muted">
            Standalone lyrics
          </h3>
          <Button variant="secondary" className="!min-h-9 !text-xs" onClick={addStandaloneLine}>
            + Add lyric block
          </Button>
        </div>
        {song.standaloneLyrics.length === 0 && rows.length === 0 && (
          <p className="mt-2 text-sm text-vein-muted">
            Link fragments or add a lyric block to start writing.
          </p>
        )}
        <ul className="mt-2 space-y-2">
          {song.standaloneLyrics.map((line) => (
            <li
              key={line.id}
              className="rounded-xl border border-vein-border/80 bg-vein-bg/50 px-3 py-2"
            >
              <textarea
                className="min-h-[72px] w-full resize-y rounded-lg border border-vein-border bg-vein-surface px-3 py-2 text-sm leading-relaxed"
                placeholder="Verse, chorus, voice note…"
                value={line.text}
                onChange={(e) => updateStandalone(line.id, e.target.value)}
              />
              <Button
                variant="ghost"
                className="mt-1 !text-xs"
                onClick={() => removeStandalone(line.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </div>

    </section>
  )
}
