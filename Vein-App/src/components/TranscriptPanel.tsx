import type { TranscriptData } from '@/lib/types'

export function TranscriptPanel({ transcript }: { transcript: TranscriptData }) {
  const lines = transcript.text.split('\n').filter((l, _i, arr) => l.length > 0 || arr.length === 1)

  return (
    <section className="mt-6">
      <h2 className="text-sm font-medium text-vein-text">Transcript</h2>
      <div className="mt-3 space-y-2 rounded-xl border border-vein-border bg-vein-bg/50 p-4 text-sm leading-relaxed">
        {lines.map((line, index) => {
          const highlighted = transcript.lyricLineIndices.includes(index)
          const segment = transcript.segments[index]
          return (
            <p
              key={index}
              className={
                highlighted
                  ? 'border-l-2 border-vein-accent bg-vein-accent/10 pl-3 text-vein-text'
                  : 'text-vein-muted'
              }
            >
              {segment && (
                <span className="mr-2 font-mono text-xs text-vein-accent-dim">
                  [{formatSegTime(segment.start)}]
                </span>
              )}
              {line || ' '}
            </p>
          )
        })}
      </div>
    </section>
  )
}

function formatSegTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
